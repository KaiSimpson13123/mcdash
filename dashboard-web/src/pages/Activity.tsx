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
        return <MessageSquare className="w-4 h-4 text-[#55ffff]" />;
      case 'COMMAND':
        return <Terminal className="w-4 h-4 text-[#ffaa00]" />;
      case 'DEATH':
        return <Skull className="w-4 h-4 text-[#ff5555]" />;
      case 'ADVANCEMENT':
        return <Award className="w-4 h-4 text-[#ffff55]" />;
      case 'WORLD':
      case 'DIMENSION':
        return <Globe className="w-4 h-4 text-[#55ffff]" />;
      case 'SERVER':
      default:
        return <Server className="w-4 h-4 text-[#aaaaaa]" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="mc-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-minecraft text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-[#55ff55]" />
              Activity Feed
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-minecraft bg-[#1c1c1c] text-[#55ff55] border-2 border-[#3c3c3c]">
              {filteredEvents.length} Events
            </span>
          </div>
          <p className="text-xs text-[#a0a0a0] mt-1 font-minecraft">
            Real-time audit log of player events, admin commands, permission changes, and server lifecycle.
          </p>
        </div>

        <button
          onClick={fetchActivity}
          className="mc-btn mc-btn-sm flex items-center gap-1.5 font-minecraft"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="mc-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activity events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mc-input w-full pl-9 pr-3 py-1.5 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#888888] mr-1" />
          {['ALL', 'PLAYER_ACTION', 'LUCKPERMS', 'CHAT', 'COMMAND', 'SERVER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-minecraft transition-all ${
                categoryFilter === cat
                  ? 'mc-btn mc-btn-primary'
                  : 'mc-btn mc-btn-sm text-[#aaaaaa]'
              }`}
            >
              {cat === 'PLAYER_ACTION' ? 'Players' : cat === 'LUCKPERMS' ? 'Permissions' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="mc-panel p-5 space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-[#777777] text-xs font-minecraft italic">
            No activity matching your search
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="mc-slot p-3 flex items-start justify-between gap-4 hover:border-[#55ff55] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#1c1c1c] border-2 border-[#333333] flex-shrink-0 mt-0.5">
                    {getCategoryIcon(evt.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-minecraft text-white font-bold">{evt.title}</span>
                      <span className="px-1.5 py-0.5 bg-[#181818] border border-[#333333] text-[9px] font-minecraft text-[#aaaaaa] uppercase">
                        {evt.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#b0b0b0] mt-1 font-minecraft font-mono">{evt.description}</p>
                  </div>
                </div>

                <span className="text-[10px] text-[#777777] font-minecraft flex-shrink-0">
                  {formatTime(evt.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
