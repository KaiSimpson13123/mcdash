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
  Eye,
  X,
  Heart,
  Utensils,
  Zap,
  Compass,
  Package,
  Box,
  Sparkles,
  Shield,
  Clock,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
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
  const { isSudo } = useAuth();
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

  // Sudo-only Player Inspector State
  const [inspectPlayer, setInspectPlayer] = useState<PlayerData | null>(null);
  const [inspectDetails, setInspectDetails] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectTab, setInspectTab] = useState<'telemetry' | 'inventory' | 'enderchest'>('telemetry');

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

  const handleActionClick = (type: 'kick' | 'ban' | 'kill' | 'op' | 'deop' | 'teleport', player: PlayerData) => {
    if (!isSudo) {
      addToast('error', "Permission denied: Only the 'sudo' user can use action buttons.");
      return;
    }
    setActiveModal({ type, player });
  };

  // Sudo player inspection handler
  const handleInspectPlayer = async (player: PlayerData) => {
    if (!isSudo) return; // Strict guard
    setInspectPlayer(player);
    setInspectLoading(true);
    setInspectTab('telemetry');
    try {
      const details = await api.getPlayerFullDetails(player.uuid);
      setInspectDetails(details);
    } catch (e: any) {
      addToast('error', e.message || 'Failed to load player telemetry data');
      setInspectPlayer(null);
    } finally {
      setInspectLoading(false);
    }
  };

  const executeAction = async () => {
    if (!isSudo) {
      addToast('error', "Permission denied: Only the 'sudo' user can use action buttons.");
      setActiveModal({ type: null, player: null });
      return;
    }
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
      // If currently inspecting this player, refresh their details
      if (inspectPlayer && inspectPlayer.uuid === uuid) {
        handleInspectPlayer(inspectPlayer);
      }
    } catch (e: any) {
      addToast('error', e.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper component to render an inventory slot
  const renderItemSlot = (item: any, slotNumber?: number, label?: string) => {
    const isEmpty = !item || item.empty;
    const count = item?.count || 0;
    const name = item?.name || '';
    const itemId = item?.id || '';
    const isDamaged = item?.isDamaged;
    const damage = item?.damage || 0;
    const maxDamage = item?.maxDamage || 1;
    const durabilityPct = maxDamage > 0 ? Math.max(0, 100 - (damage / maxDamage) * 100) : 100;

    return (
      <div
        key={slotNumber !== undefined ? slotNumber : label}
        title={!isEmpty ? `${name} (${itemId})${isDamaged ? ` - Durability: ${maxDamage - damage}/${maxDamage}` : ''}` : label || 'Empty Slot'}
        className="w-12 h-12 bg-[#1e1e1f] border-2 border-[#141415] shadow-[inset_2px_2px_0_#0f0f10,inset_-2px_-2px_0_#38393a] flex flex-col items-center justify-center relative select-none hover:border-[#55ff55] transition-none group cursor-help"
      >
        {slotNumber !== undefined && (
          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-[#555] pointer-events-none">
            {slotNumber}
          </span>
        )}
        {label && isEmpty && (
          <span className="text-[9px] font-mono text-[#555] uppercase text-center px-0.5">
            {label}
          </span>
        )}
        {!isEmpty && (
          <>
            <span className="text-[10px] font-mono font-bold text-white text-center leading-tight truncate px-0.5 max-w-[44px]">
              {name.replace(/^minecraft:/, '')}
            </span>
            {count > 1 && (
              <span className="absolute bottom-0.5 right-1 text-[10px] font-heading text-[#ffff55] drop-shadow-[1px_1px_0_#000]">
                {count}
              </span>
            )}
            {isDamaged && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#222]">
                <div
                  className={`h-full ${durabilityPct > 50 ? 'bg-[#55ff55]' : durabilityPct > 20 ? 'bg-[#ffaa00]' : 'bg-[#ff5555]'}`}
                  style={{ width: `${durabilityPct}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
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
        {!isSudo && (
          <div className="p-2.5 bg-[#2b1818] border-b-2 border-[#141415] flex items-center justify-between text-xs font-mono text-[#ffaaaa]">
            <span>[RESTRICTED ACCESS] Logged in as non-sudo user. Action buttons (TP, OP, KILL, KICK, BAN) are locked to the 'sudo' operator.</span>
            <span className="font-heading uppercase text-[10px] text-white px-2 py-0.5 bg-[#521212] border border-[#ff5555]">
              SUDO ONLY
            </span>
          </div>
        )}
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
                  <tr
                    key={player.uuid}
                    onClick={() => {
                      if (isSudo) {
                        handleInspectPlayer(player);
                      }
                    }}
                    className={`bg-[#1e1e1f] transition-none ${
                      isSudo
                        ? 'cursor-pointer hover:bg-[#28292a] group'
                        : 'cursor-default'
                    }`}
                  >
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
                              {isSudo && (
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#55ffff] font-heading ml-1.5 transition-none flex items-center gap-0.5">
                                  <Eye className="w-3 h-3" /> INSPECT
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
                      <div
                        className="flex items-center justify-end gap-1 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSudo && (
                          <button
                            onClick={() => handleInspectPlayer(player)}
                            className="mc-btn px-2 py-0.5 text-[10px] bg-[#1a2e40] text-[#55ffff] hover:border-[#55ffff]"
                            title="Inspect full telemetry, inventory, cords, and vitals"
                          >
                            INSPECT
                          </button>
                        )}
                        <button
                          onClick={() => handleActionClick('teleport', player)}
                          className={`mc-btn px-2 py-0.5 text-[10px] ${!isSudo ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={!isSudo ? "Action buttons require the 'sudo' operator" : "Teleport"}
                        >
                          TP
                        </button>
                        {player.isOp ? (
                          <button
                            onClick={() => handleActionClick('deop', player)}
                            className={`mc-btn px-2 py-0.5 text-[10px] ${!isSudo ? 'opacity-40 cursor-not-allowed' : ''}`}
                            title={!isSudo ? "Action buttons require the 'sudo' operator" : "De-OP"}
                          >
                            DE-OP
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActionClick('op', player)}
                            className={`mc-btn px-2 py-0.5 text-[10px] bg-[#3c8527] text-white ${!isSudo ? 'opacity-40 cursor-not-allowed' : ''}`}
                            title={!isSudo ? "Action buttons require the 'sudo' operator" : "Grant OP"}
                          >
                            OP
                          </button>
                        )}
                        <button
                          onClick={() => handleActionClick('kill', player)}
                          className={`mc-btn px-2 py-0.5 text-[10px] bg-[#a82323] text-white ${!isSudo ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={!isSudo ? "Action buttons require the 'sudo' operator" : "Kill Player"}
                        >
                          KILL
                        </button>
                        <button
                          onClick={() => handleActionClick('kick', player)}
                          className={`mc-btn px-2 py-0.5 text-[10px] ${!isSudo ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={!isSudo ? "Action buttons require the 'sudo' operator" : "Kick Player"}
                        >
                          KICK
                        </button>
                        <button
                          onClick={() => handleActionClick('ban', player)}
                          className={`mc-btn-danger px-2 py-0.5 text-[10px] ${!isSudo ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title={!isSudo ? "Action buttons require the 'sudo' operator" : "Ban Player"}
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

      {/* Sudo-Only Player Telemetry & Inventory Inspector Modal */}
      {isSudo && inspectPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="bg-[#2e2f30] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-[#242425] border-b-4 border-[#141415] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={`https://mc-heads.net/avatar/${inspectPlayer.username}/48`}
                  alt={inspectPlayer.username}
                  className="w-12 h-12 border-2 border-black pixelated bg-[#111112]"
                  onError={(e: any) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-heading text-white tracking-wider flex items-center gap-2">
                      {inspectPlayer.username}
                    </h2>
                    {inspectPlayer.isOp && (
                      <span className="px-1.5 py-0.5 bg-[#a82323] text-white text-[10px] font-heading border border-[#5c1111]">
                        OPERATOR
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-heading uppercase bg-[#1e3816] text-[#55ff55] border border-[#11240c]">
                      {inspectPlayer.gameMode}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-heading uppercase bg-[#421414] text-[#ffaa00] border border-[#ffaa00]">
                      SUDO INSPECTOR
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#aaaaaa] mt-0.5">
                    UUID: {inspectPlayer.uuid} · Latency: {inspectPlayer.ping}ms · Online: {formatDuration(inspectPlayer.onlineDuration)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setInspectPlayer(null);
                  setInspectDetails(null);
                }}
                className="mc-btn p-1.5"
                title="Close Inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 pt-3 bg-[#242425] border-b-2 border-[#1e1e1f] flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setInspectTab('telemetry')}
                className={`px-3 py-1.5 text-xs font-heading flex items-center gap-1.5 transition-none ${
                  inspectTab === 'telemetry'
                    ? 'bg-[#3c8527] text-white border-t-2 border-x-2 border-[#5db53b]'
                    : 'bg-[#313233] text-[#aaaaaa] hover:text-white border-t-2 border-x-2 border-[#1e1e1f]'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                TELEMETRY & VITALS
              </button>
              <button
                onClick={() => setInspectTab('inventory')}
                className={`px-3 py-1.5 text-xs font-heading flex items-center gap-1.5 transition-none ${
                  inspectTab === 'inventory'
                    ? 'bg-[#3c8527] text-white border-t-2 border-x-2 border-[#5db53b]'
                    : 'bg-[#313233] text-[#aaaaaa] hover:text-white border-t-2 border-x-2 border-[#1e1e1f]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                PLAYER INVENTORY
              </button>
              <button
                onClick={() => setInspectTab('enderchest')}
                className={`px-3 py-1.5 text-xs font-heading flex items-center gap-1.5 transition-none ${
                  inspectTab === 'enderchest'
                    ? 'bg-[#3c8527] text-white border-t-2 border-x-2 border-[#5db53b]'
                    : 'bg-[#313233] text-[#aaaaaa] hover:text-white border-t-2 border-x-2 border-[#1e1e1f]'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-[#ff55ff]" />
                ENDER CHEST (27 SLOTS)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-5 overflow-y-auto bg-[#1a1a1b] font-mono text-xs space-y-5">
              {inspectLoading ? (
                <div className="space-y-4 py-8">
                  <div className="flex items-center justify-center gap-2 text-white font-heading text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin text-[#55ff55]" />
                    <span>QUERYING LIVE TELEMETRY CHUNKS...</span>
                  </div>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : !inspectDetails ? (
                <div className="text-center py-12 text-[#ff5555]">
                  Failed to query player data or player is no longer online.
                </div>
              ) : (
                <>
                  {/* TAB 1: TELEMETRY & VITALS */}
                  {inspectTab === 'telemetry' && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Exact Coordinates Card */}
                      <div className="p-4 bg-[#252526] border-2 border-[#141415] shadow-[inset_2px_2px_0_#38393a] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#141415] pb-2">
                          <h3 className="font-heading text-white text-xs flex items-center gap-2">
                            <Compass className="w-4 h-4 text-[#55ff55]" />
                            EXACT SPATIAL TELEMETRY
                          </h3>
                          <span className="text-[10px] font-heading px-2 py-0.5 bg-[#141415] text-[#55ffff] border border-[#333]">
                            {inspectDetails.position?.dimension || 'OVERWORLD'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                          <div className="p-2 bg-[#1e1e1f] border border-[#141415]">
                            <p className="text-[10px] font-heading text-[#888]">X COORDINATE</p>
                            <p className="text-sm font-heading text-[#55ff55] mt-1">{inspectDetails.position?.x}</p>
                          </div>
                          <div className="p-2 bg-[#1e1e1f] border border-[#141415]">
                            <p className="text-[10px] font-heading text-[#888]">Y (ELEVATION)</p>
                            <p className="text-sm font-heading text-[#55ffff] mt-1">{inspectDetails.position?.y}</p>
                          </div>
                          <div className="p-2 bg-[#1e1e1f] border border-[#141415]">
                            <p className="text-[10px] font-heading text-[#888]">Z COORDINATE</p>
                            <p className="text-sm font-heading text-[#55ff55] mt-1">{inspectDetails.position?.z}</p>
                          </div>
                          <div className="p-2 bg-[#1e1e1f] border border-[#141415]">
                            <p className="text-[10px] font-heading text-[#888]">YAW (ROTATION)</p>
                            <p className="text-sm font-heading text-[#ffaa00] mt-1">{inspectDetails.position?.yaw}°</p>
                          </div>
                          <div className="p-2 bg-[#1e1e1f] border border-[#141415]">
                            <p className="text-[10px] font-heading text-[#888]">PITCH (ANGLE)</p>
                            <p className="text-sm font-heading text-[#ffaa00] mt-1">{inspectDetails.position?.pitch}°</p>
                          </div>
                        </div>
                      </div>

                      {/* Vitals & Health Card */}
                      <div className="p-4 bg-[#252526] border-2 border-[#141415] shadow-[inset_2px_2px_0_#38393a] space-y-3">
                        <h3 className="font-heading text-white text-xs flex items-center gap-2 border-b border-[#141415] pb-2">
                          <Heart className="w-4 h-4 text-[#ff5555]" />
                          BIOMETRIC VITALS & SATURATION
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Health */}
                          <div className="p-3 bg-[#1e1e1f] border border-[#141415] space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-heading text-[#ff5555]">
                              <span>HEALTH</span>
                              <span>{inspectDetails.vitals?.health} / {inspectDetails.vitals?.maxHealth}</span>
                            </div>
                            <div className="w-full bg-[#111] h-3 border border-black">
                              <div
                                className="bg-[#ff5555] h-full transition-none"
                                style={{ width: `${Math.min(100, (inspectDetails.vitals?.health / (inspectDetails.vitals?.maxHealth || 20)) * 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Food */}
                          <div className="p-3 bg-[#1e1e1f] border border-[#141415] space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-heading text-[#ffaa00]">
                              <span>HUNGER / FOOD</span>
                              <span>{inspectDetails.vitals?.foodLevel} / 20</span>
                            </div>
                            <div className="w-full bg-[#111] h-3 border border-black">
                              <div
                                className="bg-[#ffaa00] h-full transition-none"
                                style={{ width: `${(inspectDetails.vitals?.foodLevel / 20) * 100}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-[#888]">Saturation: {inspectDetails.vitals?.saturationLevel}</p>
                          </div>

                          {/* Experience */}
                          <div className="p-3 bg-[#1e1e1f] border border-[#141415] space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-heading text-[#55ff55]">
                              <span>XP LEVEL</span>
                              <span>LVL {inspectDetails.vitals?.experienceLevel}</span>
                            </div>
                            <div className="w-full bg-[#111] h-3 border border-black">
                              <div
                                className="bg-[#55ff55] h-full transition-none"
                                style={{ width: `${inspectDetails.vitals?.experienceProgress}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-[#888]">Total XP: {inspectDetails.vitals?.totalExperience}</p>
                          </div>

                          {/* Air Supply */}
                          <div className="p-3 bg-[#1e1e1f] border border-[#141415] space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-heading text-[#55ffff]">
                              <span>AIR SUPPLY</span>
                              <span>{inspectDetails.vitals?.airSupply} / {inspectDetails.vitals?.maxAirSupply}</span>
                            </div>
                            <div className="w-full bg-[#111] h-3 border border-black">
                              <div
                                className="bg-[#55ffff] h-full transition-none"
                                style={{ width: `${Math.max(0, (inspectDetails.vitals?.airSupply / (inspectDetails.vitals?.maxAirSupply || 300)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Active Potion Effects */}
                      <div className="p-4 bg-[#252526] border-2 border-[#141415] shadow-[inset_2px_2px_0_#38393a] space-y-2">
                        <h3 className="font-heading text-white text-xs flex items-center gap-2 border-b border-[#141415] pb-2">
                          <Sparkles className="w-4 h-4 text-[#ff55ff]" />
                          ACTIVE STATUS EFFECTS ({inspectDetails.effects?.length || 0})
                        </h3>
                        {(!inspectDetails.effects || inspectDetails.effects.length === 0) ? (
                          <p className="text-[#777] italic py-2">No active potion or status effects applied.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {inspectDetails.effects.map((eff: any, i: number) => (
                              <div
                                key={i}
                                className="px-3 py-1.5 bg-[#1a1a1b] border-2 border-[#141415] flex items-center gap-2 text-xs"
                              >
                                <span className="font-heading text-[#ff55ff]">{eff.name}</span>
                                <span className="text-[10px] text-[#ffff55] bg-[#333] px-1">Lvl {eff.amplifier + 1}</span>
                                <span className="text-[10px] text-[#aaaaaa]">({Math.round(eff.duration / 20)}s)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PLAYER INVENTORY */}
                  {inspectTab === 'inventory' && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Equipment Slots */}
                      <div className="p-3 bg-[#252526] border-2 border-[#141415] shadow-[inset_2px_2px_0_#38393a] space-y-2">
                        <p className="text-[11px] font-heading text-[#aaaaaa] uppercase tracking-wide">
                          ARMOR & EQUIPMENT
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {renderItemSlot(inspectDetails.inventory?.armor?.helmet, undefined, 'HELMET')}
                          {renderItemSlot(inspectDetails.inventory?.armor?.chestplate, undefined, 'CHEST')}
                          {renderItemSlot(inspectDetails.inventory?.armor?.leggings, undefined, 'LEGS')}
                          {renderItemSlot(inspectDetails.inventory?.armor?.boots, undefined, 'BOOTS')}
                          <div className="border-l-2 border-[#141415] pl-3">
                            {renderItemSlot(inspectDetails.inventory?.offhand, 40, 'OFFHAND')}
                          </div>
                        </div>
                      </div>

                      {/* Main 27 Storage Slots */}
                      <div className="p-3 bg-[#252526] border-2 border-[#141415] shadow-[inset_2px_2px_0_#38393a] space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-heading text-[#aaaaaa] uppercase tracking-wide">
                            MAIN STORAGE (SLOTS 9 - 35)
                          </p>
                          <span className="text-[10px] text-[#888]">3 Rows × 9 Slots</span>
                        </div>
                        <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#161617] border-2 border-[#141415]">
                          {inspectDetails.inventory?.items?.slice(9, 36).map((item: any, idx: number) =>
                            renderItemSlot(item, idx + 9)
                          )}
                        </div>
                      </div>

                      {/* Hotbar Slots 0-8 */}
                      <div className="p-3 bg-[#252526] border-2 border-[#141415] shadow-[inset_2px_2px_0_#38393a] space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-heading text-[#55ff55] uppercase tracking-wide flex items-center gap-2">
                            <span>HOTBAR (SLOTS 0 - 8)</span>
                            <span className="text-[10px] text-[#888]">
                              Selected: Slot {inspectDetails.inventory?.selectedSlot}
                            </span>
                          </p>
                        </div>
                        <div className="grid grid-cols-9 gap-1.5 p-2 bg-[#161617] border-2 border-[#141415]">
                          {inspectDetails.inventory?.items?.slice(0, 9).map((item: any, idx: number) => {
                            const isSelected = inspectDetails.inventory?.selectedSlot === idx;
                            return (
                              <div
                                key={idx}
                                className={isSelected ? 'ring-2 ring-[#55ff55] p-0.5' : ''}
                              >
                                {renderItemSlot(item, idx)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ENDER CHEST */}
                  {inspectTab === 'enderchest' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="p-4 bg-[#1e132b] border-2 border-[#3b1261] shadow-[inset_2px_2px_0_#531b87] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#3b1261] pb-2">
                          <h3 className="font-heading text-white text-xs flex items-center gap-2">
                            <Box className="w-4 h-4 text-[#ff55ff]" />
                            PERSONAL ENDER CHEST CONTAINER
                          </h3>
                          <span className="text-[10px] font-mono text-[#d8b4fe]">
                            27 Slots · Encrypted Cloud Vault
                          </span>
                        </div>

                        <div className="grid grid-cols-9 gap-1.5 p-3 bg-[#11071c] border-2 border-[#2b0c47]">
                          {inspectDetails.enderChest?.map((item: any, idx: number) =>
                            renderItemSlot(item, idx)
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Quick Action Bar */}
            <div className="p-3 bg-[#242425] border-t-4 border-[#141415] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleActionClick('teleport', inspectPlayer)}
                  className="mc-btn px-3 py-1 text-xs"
                >
                  TELEPORT
                </button>
                {inspectPlayer.isOp ? (
                  <button
                    onClick={() => handleActionClick('deop', inspectPlayer)}
                    className="mc-btn px-3 py-1 text-xs"
                  >
                    REVOKE OP
                  </button>
                ) : (
                  <button
                    onClick={() => handleActionClick('op', inspectPlayer)}
                    className="mc-btn px-3 py-1 text-xs bg-[#3c8527] text-white"
                  >
                    GRANT OP
                  </button>
                )}
                <button
                  onClick={() => handleActionClick('kill', inspectPlayer)}
                  className="mc-btn px-3 py-1 text-xs bg-[#a82323] text-white"
                >
                  KILL
                </button>
                <button
                  onClick={() => handleActionClick('kick', inspectPlayer)}
                  className="mc-btn px-3 py-1 text-xs"
                >
                  KICK
                </button>
                <button
                  onClick={() => handleActionClick('ban', inspectPlayer)}
                  className="mc-btn-danger px-3 py-1 text-xs"
                >
                  BAN
                </button>
              </div>

              <button
                onClick={() => {
                  setInspectPlayer(null);
                  setInspectDetails(null);
                }}
                className="mc-btn px-4 py-1 text-xs"
              >
                CLOSE INSPECTOR
              </button>
            </div>
          </div>
        </div>
      )}

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
