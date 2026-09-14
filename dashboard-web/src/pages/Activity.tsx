import React, { useEffect, useState } from 'react';
import {
  Clock,
  Search,
  Filter,
  Users,
  Shield,
  MessageSquare,
  Terminal,
  Skull,
  Award,
  Globe,
  Server,
  RefreshCw,
} from 'lucide-react';
import { useWebSocketData, ActivityItem } from '../contexts/WebSocketContext';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatTime } from '../services/format';

export const Activity: React.FC = () => {
  const { liveActivity } = useWebSocketData();
  const { addToast } = useToast();
  const [initialActivity, setInitialActivity] = useState<ActivityItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      const data = await api.getActivity({ limit: 100 });
      setInitialActivity(data || []);
    } catch (e) {
      addToast('error', 'Failed to fetch activity log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  // Merge live activity with initial activity
  const allEvents = React.useMemo(() => {
    const seen = new Set<number>();
    const list: ActivityItem[] = [];
    for (const item of [...liveActivity, ...initialActivity]) {
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        list.push(item);
      }
    }
    return list;
  }, [liveActivity, initialActivity]);

  const filteredEvents = React.useMemo(() => {
    return allEvents.filter((item) => {
      const matchesCategory =
        categoryFilter === 'ALL' || item.category.toUpperCase() === categoryFilter.toUpperCase();
      const matchesSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allEvents, categoryFilter, search]);

  const getCategoryIcon = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'PLAYER_ACTION':
      case 'PLAYER':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'LUCKPERMS':
      case 'PERMISSION':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'CHAT':
        return <MessageSquare className="w-4 h-4 text-brand-400" />;
      case 'COMMAND':
        return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'DEATH':
        return <Skull className="w-4 h-4 text-rose-400" />;
      case 'ADVANCEMENT':
        return <Award className="w-4 h-4 text-yellow-400" />;
      case 'WORLD':
      case 'DIMENSION':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'SERVER':
      default:
        return <Server className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Clock className="w-8 h-8 text-brand-400" />
              Activity Feed
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
              {filteredEvents.length} Events
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audit log of player events, admin commands, permission changes, and server lifecycle.
          </p>
        </div>

        <button
          onClick={fetchActivity}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-950/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {['ALL', 'PLAYER_ACTION', 'LUCKPERMS', 'CHAT', 'COMMAND', 'SERVER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'bg-dark-950/40 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {cat === 'PLAYER_ACTION' ? 'Players' : cat === 'LUCKPERMS' ? 'Permissions' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-slate-500 italic">No activity matching your search</div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
            {filteredEvents.map((evt) => (
              <div key={evt.id} className="relative group">
                {/* Dot */}
                <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-brand-400 border-2 border-dark-950 shadow-md group-hover:scale-125 transition-transform" />

                <div className="p-4 rounded-xl bg-dark-950/50 border border-white/5 hover:border-brand-500/30 transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-white/5 mt-0.5">
                      {getCategoryIcon(evt.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{evt.title}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                          {evt.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-mono">{evt.description}</p>
                    </div>
                  </div>

                  <span className="text-xs text-slate-500 font-mono flex-shrink-0">
                    {formatTime(evt.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
