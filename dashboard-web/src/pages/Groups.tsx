import React, { useEffect, useState } from 'react';
import {
  Shield,
  Search,
  Users,
  ChevronRight,
  Sparkles,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FormattedText } from '../components/FormattedText';
import { Skeleton } from '../components/Skeleton';

interface GroupData {
  name: string;
  displayName?: string;
  weight: number;
  prefix?: string;
  suffix?: string;
  parents: string[];
  memberCount: number;
}

const COLORS = ['#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export const Groups: React.FC = () => {
  const { addToast } = useToast();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [groupsData, distData] = await Promise.all([
        api.getGroups(),
        api.getGroupDistribution(),
      ]);
      setGroups(groupsData || []);
      setDistribution(distData || {});
    } catch (e: any) {
      addToast('error', 'Failed to load LuckPerms groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.displayName && g.displayName.toLowerCase().includes(search.toLowerCase()))
  );

  // Sort groups by weight descending for hierarchy view
  const hierarchyGroups = [...groups].sort((a, b) => (b.weight || 0) - (a.weight || 0));

  // Chart data preparation
  // Pie chart: only include active slices with count > 0 to prevent Recharts divide-by-zero SVG arc NaN crash
  const pieChartData = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({
      name,
      count,
    }));

  // Bar chart: shows all loaded groups and their current online member count
  const barChartData = groups.map((g) => ({
    name: g.displayName || g.name,
    count: g.memberCount || 0,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">LuckPerms Groups</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {groups.length} Configured
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Group hierarchy, inheritance trees, prefixes, and online member distributions.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            Active Player Share
          </h2>
          <div className="h-64 w-full">
            {pieChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                No online players currently assigned to groups
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name} (${entry.count})`}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      color: '#fff',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            Group Member Breakdown
          </h2>
          <div className="h-64 w-full">
            {barChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                No groups configured or LuckPerms not loaded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.75rem',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Visual Hierarchy Tree */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Inheritance & Weight Hierarchy
        </h2>
        <div className="flex flex-col space-y-2">
          {hierarchyGroups.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm italic bg-dark-950/20 rounded-xl">
              No group hierarchy loaded.
            </div>
          ) : (
            hierarchyGroups.map((grp, idx) => (
              <div
                key={grp.name}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-dark-950/40 border border-white/5 hover:border-brand-500/20 transition-all"
                style={{ marginLeft: `${Math.min(idx * 20, 100)}px` }}
              >
                <ChevronRight className="w-4 h-4 text-brand-400 flex-shrink-0" />
                <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase text-sm">{grp.name}</span>
                    {grp.prefix && (
                      <span className="text-xs">
                        <FormattedText text={grp.prefix} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      Weight: {grp.weight ?? 0}
                    </span>
                    <span className="text-slate-400">
                      Parents: <span className="font-mono text-white">{(grp.parents || []).join(', ') || 'none'}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                      {grp.memberCount ?? 0} Online
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Search & Groups Table */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-dark-950 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">{filteredGroups.length} groups found</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-dark-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Group Name</th>
                <th className="px-4 py-4">Prefix Preview</th>
                <th className="px-4 py-4">Weight</th>
                <th className="px-4 py-4">Parent Groups</th>
                <th className="px-6 py-4 text-right">Online Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium text-white">No groups found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search ? `No groups matching "${search}"` : 'No LuckPerms groups are loaded on this server.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g) => (
                  <tr key={g.name} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white uppercase">{g.name}</td>
                    <td className="px-4 py-4">
                      {g.prefix ? <FormattedText text={g.prefix} /> : <span className="text-slate-500 italic">None</span>}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">{g.weight ?? 0}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-400">
                      {(g.parents && g.parents.length > 0) ? g.parents.join(', ') : 'None'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-bold">
                        {g.memberCount ?? 0}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
