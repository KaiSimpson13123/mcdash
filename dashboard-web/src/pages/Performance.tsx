import React, { useEffect, useState } from 'react';
import {
  Zap,
  Cpu,
  HardDrive,
  Layers,
  RefreshCw,
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

  const tooltipStyle = {
    backgroundColor: '#1b1b1b',
    borderColor: '#3c3c3c',
    borderRadius: '0px',
    color: '#ffffff',
    fontFamily: 'MinecraftRegular, monospace',
    boxShadow: 'inset 1px 1px 0px #555555, 2px 2px 0px #000000',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Range Selector */}
      <div className="mc-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-minecraft text-white">Performance Telemetry</h1>
          <p className="text-xs text-[#a0a0a0] mt-1 font-minecraft">
            Real-time server telemetry, tick times, JVM heap allocation, and garbage collection analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 mc-slot p-1">
            {(['1m', '1h', '24h'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-minecraft transition-all ${
                  range === r
                    ? 'mc-btn mc-btn-primary'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                {r === '1m' ? '1 Min' : r === '1h' ? '1 Hour' : '24 Hours'}
              </button>
            ))}
          </div>

          <button
            onClick={fetchPerformance}
            className="mc-btn mc-btn-sm flex items-center gap-1.5 font-minecraft"
            title="Refresh metrics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Server Tick Rate"
          value={`${tps.toFixed(1)}`}
          unit="TPS"
          icon={<Zap className="w-5 h-5 text-yellow-400" />}
          change={`${mspt.toFixed(1)} ms tick time`}
          status={tps >= 19.5 ? 'healthy' : tps >= 15 ? 'warning' : 'danger'}
        />

        <MetricCard
          title="CPU Utilization"
          value={`${cpuProcess.toFixed(1)}%`}
          unit="Process"
          icon={<Cpu className="w-5 h-5 text-cyan-400" />}
          change={`System: ${cpuSystem.toFixed(1)}%`}
          status={cpuProcess > 80 ? 'danger' : cpuProcess > 50 ? 'warning' : 'healthy'}
        />

        <MetricCard
          title="Heap Memory"
          value={`${heapUsedMb}`}
          unit={`/ ${heapMaxMb} MB`}
          icon={<HardDrive className="w-5 h-5 text-emerald-400" />}
          change={`Committed: ${heapCommittedMb} MB`}
          status={heapUsedMb / heapMaxMb > 0.85 ? 'danger' : heapUsedMb / heapMaxMb > 0.7 ? 'warning' : 'healthy'}
        />

        <MetricCard
          title="Active Threads"
          value={`${threadCount}`}
          unit="Threads"
          icon={<Layers className="w-5 h-5 text-purple-400" />}
          change={`Peak: ${peakThreadCount} threads`}
          status="healthy"
        />
      </div>

      {/* Secondary JVM Diagnostics Bar */}
      <div className="mc-panel p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="mc-slot p-3">
          <p className="text-xs text-[#888888] font-minecraft uppercase">Non-Heap Memory</p>
          <p className="text-lg font-bold text-white font-minecraft mt-1">{nonHeapUsedMb} MB</p>
          <p className="text-[10px] text-[#666666]">Metaspace & Native</p>
        </div>

        <div className="mc-slot p-3">
          <p className="text-xs text-[#888888] font-minecraft uppercase">GC Collections</p>
          <p className="text-lg font-bold text-white font-minecraft mt-1">{gcCount}</p>
          <p className="text-[10px] text-[#666666]">Total cycles run</p>
        </div>

        <div className="mc-slot p-3">
          <p className="text-xs text-[#888888] font-minecraft uppercase">GC Time Elapsed</p>
          <p className="text-lg font-bold text-white font-minecraft mt-1">{gcTimeMillis} ms</p>
          <p className="text-[10px] text-[#666666]">Total pause time</p>
        </div>

        <div className="mc-slot p-3">
          <p className="text-xs text-[#888888] font-minecraft uppercase">Telemetry Window</p>
          <p className="text-lg font-bold text-[#55ff55] font-minecraft mt-1">1 sec</p>
          <p className="text-[10px] text-[#666666]">Rolling buffer rate</p>
        </div>
      </div>

      {/* Historical Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TPS & Tick Duration History */}
        <div className="mc-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
            <div>
              <h2 className="text-base font-minecraft text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                TPS & MSPT History
              </h2>
              <p className="text-xs text-[#888888] font-minecraft">Ticks per second & milliseconds per tick</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-minecraft">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 bg-emerald-400" /> TPS
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 bg-amber-400" /> MSPT
              </span>
            </div>
          </div>

          <div className="mc-slot p-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="2 2" stroke="#2c2c2c" opacity={0.6} />
                <XAxis dataKey="time" stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 22]} stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 60]} stroke="#777777" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line yAxisId="left" type="stepAfter" dataKey="tps" stroke="#55ff55" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="stepAfter" dataKey="mspt" stroke="#ffaa00" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU Utilization History */}
        <div className="mc-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
            <div>
              <h2 className="text-base font-minecraft text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                CPU Usage History
              </h2>
              <p className="text-xs text-[#888888] font-minecraft">Server process vs host operating system</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-minecraft">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 bg-cyan-400" /> Process
              </span>
              <span className="flex items-center gap-1.5 text-[#aaaaaa]">
                <span className="w-2.5 h-2.5 bg-[#888888]" /> System
              </span>
            </div>
          </div>

          <div className="mc-slot p-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00aaaa" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00aaaa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#2c2c2c" opacity={0.6} />
                <XAxis dataKey="time" stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#777777" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="stepAfter" dataKey="cpuProcess" stroke="#55ffff" fillOpacity={1} fill="url(#cpuGradient)" strokeWidth={2} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="cpuSystem" stroke="#888888" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Allocation History */}
        <div className="lg:col-span-2 mc-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-3">
            <div>
              <h2 className="text-base font-minecraft text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Memory Allocation Breakdown
              </h2>
              <p className="text-xs text-[#888888] font-minecraft">JVM Heap Used vs Committed Memory (MB)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-minecraft">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 bg-emerald-400" /> Heap Used
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 bg-purple-400" /> Heap Committed
              </span>
            </div>
          </div>

          <div className="mc-slot p-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#55ff55" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#55ff55" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#2c2c2c" opacity={0.6} />
                <XAxis dataKey="time" stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis stroke="#777777" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="stepAfter" dataKey="heapUsed" stroke="#55ff55" fillOpacity={1} fill="url(#memGradient)" strokeWidth={2} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="heapCommitted" stroke="#aa00aa" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
