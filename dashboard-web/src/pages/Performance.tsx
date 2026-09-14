import React, { useEffect, useState } from 'react';
import {
  Activity,
  Zap,
  Cpu,
  HardDrive,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  GitCommit,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { api } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { Skeleton } from '../components/Skeleton';
import { formatTime } from '../services/format';

export const Performance: React.FC = () => {
  const { liveStats } = useWebSocketData();
  const [range, setRange] = useState<'1m' | '1h' | '24h'>('1h');
  const [historyData, setHistoryData] = useState<{ [key: string]: any[] }>({
    '1m': [],
    '1h': [],
    '24h': [],
  });
  const [loading, setLoading] = useState(true);

  const fetchPerformance = async () => {
    try {
      const data = await api.getPerformance();
      if (data) {
        setHistoryData({
          '1m': data.history1m || [],
          '1h': data.history1h || [],
          '24h': data.history24h || [],
        });
      }
    } catch (e) {
      console.error('Failed to load performance metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
    const interval = setInterval(fetchPerformance, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentList = historyData[range] || [];
  const chartData = currentList.map((snapshot) => ({
    time: formatTime(snapshot.timestamp),
    tps: Number(snapshot.tps?.toFixed(1) || 20),
    mspt: Number(snapshot.mspt?.toFixed(1) || 5),
    cpuProcess: Number((snapshot.cpuProcess || 0).toFixed(1)),
    cpuSystem: Number((snapshot.cpuSystem || 0).toFixed(1)),
    heapUsed: Math.round((snapshot.heapUsed || 0) / (1024 * 1024)),
    heapCommitted: Math.round((snapshot.heapCommitted || 0) / (1024 * 1024)),
    heapMax: Math.round((snapshot.heapMax || 0) / (1024 * 1024)),
    nonHeapUsed: Math.round((snapshot.nonHeapUsed || 0) / (1024 * 1024)),
    threads: snapshot.threadCount || 0,
  }));

  const tps = liveStats?.tps ?? 20.0;
  const mspt = liveStats?.mspt ?? 5.0;
  const cpuProcess = liveStats?.cpuProcess ?? 0.0;
  const cpuSystem = liveStats?.cpuSystem ?? 0.0;
  const heapUsedMb = Math.round((liveStats?.heapUsed ?? 0) / (1024 * 1024));
  const heapCommittedMb = Math.round((liveStats?.heapCommitted ?? 0) / (1024 * 1024));
  const heapMaxMb = Math.round((liveStats?.heapMax ?? 1024 * 1024 * 1024) / (1024 * 1024));
  const nonHeapUsedMb = Math.round((liveStats?.nonHeapUsed ?? 0) / (1024 * 1024));
  const threadCount = liveStats?.threadCount ?? 0;
  const peakThreadCount = liveStats?.peakThreadCount ?? 0;
  const gcCount = liveStats?.gcCount ?? 0;
  const gcTimeMillis = liveStats?.gcTimeMillis ?? 0;

  if (loading && currentList.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Performance Metrics</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time server telemetry, tick times, JVM heap allocation, and garbage collection analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-dark-950/60 p-1 rounded-xl border border-white/5">
            {(['1m', '1h', '24h'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === '1m' ? 'Last 1 Min' : r === '1h' ? 'Last 1 Hour' : 'Last 24 Hours'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchPerformance}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-sm font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Server Tick Rate"
          value={`${tps.toFixed(1)}`}
          unit="TPS"
          icon={<Zap className="w-5 h-5" />}
          change={`${mspt.toFixed(1)} ms tick time`}
          status={tps >= 19.5 ? 'healthy' : tps >= 15 ? 'warning' : 'danger'}
        />

        <MetricCard
          title="CPU Utilization"
          value={`${cpuProcess.toFixed(1)}%`}
          unit="Process"
          icon={<Cpu className="w-5 h-5" />}
          change={`System: ${cpuSystem.toFixed(1)}%`}
          status={cpuProcess > 80 ? 'danger' : cpuProcess > 50 ? 'warning' : 'healthy'}
        />

        <MetricCard
          title="Heap Memory"
          value={`${heapUsedMb}`}
          unit={`/ ${heapMaxMb} MB`}
          icon={<HardDrive className="w-5 h-5" />}
          change={`Committed: ${heapCommittedMb} MB`}
          status={heapUsedMb / heapMaxMb > 0.85 ? 'danger' : heapUsedMb / heapMaxMb > 0.7 ? 'warning' : 'healthy'}
        />

        <MetricCard
          title="Active Threads"
          value={`${threadCount}`}
          unit="Threads"
          icon={<Layers className="w-5 h-5" />}
          change={`Peak: ${peakThreadCount} threads`}
          status="healthy"
        />
      </div>

      {/* Secondary JVM Diagnostics Bar */}
      <div className="glass-card p-5 rounded-2xl border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-400 font-medium">Non-Heap Memory</p>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{nonHeapUsedMb} MB</p>
          <p className="text-[11px] text-slate-500">Metaspace & Native</p>
        </div>

        <div>
          <p className="text-xs text-slate-400 font-medium">GC Collections</p>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{gcCount}</p>
          <p className="text-[11px] text-slate-500">Total cycles run</p>
        </div>

        <div>
          <p className="text-xs text-slate-400 font-medium">GC Time Elapsed</p>
          <p className="text-lg font-bold text-white font-mono mt-0.5">{gcTimeMillis} ms</p>
          <p className="text-[11px] text-slate-500">Total pause time</p>
        </div>

        <div>
          <p className="text-xs text-slate-400 font-medium">Telemetry Resolution</p>
          <p className="text-lg font-bold text-brand-400 font-mono mt-0.5">1 sec</p>
          <p className="text-[11px] text-slate-500">Rolling window buffer</p>
        </div>
      </div>

      {/* Historical Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TPS & Tick Duration History */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                TPS & MSPT History
              </h2>
              <p className="text-xs text-slate-400">Ticks per second & milliseconds per tick</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> TPS
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> MSPT
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 22]} stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 60]} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="tps" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="mspt" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU Utilization History */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                CPU Usage History
              </h2>
              <p className="text-xs text-slate-400">Server process vs host operating system</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-400" /> Process
              </span>
              <span className="flex items-center gap-1 text-slate-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> System
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="cpuProcess" stroke="#818cf8" fillOpacity={1} fill="url(#cpuGradient)" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="cpuSystem" stroke="#94a3b8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Allocation History */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-brand-400" />
                Memory Allocation Breakdown
              </h2>
              <p className="text-xs text-slate-400">JVM Heap Used vs Committed Memory (MB)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-brand-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-brand-400" /> Heap Used
              </span>
              <span className="flex items-center gap-1.5 text-purple-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Heap Committed
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                  }}
                />
                <Area type="monotone" dataKey="heapUsed" stroke="#38bdf8" fillOpacity={1} fill="url(#memGradient)" strokeWidth={2} isAnimationActive={false} />
                <Line type="monotone" dataKey="heapCommitted" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
