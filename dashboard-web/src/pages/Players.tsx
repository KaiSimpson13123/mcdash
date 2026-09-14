import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  UserX,
  Ban,
  Skull,
  ShieldAlert,
  ShieldCheck,
  Send,
  ExternalLink,
  RefreshCw,
  Heart,
  Utensils,
  Wifi,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FormattedText } from '../components/FormattedText';
import { ConfirmModal } from '../components/ConfirmModal';
import { Skeleton } from '../components/Skeleton';

interface PlayerData {
  uuid: string;
  username: string;
  isOp: boolean;
  prefix?: string;
  suffix?: string;
  primaryGroup?: string;
  ping: number;
  gameMode: string;
  onlineDuration: number;
  firstJoin: string;
  lastSeen: string;
}

type SortField = 'username' | 'ping' | 'onlineDuration';

export const Players: React.FC = () => {
  const { addToast } = useToast();
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGameMode, setFilterGameMode] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('username');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal actions state
  const [activeModal, setActiveModal] = useState<{
    type: 'kick' | 'ban' | 'kill' | 'op' | 'deop' | 'teleport' | null;
    player: PlayerData | null;
  }>({ type: null, player: null });
  const [actionReason, setActionReason] = useState('');
  const [teleportCoords, setTeleportCoords] = useState({ x: 0, y: 64, z: 0, dimension: 'minecraft:overworld' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPlayers = async () => {
    try {
      const data = await api.getPlayers();
      setPlayers(data || []);
    } catch (e) {
      addToast('error', 'Failed to fetch online players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesSearch =
          p.username.toLowerCase().includes(search.toLowerCase()) ||
          p.uuid.toLowerCase().includes(search.toLowerCase()) ||
          (p.primaryGroup && p.primaryGroup.toLowerCase().includes(search.toLowerCase()));
        const matchesMode = filterGameMode === 'ALL' || (p.gameMode && p.gameMode.toLowerCase() === filterGameMode.toLowerCase());
        return matchesSearch && matchesMode;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'username') cmp = a.username.localeCompare(b.username);
        else if (sortField === 'ping') cmp = a.ping - b.ping;
        else if (sortField === 'onlineDuration') cmp = a.onlineDuration - b.onlineDuration;
        return sortAsc ? cmp : -cmp;
      });
  }, [players, search, filterGameMode, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredPlayers.length / pageSize) || 1;
  const paginatedPlayers = filteredPlayers.slice((page - 1) * pageSize, page * pageSize);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  const executeAction = async () => {
    if (!activeModal.player || !activeModal.type) return;
    setActionLoading(true);
    const { uuid, username } = activeModal.player;

    try {
      switch (activeModal.type) {
        case 'kick':
          await api.kickPlayer(uuid, actionReason || 'Kicked by administrator');
          addToast('success', `Kicked ${username}`);
          break;
        case 'ban':
          await api.banPlayer(uuid, actionReason || 'Banned by administrator');
          addToast('success', `Banned ${username}`);
          break;
        case 'kill':
          await api.killPlayer(uuid);
          addToast('success', `Killed ${username}`);
          break;
        case 'op':
          await api.opPlayer(uuid);
          addToast('success', `Granted OP to ${username}`);
          break;
        case 'deop':
          await api.deopPlayer(uuid);
          addToast('success', `Revoked OP from ${username}`);
          break;
        case 'teleport':
          await api.teleportPlayer(
            uuid,
            teleportCoords.x,
            teleportCoords.y,
            teleportCoords.z,
            teleportCoords.dimension
          );
          addToast('success', `Teleported ${username}`);
          break;
      }
      setActiveModal({ type: null, player: null });
      setActionReason('');
      fetchPlayers();
    } catch (e: any) {
      addToast('error', e.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Player Management</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {players.length} Online
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Real-time online player monitoring, latency, and session tracking.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPlayers}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-sm font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search username, UUID, group..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-950/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterGameMode}
            onChange={(e) => {
              setFilterGameMode(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-xl bg-dark-950/60 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="ALL">All Game Modes</option>
            <option value="survival">Survival</option>
            <option value="creative">Creative</option>
            <option value="adventure">Adventure</option>
            <option value="spectator">Spectator</option>
          </select>
        </div>
      </div>

      {/* Players Table */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-dark-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Player</th>
                <th
                  onClick={() => handleSort('ping')}
                  className="px-4 py-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Ping <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('onlineDuration')}
                  className="px-4 py-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Playtime <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={3} className="px-6 py-4">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">
                    {players.length === 0 ? 'No players currently online' : 'No matching players found'}
                  </td>
                </tr>
              ) : (
                paginatedPlayers.map((player) => (
                  <tr key={player.uuid} className="hover:bg-slate-800/30 transition-colors group">
                    {/* Player Name & Prefix */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${player.uuid}/36`}
                          alt={player.username}
                          className="w-9 h-9 rounded-lg shadow-md bg-dark-950 border border-white/10 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {player.prefix && (
                              <span className="text-xs font-semibold">
                                <FormattedText text={player.prefix} />
                              </span>
                            )}
                            <span className="font-bold text-white flex items-center gap-1">
                              {player.username}
                              {player.isOp && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono">
                                  OP
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]" title={player.uuid}>
                            {player.uuid}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Ping */}
                    <td className="px-4 py-4">
                      <span
                        className={`flex items-center gap-1.5 text-xs font-mono font-medium ${player.ping < 60
                            ? 'text-emerald-400'
                            : player.ping < 120
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        {player.ping} ms
                      </span>
                    </td>

                    {/* Playtime */}
                    <td className="px-4 py-4 text-xs font-medium text-slate-300">
                      {formatDuration(player.onlineDuration)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredPlayers.length)} of{' '}
              {filteredPlayers.length} players
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation & Teleport Modals */}
      {activeModal.type && activeModal.player && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setActiveModal({ type: null, player: null })}
          onConfirm={executeAction}
          isLoading={actionLoading}
          variant={activeModal.type === 'ban' || activeModal.type === 'kill' ? 'danger' : 'warning'}
          title={
            activeModal.type === 'kick'
              ? `Kick ${activeModal.player.username}`
              : activeModal.type === 'ban'
                ? `Ban ${activeModal.player.username}`
                : activeModal.type === 'kill'
                  ? `Kill ${activeModal.player.username}`
                  : activeModal.type === 'op'
                    ? `Grant OP to ${activeModal.player.username}`
                    : activeModal.type === 'deop'
                      ? `Revoke OP from ${activeModal.player.username}`
                      : `Teleport ${activeModal.player.username}`
          }
          message={
            activeModal.type === 'kick' || activeModal.type === 'ban' ? (
              <div className="space-y-3">
                <p className="text-slate-300 text-sm">Provide an optional reason for this action:</p>
                <input
                  type="text"
                  placeholder="Reason..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-950 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            ) : activeModal.type === 'teleport' ? (
              <div className="space-y-3">
                <p className="text-slate-300 text-sm">Enter destination coordinates:</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="X"
                    value={teleportCoords.x}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, x: Number(e.target.value) })}
                    className="px-3 py-1.5 rounded-lg bg-dark-950 border border-white/10 text-white text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Y"
                    value={teleportCoords.y}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, y: Number(e.target.value) })}
                    className="px-3 py-1.5 rounded-lg bg-dark-950 border border-white/10 text-white text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Z"
                    value={teleportCoords.z}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, z: Number(e.target.value) })}
                    className="px-3 py-1.5 rounded-lg bg-dark-950 border border-white/10 text-white text-xs"
                  />
                </div>
                <select
                  value={teleportCoords.dimension}
                  onChange={(e) => setTeleportCoords({ ...teleportCoords, dimension: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-dark-950 border border-white/10 text-white text-xs"
                >
                  <option value="minecraft:overworld">Overworld</option>
                  <option value="minecraft:the_nether">The Nether</option>
                  <option value="minecraft:the_end">The End</option>
                </select>
              </div>
            ) : (
              `Are you sure you want to proceed with this action on ${activeModal.player.username}?`
            )
          }
        />
      )}
    </div>
  );
};
