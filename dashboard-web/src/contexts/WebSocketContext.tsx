import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface PerformanceStats {
  timestamp: string;
  tps: number;
  mspt: number;
  cpuProcess: number;
  cpuSystem: number;
  heapUsed: number;
  heapMax: number;
  heapCommitted: number;
  nonHeapUsed: number;
  threadCount: number;
  peakThreadCount: number;
  gcCount: number;
  gcTimeMillis: number;
  onlinePlayers: number;
  maxPlayers: number;
  uptimeSeconds: number;
}

export interface LogItem {
  id: number;
  timestamp: string;
  level: string;
  loggerName: string;
  threadName: string;
  message: string;
  throwable?: string;
}

export interface ActivityItem {
  id: number;
  timestamp: string;
  category: string;
  title: string;
  description: string;
}

interface WebSocketContextValue {
  liveStats: PerformanceStats | null;
  liveLogs: LogItem[];
  liveActivity: ActivityItem[];
  isLogsPaused: boolean;
  setIsLogsPaused: (paused: boolean) => void;
  clearLogs: () => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [liveStats, setLiveStats] = useState<PerformanceStats | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogItem[]>([]);
  const [liveActivity, setLiveActivity] = useState<ActivityItem[]>([]);
  const [isLogsPaused, setIsLogsPaused] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const logsPausedRef = useRef(isLogsPaused);
  logsPausedRef.current = isLogsPaused;

  const socketsRef = useRef<{ [key: string]: WebSocket | null }>({
    stats: null,
    logs: null,
    activity: null,
    players: null,
    luckperms: null,
  });

  const clearLogs = useCallback(() => {
    setLiveLogs([]);
  }, []);

  const connectSocket = useCallback((topic: string, onMessage: (data: any) => void) => {
    if (!isAuthenticated) return null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/${topic}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        if (event.data === 'pong') return;
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch (e) {
        // non-json or ping
      }
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds if authenticated
      setTimeout(() => {
        if (isAuthenticated) {
          socketsRef.current[topic] = connectSocket(topic, onMessage);
        }
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    return ws;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      Object.values(socketsRef.current).forEach((ws) => ws?.close());
      socketsRef.current = { stats: null, logs: null, activity: null, players: null, luckperms: null };
      setIsConnected(false);
      return;
    }

    socketsRef.current.stats = connectSocket('stats', (data) => {
      setLiveStats(data);
    });

    socketsRef.current.logs = connectSocket('logs', (data: LogItem) => {
      if (!logsPausedRef.current) {
        setLiveLogs((prev) => {
          const next = [...prev, data];
          return next.length > 500 ? next.slice(next.length - 500) : next;
        });
      }
    });

    socketsRef.current.activity = connectSocket('activity', (data: ActivityItem) => {
      setLiveActivity((prev) => [data, ...prev.slice(0, 100)]);
    });

    // Heartbeat ping interval
    const heartbeat = setInterval(() => {
      Object.values(socketsRef.current).forEach((ws) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      });
    }, 15000);

    return () => {
      clearInterval(heartbeat);
      Object.values(socketsRef.current).forEach((ws) => ws?.close());
    };
  }, [isAuthenticated, connectSocket]);

  return (
    <WebSocketContext.Provider
      value={{
        liveStats,
        liveLogs,
        liveActivity,
        isLogsPaused,
        setIsLogsPaused,
        clearLogs,
        isConnected,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketData = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketData must be used within WebSocketProvider');
  }
  return context;
};
