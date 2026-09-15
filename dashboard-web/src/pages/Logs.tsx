import React, { useEffect, useState, useRef } from 'react';
import {
  Terminal,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Download,
  ArrowDown,
  Lock,
  Send,
} from 'lucide-react';
import { useWebSocketData, LogItem } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatTime } from '../services/format';

export const Logs: React.FC = () => {
  const { liveLogs, isLogsPaused, setIsLogsPaused, clearLogs } = useWebSocketData();
  const { user, isSudo } = useAuth();
  const { addToast } = useToast();
  const [initialLogs, setInitialLogs] = useState<LogItem[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Console Command Execution state for sudo user
  const [commandText, setCommandText] = useState('');
  const [executing, setExecuting] = useState(false);

  // Load latest backlog on mount
  useEffect(() => {
    api.getLogs({ limit: 300 })
      .then((data) => setInitialLogs(data || []))
      .catch((e) => console.error('Failed to load initial logs', e));
  }, []);

  // Merge initial backlog and live logs
  const combinedLogs: LogItem[] = React.useMemo(() => {
    const seen = new Set<number>();
    const result: LogItem[] = [];
    for (const log of [...initialLogs, ...liveLogs]) {
      if (log && !seen.has(log.id)) {
        seen.add(log.id);
        result.push(log);
      }
    }
    return result.slice(-500);
  }, [initialLogs, liveLogs]);

  const filteredLogs = React.useMemo(() => {
    return combinedLogs.filter((log) => {
      const matchesLevel = levelFilter === 'ALL' || log.level.toUpperCase() === levelFilter;
      const matchesSearch =
        !search ||
        log.message.toLowerCase().includes(search.toLowerCase()) ||
        log.loggerName.toLowerCase().includes(search.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [combinedLogs, levelFilter, search]);

  // Auto-scroll to bottom on new log
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleDownload = () => {
    window.open(api.downloadLogsUrl(), '_blank');
    addToast('info', 'Downloading server-console.log');
  };

  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandText.trim();
    if (!cmd) return;

    if (!isSudo) {
      addToast('error', "Only the 'sudo' user can execute console commands.");
      return;
    }

    setExecuting(true);
    try {
      await api.executeConsoleCommand(cmd);
      addToast('success', `Executed: /${cmd.startsWith('/') ? cmd.slice(1) : cmd}`);
      setCommandText('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to execute console command');
    } finally {
      setExecuting(false);
    }
  };

  const getLogColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return 'text-[#ff5555]';
      case 'WARN':
        return 'text-[#ffff55]';
      case 'DEBUG':
      case 'TRACE':
        return 'text-[#aaaaaa]';
      case 'INFO':
      default:
        return 'text-[#ffffff]';
    }
  };

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2e2f30] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading tracking-wide text-white flex items-center gap-2">
              <Terminal className="w-6 h-6 text-[#55ff55]" />
              SERVER CONSOLE & LOGS
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-heading bg-[#1e1e1f] text-[#ffaa00] border border-[#141415]">
              {filteredLogs.length} / 500 BUFFER
            </span>
          </div>
          <p className="text-xs font-mono text-[#aaaaaa] mt-1">
            Real-time server log streaming, severity filtering, and direct console command execution for sudo.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsLogsPaused(!isLogsPaused)}
            className={`mc-btn px-3 py-1.5 text-xs ${
              isLogsPaused ? 'bg-[#ffaa00] text-black' : ''
            }`}
          >
            {isLogsPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isLogsPaused ? 'RESUME STREAM' : 'PAUSE STREAM'}
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`mc-btn px-3 py-1.5 text-xs ${
              autoScroll ? 'bg-[#3c8527] text-white' : ''
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            AUTO-SCROLL
          </button>

          <button
            onClick={clearLogs}
            className="mc-btn px-3 py-1.5 text-xs"
            title="Clear buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </button>

          <button
            onClick={handleDownload}
            className="button button-primary px-3 py-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            DOWNLOAD LOG
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#888888] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search console logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-8 py-1 text-xs h-8"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto flex-wrap">
          <span className="text-[11px] font-heading text-[#aaaaaa] uppercase mr-1">LEVEL:</span>
          {(['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-2.5 py-1 text-xs font-heading border ${
                levelFilter === lvl
                  ? lvl === 'ERROR'
                    ? 'bg-[#a82323] text-white border-white'
                    : lvl === 'WARN'
                    ? 'bg-[#ffaa00] text-black border-white'
                    : lvl === 'DEBUG'
                    ? 'bg-[#5a5b5c] text-white border-white'
                    : 'bg-[#3c8527] text-white border-white'
                  : 'bg-[#252526] text-[#aaaaaa] border-[#1e1e1f] hover:bg-[#38393a] hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Display */}
      <div
        ref={logContainerRef}
        className="h-[550px] w-full bg-[#101011] border-4 border-[#141415] shadow-[inset_3px_3px_0_#050505] p-3 font-mono text-xs overflow-y-auto space-y-1 select-text"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#777777] italic font-mono select-none">
            No logs captured yet
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="leading-relaxed hover:bg-[#1a1a1b] px-1 py-0.5 group flex flex-wrap items-baseline">
              <span className="text-[#666666] select-none mr-2 font-mono">
                {formatTime(log.timestamp) || '00:00:00'}
              </span>

              <span
                className={`inline-block w-14 font-heading select-none text-[11px] ${
                  log.level === 'ERROR'
                    ? 'text-[#ff5555]'
                    : log.level === 'WARN'
                    ? 'text-[#ffff55]'
                    : log.level === 'DEBUG'
                    ? 'text-[#aaaaaa]'
                    : 'text-[#55ff55]'
                }`}
              >
                [{log.level}]
              </span>

              <span className="text-[#888888] mr-2 select-none">
                [{log.loggerName || 'Server'}]
              </span>

              <span className={`${getLogColor(log.level)} break-all`}>{log.message}</span>

              {log.throwable && (
                <div className="w-full text-[#ff5555] text-[11px] mt-1 pl-16 whitespace-pre-wrap">
                  {log.throwable}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Console Command Execution Bar (Feature: sudo user can execute commands) */}
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] p-3">
        {isSudo ? (
          <form onSubmit={handleExecuteCommand} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1b] border-2 border-[#141415] text-[#fdaa00] font-heading text-xs flex-shrink-0">
              <Terminal className="w-4 h-4" />
              <span>sudo@console:$</span>
            </div>
            <input
              type="text"
              placeholder="Execute server command as sudo (e.g. /say Hello, /time set day, /gamemode creative)..."
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              disabled={executing}
              className="form-input flex-1 text-xs"
            />
            <button
              type="submit"
              disabled={executing || !commandText.trim()}
              className="button button-primary px-4 py-2 text-xs flex-shrink-0 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {executing ? 'RUNNING...' : 'EXECUTE'}
            </button>
          </form>
        ) : (
          <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-[#aaaaaa]">
            <div className="flex items-center gap-2 text-[#ffaa00]">
              <Lock className="w-4 h-4 text-[#ff5555] flex-shrink-0" />
              <span>
                <strong className="font-heading text-white">CONSOLE PRIVILEGE:</strong> Command execution is restricted to user: <strong className="text-[#fdaa00]">sudo</strong>. Currently logged in as <strong className="text-[#55ff55]">{user || 'Admin'}</strong>.
              </span>
            </div>
            <span className="text-[10px] text-[#777] font-mono">
              Sign in as 'sudo' to run console commands.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
