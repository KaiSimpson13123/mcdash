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
  Plus,
  Trash2,
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
import { formatTime, sanitizeCoordinates } from '../services/format';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard: React.FC = () => {
  const { liveStats, liveActivity } = useWebSocketData();
  const { isSudo } = useAuth();
  const { addToast } = useToast();
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [worldInfo, setWorldInfo] = useState<any>(null);
  const [perfHistory, setPerfHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Whitelist State
  const [whitelist, setWhitelist] = useState<{ enabled: boolean; count: number; entries: { name: string; uuid?: string }[] }>({
    enabled: false,
    count: 0,
    entries: [],
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [togglingWhitelist, setTogglingWhitelist] = useState(false);

  const fetchWhitelist = async () => {
    try {
      const data = await api.getWhitelist();
      if (data) setWhitelist(data);
    } catch (e) {
      console.error('Failed to load whitelist', e);
    }
  };

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
      await fetchWhitelist();
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

  const [removingPlayer, setRemovingPlayer] = useState<string | null>(null);

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPlayerName.trim();
    if (!clean) return;

    setAddingPlayer(true);
    try {
      await api.addToWhitelist(clean);
      addToast('success', `Added ${clean} to server whitelist!`);
      setNewPlayerName('');
      await fetchWhitelist();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to add player to whitelist');
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleRemoveWhitelist = async (name: string) => {
    if (!isSudo) {
      addToast('error', "Permission denied: Only the 'sudo' operator can remove players from the whitelist.");
      return;
    }
    setRemovingPlayer(name);
    try {
      await api.removeFromWhitelist(name);
      addToast('success', `Removed ${name} from server whitelist!`);
      await fetchWhitelist();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to remove player from whitelist');
    } finally {
      setRemovingPlayer(null);
    }
  };

  const handleToggleWhitelist = async () => {
    if (!isSudo) {
      addToast('error', "Permission denied: Only the 'sudo' operator can activate/deactivate the whitelist.");
      return;
    }
    setTogglingWhitelist(true);
    try {
      const targetState = !whitelist.enabled;
      await api.toggleWhitelist(targetState);
      addToast('info', `Server whitelist is now ${targetState ? 'ENABLED' : 'DISABLED'}`);
      setWhitelist((prev) => ({ ...prev, enabled: targetState }));
      await fetchWhitelist();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to toggle whitelist');
    } finally {
      setTogglingWhitelist(false);
    }
  };

  // Convert Minecraft world ticks (0-24000) to 24h digital time
  const formatWorldTime = (ticks?: number) => {
    if (ticks === undefined) return '06:00';
    const hours = Math.floor((ticks / 1000 + 6) % 24);
    const minutes = Math.floor(((ticks % 1000) / 1000) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const weatherIcon = () => {
    if (!worldInfo) return <Sun className="w-5 h-5 text-[#ffaa00]" />;
    if (worldInfo.weather === 'THUNDER') return <CloudLightning className="w-5 h-5 text-[#a855f7]" />;
    if (worldInfo.weather === 'RAIN') return <CloudRain className="w-5 h-5 text-[#55ffff]" />;
    return <Sun className="w-5 h-5 text-[#ffaa00]" />;
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
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2e2f30] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading tracking-wide text-white">SERVER OVERVIEW</h1>
            <StatusBadge
              status={serverInfo?.status === 'ONLINE' ? 'ONLINE' : 'WARN'}
              text={serverInfo?.status || 'ONLINE'}
            />
          </div>
          <p className="text-xs font-mono text-[#aaaaaa] mt-1">
            {serverInfo?.motd || 'Minecraft Server'} · Minecraft {serverInfo?.minecraftVersion || '26.2'} · Fabric Loader {serverInfo?.fabricLoaderVersion || '0.19.3'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="mc-btn px-3 py-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            REFRESH
          </button>
          <Link
            to="/players"
            className="button button-primary px-3 py-1.5 text-xs"
          >
            MANAGE PLAYERS
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Server Tick Rate"
          value={`${currentTps.toFixed(1)} / 20.0`}
          unit="TPS"
          icon={<Zap className="w-5 h-5 text-[#55ff55]" />}
          change={`${currentMspt.toFixed(1)} ms tick computing`}
          trend={currentTps >= 19.5 ? 'STABLE' : currentTps >= 15.0 ? 'WARNED' : 'LAGGING'}
          status={currentTps >= 19.5 ? 'healthy' : currentTps >= 15.0 ? 'warning' : 'danger'}
        />

        <MetricCard
          title="Connected Players"
          value={`${currentPlayers} / ${maxPlayers}`}
          unit="Online"
          icon={<Users className="w-5 h-5 text-[#55ffff]" />}
          change={`${Math.round((currentPlayers / (maxPlayers || 1)) * 100)}% capacity`}
          trend="STABLE"
          status="healthy"
          progressPercent={Math.round((currentPlayers / (maxPlayers || 1)) * 100)}
        />

        <MetricCard
          title="JVM Memory Pool"
          value={`${heapUsedMb} MB`}
          unit={`/ ${heapMaxMb} MB`}
          icon={<HardDrive className="w-5 h-5 text-[#ffaa00]" />}
          change={`${Math.round((heapUsedMb / (heapMaxMb || 1)) * 100)}% allocated`}
          trend={heapUsedMb / heapMaxMb > 0.85 ? 'HIGH' : 'NORMAL'}
          status={heapUsedMb / heapMaxMb > 0.85 ? 'danger' : heapUsedMb / heapMaxMb > 0.7 ? 'warning' : 'healthy'}
          progressPercent={Math.round((heapUsedMb / (heapMaxMb || 1)) * 100)}
        />

        <MetricCard
          title="Process CPU"
          value={`${currentCpu.toFixed(0)}%`}
          unit="Used"
          icon={<Cpu className="w-5 h-5 text-[#ff5555]" />}
          change="System computing load"
          trend="NORMAL"
          status={currentCpu > 80 ? 'danger' : currentCpu > 50 ? 'warning' : 'healthy'}
          progressPercent={currentCpu}
        />
      </div>

      {/* World State & Environment Banner */}
      {worldInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#ffaa00]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-heading text-[#aaaaaa]">IN-GAME CLOCK</p>
              <p className="text-xl font-heading text-white">{formatWorldTime(worldInfo.timeOfDay)}</p>
              <p className="text-[10px] font-mono text-[#888]">Day {worldInfo.dayCount || 1}</p>
            </div>
          </div>

          <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center">
              {weatherIcon()}
            </div>
            <div>
              <p className="text-[10px] font-heading text-[#aaaaaa]">WEATHER CONDITION</p>
              <p className="text-xl font-heading text-white uppercase">{worldInfo.weather || 'CLEAR'}</p>
              <p className="text-[10px] font-mono text-[#888]">Atmosphere State</p>
            </div>
          </div>

          <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#55ff55]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-heading text-[#aaaaaa]">WORLD DIFFICULTY</p>
              <p className="text-xl font-heading text-white uppercase">{worldInfo.difficulty || 'NORMAL'}</p>
              <p className="text-[10px] font-mono text-[#888]">Hardcore: {worldInfo.hardcore ? 'YES' : 'NO'}</p>
            </div>
          </div>

          <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#55ffff]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-heading text-[#aaaaaa]">TOTAL ENTITIES</p>
              <p className="text-xl font-heading text-white">{worldInfo.totalEntities || 0}</p>
              <p className="text-[10px] font-mono text-[#888]">Chunks: {worldInfo.loadedChunks || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* NEW FEATURE: SERVER WHITELIST MANAGEMENT */}
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#222223] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] shadow-[inset_1px_1px_0_#2b2b2c] flex items-center justify-center text-[#ffaa00]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading text-white tracking-wide">
                  SERVER WHITELIST MANAGEMENT
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-heading uppercase border ${
                  whitelist.enabled
                    ? 'bg-[#1e3816] text-[#55ff55] border-[#11240c]'
                    : 'bg-[#421414] text-[#ff5555] border-[#260a0a]'
                }`}>
                  {whitelist.enabled ? 'WHITELIST: ON' : 'WHITELIST: OFF'}
                </span>
              </div>
              <p className="text-xs font-mono text-[#aaaaaa]">
                Manage player access control · {whitelist.count} player{whitelist.count === 1 ? '' : 's'} whitelisted
              </p>
            </div>
          </div>

          {isSudo ? (
            <button
              onClick={handleToggleWhitelist}
              disabled={togglingWhitelist}
              className={`px-4 py-2 text-xs font-heading ${
                whitelist.enabled ? 'mc-btn-danger' : 'mc-btn-primary'
              }`}
            >
              {togglingWhitelist
                ? 'UPDATING...'
                : whitelist.enabled
                ? 'DEACTIVATE WHITELIST'
                : 'ACTIVATE WHITELIST'}
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-[#1e1e1f] border border-[#2b2b2c] text-[11px] font-mono text-[#aaaaaa]">
              TOGGLE RESTRICTED TO SUDO
            </div>
          )}
        </div>

        {/* Policy Notice */}
        <div className="p-2.5 bg-[#1a1a1b] border-2 border-[#141415] shadow-[inset_1px_1px_0_#0f0f10] flex items-center justify-between text-xs font-mono text-[#aaaaaa]">
          <span className="flex items-center gap-2 text-[#ffaa00]">
            <span className="font-heading">POLICY:</span>
            {isSudo
              ? 'Sudo Access Active: You have full privileges to add, remove, and toggle whitelist status.'
              : 'Admin Access Active: You may add players to the whitelist. Deactivation and removal require sudo privileges.'}
          </span>
          <span className="text-[10px] text-[#888] font-heading uppercase">
            {isSudo ? 'Full Whitelist Control' : 'Add-Only Mode'}
          </span>
        </div>

        {/* Add Player to Whitelist Form - Open to both Admin and Sudo */}
        <form onSubmit={handleAddWhitelist} className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Enter player username to whitelist (e.g. Steve, Alex, Notch)..."
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            disabled={addingPlayer}
            className="form-input flex-1 text-xs"
          />
          <button
            type="submit"
            disabled={addingPlayer || !newPlayerName.trim()}
            className="button button-primary px-4 py-2 text-xs w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {addingPlayer ? 'ADDING TO SERVER...' : 'ADD TO WHITELIST'}
          </button>
        </form>

        {/* Current Whitelisted Players List */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-heading text-[#d0d1d4] uppercase tracking-wider">
              WHITLESTED PLAYERS ROSTER ({whitelist.entries.length})
            </h3>
            <span className="text-[11px] font-mono text-[#888]">
              {whitelist.entries.length} Total Registered
            </span>
          </div>

          {whitelist.entries.length === 0 ? (
            <div className="p-6 bg-[#1a1a1b] border-2 border-[#141415] text-center text-xs font-mono text-[#888888] italic">
              No players currently in whitelist. Type a username above to whitelist players.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 bg-[#1a1a1b] border-2 border-[#141415] shadow-[inset_2px_2px_0_#0f0f10]">
              {whitelist.entries.map((entry, idx) => (
                <div
                  key={entry.uuid || entry.name || idx}
                  className="p-2 bg-[#252526] border-2 border-[#1e1e1f] shadow-[inset_1px_1px_0_#38393a,inset_-1px_-1px_0_#141415] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={`https://mc-heads.net/avatar/${entry.name}/24`}
                      alt={entry.name}
                      className="w-6 h-6 border border-black pixelated flex-shrink-0 bg-[#111112]"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-heading text-white truncate">{entry.name}</p>
                      {entry.uuid && (
                        <p className="text-[9px] font-mono text-[#888888] truncate" title={entry.uuid}>
                          {entry.uuid.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#1e3816] text-[#55ff55] border border-[#11240c] font-heading">
                      ALLOWED
                    </span>
                    {isSudo && (
                      <button
                        onClick={() => handleRemoveWhitelist(entry.name)}
                        disabled={removingPlayer === entry.name}
                        className="mc-btn-danger px-1.5 py-0.5 text-[9px] flex items-center gap-0.5 font-heading"
                        title="Remove player from whitelist"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                        {removingPlayer === entry.name ? '...' : 'REMOVE'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TPS & MSPT Real-Time Trend */}
        <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#242425] pb-2">
            <div>
              <h2 className="text-sm font-heading text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#55ff55]" />
                TPS & TICK DURATION
              </h2>
              <p className="text-[11px] font-mono text-[#aaaaaa]">Server computational velocity</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-[#55ff55]">■ TPS</span>
              <span className="text-[#ffaa00]">■ MSPT</span>
            </div>
          </div>

          <div className="h-60 w-full bg-[#1a1a1b] border-2 border-[#141415] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2b" />
                <XAxis dataKey="time" stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 22]} stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 60]} stroke="#777777" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1f',
                    borderColor: '#141415',
                    color: '#fff',
                    fontFamily: 'MinecraftRegular, monospace',
                    fontSize: '11px',
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="tps" stroke="#55ff55" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="mspt" stroke="#ffaa00" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory & CPU History */}
        <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#242425] pb-2">
            <div>
              <h2 className="text-sm font-heading text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#55ffff]" />
                MEMORY ALLOCATION
              </h2>
              <p className="text-[11px] font-mono text-[#aaaaaa]">JVM Heap in MB · Process CPU %</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-[#55ffff]">■ HEAP (MB)</span>
              <span className="text-[#a855f7]">■ CPU (%)</span>
            </div>
          </div>

          <div className="h-60 w-full bg-[#1a1a1b] border-2 border-[#141415] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2b" />
                <XAxis dataKey="time" stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#777777" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1f',
                    borderColor: '#141415',
                    color: '#fff',
                    fontFamily: 'MinecraftRegular, monospace',
                    fontSize: '11px',
                  }}
                />
                <Area yAxisId="left" type="monotone" dataKey="heapUsed" stroke="#55ffff" fill="#55ffff" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="cpuProcess" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Player Concurrency Trend & Live Activity Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#242425] pb-2">
            <div>
              <h2 className="text-sm font-heading text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#55ff55]" />
                PLAYER CONCURRENCY
              </h2>
              <p className="text-[11px] font-mono text-[#aaaaaa]">Connected players past hour</p>
            </div>
            <Link to="/players" className="text-xs font-heading text-[#55ff55] hover:underline">
              PLAYERS ROSTER →
            </Link>
          </div>

          <div className="h-52 w-full bg-[#1a1a1b] border-2 border-[#141415] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2b" />
                <XAxis dataKey="time" stroke="#777777" fontSize={10} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#777777" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1f',
                    borderColor: '#141415',
                    color: '#fff',
                    fontFamily: 'MinecraftRegular, monospace',
                    fontSize: '11px',
                  }}
                />
                <Area type="stepAfter" dataKey="players" stroke="#55ff55" fill="#55ff55" fillOpacity={0.25} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed Preview */}
        <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[#242425] pb-2">
            <h2 className="text-sm font-heading text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ff55ff]" />
              RECENT EVENTS
            </h2>
            <Link to="/activity" className="text-xs font-heading text-[#55ff55] hover:underline">
              ALL →
            </Link>
          </div>

          <div className="flex-1 space-y-2 overflow-hidden">
            {liveActivity.length === 0 ? (
              <p className="text-xs font-mono text-[#888888] italic py-6 text-center">
                No recent activity recorded
              </p>
            ) : (
              liveActivity.slice(0, 4).map((evt) => (
                <div key={evt.id} className="p-2 bg-[#252526] border border-[#1e1e1f] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-heading text-[#55ff55] truncate">{sanitizeCoordinates(evt.title)}</span>
                    <span className="text-[10px] text-[#888888] font-mono">
                      {formatTime(evt.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#cccccc] truncate">{sanitizeCoordinates(evt.description)}</p>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-[#242425] text-center">
            <Link
              to="/logs"
              className="text-xs font-heading text-[#aaaaaa] hover:text-white flex items-center justify-center gap-1"
            >
              SERVER CONSOLE & COMMANDS →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
