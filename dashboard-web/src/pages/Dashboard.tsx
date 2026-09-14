import React, { useEffect, useState } from 'react';
import {
  Server,
  Users,
  Activity,
  Zap,
  Clock,
  Sun,
  CloudRain,
  CloudLightning,
  Shield,
  Cpu,
  HardDrive,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { api } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { Link } from 'react-router-dom';
import { formatTime } from '../services/format';

export const Dashboard: React.FC = () => {
  const { liveStats, liveActivity } = useWebSocketData();
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [worldInfo, setWorldInfo] = useState<any>(null);
  const [perfHistory, setPerfHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [info, world, perf] = await Promise.all([
        api.getServerInfo(),
        api.getWorld(),
        api.getPerformance(),
      ]);
      setServerInfo(info);
      setWorldInfo(world);
      if (perf && perf.history1h) {
        setPerfHistory(perf.history1h);
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Format uptime
  const formatUptime = (totalSeconds?: number) => {
    if (!totalSeconds) return '0m';
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Convert Minecraft world ticks (0-24000) to 24h digital time
  const formatWorldTime = (ticks?: number) => {
    if (ticks === undefined) return '06:00';
    // 0 ticks is 06:00, 6000 is 12:00, 18000 is 00:00
    const hours = Math.floor((ticks / 1000 + 6) % 24);
    const minutes = Math.floor(((ticks % 1000) / 1000) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const weatherIcon = () => {
    if (!worldInfo) return <Sun className="w-5 h-5 text-amber-400" />;
    if (worldInfo.weather === 'THUNDER') return <CloudLightning className="w-5 h-5 text-purple-400" />;
    if (worldInfo.weather === 'RAIN') return <CloudRain className="w-5 h-5 text-blue-400" />;
    return <Sun className="w-5 h-5 text-amber-400" />;
  };

  // Chart data preparation
  const chartData = (perfHistory.length > 0 ? perfHistory : []).map((snapshot) => ({
    time: formatTime(snapshot.timestamp),
    tps: Number(snapshot.tps?.toFixed(1) || 20),
    mspt: Number(snapshot.mspt?.toFixed(1) || 5),
    cpuProcess: Number((snapshot.cpuProcess || 0).toFixed(1)),
    cpuSystem: Number((snapshot.cpuSystem || 0).toFixed(1)),
    heapUsed: Math.round((snapshot.heapUsed || 0) / (1024 * 1024)),
    heapMax: Math.round((snapshot.heapMax || 0) / (1024 * 1024)),
    players: snapshot.onlinePlayers || 0,
  }));

  const currentTps = liveStats?.tps ?? 20.0;
  const currentMspt = liveStats?.mspt ?? 5.0;
  const currentPlayers = liveStats?.onlinePlayers ?? (serverInfo?.onlinePlayers || 0);
  const maxPlayers = liveStats?.maxPlayers ?? (serverInfo?.maxPlayers || 20);
  const currentCpu = liveStats?.cpuProcess ?? 0.0;
  const heapUsedMb = Math.round((liveStats?.heapUsed ?? 0) / (1024 * 1024));
  const heapMaxMb = Math.round((liveStats?.heapMax ?? 1024 * 1024 * 1024) / (1024 * 1024));

  if (loading && !serverInfo) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
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
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Server Overview</h1>
            <StatusBadge
              status={serverInfo?.status === 'ONLINE' ? 'ONLINE' : 'WARN'}
              text={serverInfo?.status || 'ONLINE'}
            />
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {serverInfo?.motd || 'Production Minecraft Server'} &bull; Minecraft {serverInfo?.minecraftVersion || '26.2'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-sm font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            to="/players"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm shadow-lg shadow-brand-500/20 transition-all"
          >
            Manage Players
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Server Health (TPS)"
          value={`${currentTps.toFixed(1)} / 20.0`}
          unit="TPS"
          icon={<Zap className="w-5 h-5" />}
          change={`${currentMspt.toFixed(1)} ms tick time`}
          trend={currentTps >= 19.5 ? 'up' : currentTps >= 15.0 ? 'neutral' : 'down'}
          status={currentTps >= 19.5 ? 'healthy' : currentTps >= 15.0 ? 'warning' : 'danger'}
        />

        <MetricCard
          title="Online Players"
          value={`${currentPlayers} / ${maxPlayers}`}
          unit="Online"
          icon={<Users className="w-5 h-5" />}
          change={`${Math.round((currentPlayers / (maxPlayers || 1)) * 100)}% capacity`}
          trend="neutral"
          status="healthy"
        />

        <MetricCard
          title="Memory Usage"
          value={`${heapUsedMb} MB`}
          unit={`/ ${heapMaxMb} MB`}
          icon={<HardDrive className="w-5 h-5" />}
          change={`${Math.round((heapUsedMb / (heapMaxMb || 1)) * 100)}% allocated`}
          trend="neutral"
          status={heapUsedMb / heapMaxMb > 0.85 ? 'danger' : heapUsedMb / heapMaxMb > 0.7 ? 'warning' : 'healthy'}
        />

        <MetricCard
          title="Process CPU"
          value={`${currentCpu.toFixed(1)}%`}
          unit="Usage"
          icon={<Cpu className="w-5 h-5" />}
          change={`Uptime: ${formatUptime(liveStats?.uptimeSeconds || serverInfo?.uptimeSeconds)}`}
          trend="neutral"
          status={currentCpu > 80 ? 'danger' : currentCpu > 50 ? 'warning' : 'healthy'}
        />
      </div>

      {/* Secondary Environment & World Bar */}
      <div className="glass-card p-5 rounded-2xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {weatherIcon()}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">World Weather</p>
            <p className="text-sm font-bold text-white capitalize">{worldInfo?.weather?.toLowerCase() || 'Clear'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">In-Game Time</p>
            <p className="text-sm font-bold text-white">
              {formatWorldTime(worldInfo?.worldTime)} (Day {worldInfo?.dayCount || 0})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Difficulty</p>
            <p className="text-sm font-bold text-white capitalize">{worldInfo?.difficulty || 'Normal'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Fabric Loader</p>
            <p className="text-sm font-bold text-white">{serverInfo?.fabricLoaderVersion || '0.19.3'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Java Runtime</p>
            <p className="text-sm font-bold text-white truncate max-w-[120px]" title={serverInfo?.javaVersion}>
              {serverInfo?.javaVersion || 'Java 25'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">JVM Vendor</p>
            <p className="text-sm font-bold text-white truncate max-w-[120px]" title={serverInfo?.jvmVendor}>
              {serverInfo?.jvmVendor || 'Microsoft'}
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TPS & MSPT History */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                TPS & MSPT Performance
              </h2>
              <p className="text-xs text-slate-400">Target: 20.0 TPS · Max Tick: 50.0 ms</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> TPS
              </span>
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> MSPT
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
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
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="tps" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="mspt" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory & CPU History */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-brand-400" />
                Memory & CPU Utilization
              </h2>
              <p className="text-xs text-slate-400">JVM Heap in MB · Process CPU %</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-brand-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-brand-400" /> Heap (MB)
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-400" /> CPU (%)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="heapGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                  }}
                />
                <Area yAxisId="left" type="monotone" dataKey="heapUsed" stroke="#38bdf8" fillOpacity={1} fill="url(#heapGradient)" strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="cpuProcess" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Online Players History & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Count History */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Player Concurrency Trend
              </h2>
              <p className="text-xs text-slate-400">Concurrent connected players over the last hour</p>
            </div>
            <Link to="/players" className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View All Players &rarr;
            </Link>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="playersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.75rem',
                    color: '#fff',
                  }}
                />
                <Area type="stepAfter" dataKey="players" stroke="#10b981" fillOpacity={1} fill="url(#playersGradient)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed Sneak Peek */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Live Activity
            </h2>
            <Link to="/activity" className="text-xs font-semibold text-brand-400 hover:text-brand-300">
              Full Feed &rarr;
            </Link>
          </div>

          <div className="flex-1 space-y-3 overflow-hidden">
            {liveActivity.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-8 text-center">No recent events recorded</p>
            ) : (
              liveActivity.slice(0, 5).map((evt) => (
                <div key={evt.id} className="p-3 rounded-xl bg-slate-800/40 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-300">{evt.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatTime(evt.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{evt.description}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-white/5 text-center">
            <Link
              to="/logs"
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              Open Server Console Logs &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
