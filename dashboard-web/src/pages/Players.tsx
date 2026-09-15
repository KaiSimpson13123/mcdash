import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  UserX,
  Ban,
  Skull,
  ShieldCheck,
  Send,
  RefreshCw,
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
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2e2f30] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading tracking-wide text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[#55ff55]" />
              ONLINE PLAYERS
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-heading bg-[#1e3816] text-[#55ff55] border border-[#11240c]">
              {players.length} CONNECTED
            </span>
          </div>
          <p className="text-xs font-mono text-[#aaaaaa] mt-1">
            Real-time online player monitoring, telemetry, administrative actions, and teleportation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPlayers}
            className="mc-btn px-3 py-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            REFRESH
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-3 flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#888888] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search username, UUID, group..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="form-input pl-8 py-1 text-xs h-8"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#aaaaaa]" />
          <select
            value={filterGameMode}
            onChange={(e) => {
              setFilterGameMode(e.target.value);
              setPage(1);
            }}
            className="form-input px-2 py-1 text-xs h-8"
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
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#242425] text-xs font-heading uppercase tracking-wider text-[#aaaaaa] border-b-2 border-[#141415]">
              <tr>
                <th className="px-4 py-3">PLAYER</th>
                <th className="px-4 py-3">MODE</th>
                <th
                  onClick={() => handleSort('ping')}
                  className="px-4 py-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    PING <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('onlineDuration')}
                  className="px-4 py-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    PLAYTIME <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1f]">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="bg-[#1e1e1f]">
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#777777] italic font-mono">
                    {players.length === 0 ? 'No players currently online on this server' : 'No matching players found'}
                  </td>
                </tr>
              ) : (
                paginatedPlayers.map((player) => (
                  <tr key={player.uuid} className="hover:bg-[#28292a] bg-[#1e1e1f] transition-none">
                    {/* Player Name & Head */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={`https://mc-heads.net/avatar/${player.username}/32`}
                          alt={player.username}
                          className="w-7 h-7 border border-black pixelated flex-shrink-0 bg-[#111112]"
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {player.prefix && (
                              <span className="text-xs font-mono">
                                <FormattedText text={player.prefix} />
                              </span>
                            )}
                            <span className="font-heading text-white flex items-center gap-1">
                              {player.username}
                              {player.isOp && (
                                <span className="px-1 py-0.2 bg-[#a82323] text-white text-[9px] font-heading border border-[#5c1111]">
                                  OP
                                </span>
                              )}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#777777] font-mono truncate max-w-[140px]" title={player.uuid}>
                            {player.uuid}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* GameMode */}
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 bg-[#252526] border border-[#141415] text-[10px] font-heading uppercase text-[#d0d1d4]">
                        {player.gameMode || 'SURVIVAL'}
                      </span>
                    </td>

                    {/* Ping */}
                    <td className="px-4 py-2.5">
                      <span
                        className={`flex items-center gap-1 text-xs font-mono ${
                          player.ping < 60
                            ? 'text-[#55ff55]'
                            : player.ping < 120
                            ? 'text-[#ffff55]'
                            : 'text-[#ff5555]'
                        }`}
                      >
                        <Wifi className="w-3 h-3" />
                        {player.ping} ms
                      </span>
                    </td>

                    {/* Playtime */}
                    <td className="px-4 py-2.5 text-xs text-[#cccccc]">
                      {formatDuration(player.onlineDuration)}
                    </td>

                    {/* Action Controls */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => setActiveModal({ type: 'teleport', player })}
                          className="mc-btn px-2 py-0.5 text-[10px]"
                          title="Teleport"
                        >
                          TP
                        </button>
                        {player.isOp ? (
                          <button
                            onClick={() => setActiveModal({ type: 'deop', player })}
                            className="mc-btn px-2 py-0.5 text-[10px]"
                            title="De-OP"
                          >
                            DE-OP
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveModal({ type: 'op', player })}
                            className="mc-btn px-2 py-0.5 text-[10px] bg-[#3c8527] text-white"
                            title="Grant OP"
                          >
                            OP
                          </button>
                        )}
                        <button
                          onClick={() => setActiveModal({ type: 'kill', player })}
                          className="mc-btn px-2 py-0.5 text-[10px] bg-[#a82323] text-white"
                          title="Kill Player"
                        >
                          KILL
                        </button>
                        <button
                          onClick={() => setActiveModal({ type: 'kick', player })}
                          className="mc-btn px-2 py-0.5 text-[10px]"
                          title="Kick Player"
                        >
                          KICK
                        </button>
                        <button
                          onClick={() => setActiveModal({ type: 'ban', player })}
                          className="mc-btn-danger px-2 py-0.5 text-[10px]"
                          title="Ban Player"
                        >
                          BAN
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t-2 border-[#141415] bg-[#242425] flex items-center justify-between text-xs font-mono text-[#aaaaaa]">
            <span>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredPlayers.length)} of{' '}
              {filteredPlayers.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="mc-btn px-2.5 py-1 text-xs"
              >
                PREV
              </button>
              <span className="px-2 font-heading">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="mc-btn px-2.5 py-1 text-xs"
              >
                NEXT
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
              ? `KICK ${activeModal.player.username}`
              : activeModal.type === 'ban'
              ? `BAN ${activeModal.player.username}`
              : activeModal.type === 'kill'
              ? `KILL ${activeModal.player.username}`
              : activeModal.type === 'op'
              ? `GRANT OP TO ${activeModal.player.username}`
              : activeModal.type === 'deop'
              ? `REVOKE OP FROM ${activeModal.player.username}`
              : `TELEPORT ${activeModal.player.username}`
          }
          message={
            activeModal.type === 'kick' || activeModal.type === 'ban' ? (
              <div className="space-y-2">
                <p className="text-white text-xs">Enter administrative reason for this action:</p>
                <input
                  type="text"
                  placeholder="Reason..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="form-input w-full text-xs"
                />
              </div>
            ) : activeModal.type === 'teleport' ? (
              <div className="space-y-2">
                <p className="text-white text-xs">Target coordinates:</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="X"
                    value={teleportCoords.x}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, x: Number(e.target.value) })}
                    className="form-input text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Y"
                    value={teleportCoords.y}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, y: Number(e.target.value) })}
                    className="form-input text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Z"
                    value={teleportCoords.z}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, z: Number(e.target.value) })}
                    className="form-input text-xs"
                  />
                </div>
                <select
                  value={teleportCoords.dimension}
                  onChange={(e) => setTeleportCoords({ ...teleportCoords, dimension: e.target.value })}
                  className="form-input w-full text-xs"
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
