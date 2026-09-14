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
  RefreshCw,
} from 'lucide-react';
import { useWebSocketData, LogItem } from '../contexts/WebSocketContext';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatTime } from '../services/format';

export const Logs: React.FC = () => {
  const { liveLogs, isLogsPaused, setIsLogsPaused, clearLogs } = useWebSocketData();
  const { addToast } = useToast();
  const [initialLogs, setInitialLogs] = useState<LogItem[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

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

  const getLogColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return 'text-rose-400';
      case 'WARN':
        return 'text-amber-300';
      case 'DEBUG':
      case 'TRACE':
        return 'text-slate-400';
      case 'INFO':
      default:
        return 'text-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Terminal className="w-8 h-8 text-brand-400" />
              Console Logs
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
              {filteredLogs.length} / 500 Buffer
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time Log4J streaming capture with filtering, severity analysis, and log download.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsLogsPaused(!isLogsPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isLogsPaused
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            {isLogsPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isLogsPaused ? 'Resume Stream' : 'Pause Stream'}
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              autoScroll
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                : 'bg-slate-800 text-slate-400 border-white/5'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            Auto-Scroll
          </button>

          <button
            onClick={clearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-xs font-semibold transition-all"
            title="Clear buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download Log
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search console logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-950/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 font-mono transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          {(['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                levelFilter === lvl
                  ? lvl === 'ERROR'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : lvl === 'WARN'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : lvl === 'DEBUG'
                    ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'bg-dark-950/40 text-slate-400 hover:text-white border border-white/5'
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
        className="h-[600px] w-full rounded-2xl bg-black/90 border border-white/10 p-4 font-mono text-xs overflow-y-auto space-y-1.5 shadow-2xl backdrop-blur-xl"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 italic">
            No logs captured yet
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="leading-relaxed hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
              <span className="text-slate-600 select-none mr-2 font-mono">
                {formatTime(log.timestamp) || '00:00:00'}
              </span>

              <span
                className={`inline-block w-14 font-bold select-none text-[11px] ${
                  log.level === 'ERROR'
                    ? 'text-rose-400'
                    : log.level === 'WARN'
                    ? 'text-amber-400'
                    : log.level === 'DEBUG'
                    ? 'text-slate-400'
                    : 'text-emerald-400'
                }`}
              >
                [{log.level}]
              </span>

              <span className="text-slate-500 mr-2 select-none">
                [{log.loggerName || 'Server'}]
              </span>

              <span className={`${getLogColor(log.level)} break-all`}>{log.message}</span>

              {log.throwable && (
                <div className="text-rose-300/80 text-[11px] mt-1 pl-16 whitespace-pre-wrap">
                  {log.throwable}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
