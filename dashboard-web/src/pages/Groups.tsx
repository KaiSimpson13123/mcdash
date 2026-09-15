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

const COLORS = ['#55ff55', '#55ffff', '#ff5555', '#ffaa00', '#aa00aa', '#ffff55', '#ffffff'];

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
  const pieChartData = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({
      name,
      count,
    }));

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
      {/* Top Header */}
      <div className="mc-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-minecraft text-white">LuckPerms Groups</h1>
            <span className="px-2.5 py-1 text-xs font-minecraft bg-[#1c1c1c] text-[#55ff55] border-2 border-[#3c3c3c]">
              {groups.length} Configured
            </span>
          </div>
          <p className="text-xs text-[#a0a0a0] mt-1 font-minecraft">
            Group hierarchy, inheritance trees, prefixes, and online member distributions.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="mc-btn mc-btn-sm flex items-center gap-1.5 font-minecraft"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="mc-panel p-5 space-y-4">
          <h2 className="text-base font-minecraft text-white flex items-center gap-2 border-b border-[#1c1c1c] pb-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Active Player Share
          </h2>
          <div className="mc-slot p-3 h-64 w-full">
            {pieChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#777777] text-xs font-minecraft italic">
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
                    outerRadius={75}
                    label={(entry) => `${entry.name} (${entry.count})`}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="mc-panel p-5 space-y-4">
          <h2 className="text-base font-minecraft text-white flex items-center gap-2 border-b border-[#1c1c1c] pb-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            Group Member Breakdown
          </h2>
          <div className="mc-slot p-3 h-64 w-full">
            {barChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#777777] text-xs font-minecraft italic">
                No groups configured or LuckPerms not loaded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#2c2c2c" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#777777" fontSize={10} tickLine={false} />
                  <YAxis stroke="#777777" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#55ffff" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Visual Hierarchy Tree */}
      <div className="mc-panel p-5 space-y-4">
        <h2 className="text-base font-minecraft text-white flex items-center gap-2 border-b border-[#1c1c1c] pb-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Inheritance & Weight Hierarchy
        </h2>
        <div className="flex flex-col space-y-2">
          {hierarchyGroups.length === 0 ? (
            <div className="p-6 text-center text-[#777777] text-xs font-minecraft italic mc-slot">
              No group hierarchy loaded.
            </div>
          ) : (
            hierarchyGroups.map((grp, idx) => (
              <div
                key={grp.name}
                className="flex items-center gap-3 p-3 mc-slot hover:border-[#55ff55] transition-all"
                style={{ marginLeft: `${Math.min(idx * 16, 80)}px` }}
              >
                <ChevronRight className="w-4 h-4 text-[#55ff55] flex-shrink-0" />
                <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-minecraft text-white uppercase text-xs font-bold">{grp.name}</span>
                    {grp.prefix && (
                      <span className="text-xs">
                        <FormattedText text={grp.prefix} />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-minecraft">
                    <span className="px-2 py-0.5 bg-[#1e1e1e] text-[#aaaaaa] border border-[#333333]">
                      Weight: {grp.weight ?? 0}
                    </span>
                    <span className="text-[#888888]">
                      Parents: <span className="text-white">{(grp.parents || []).join(', ') || 'none'}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-[#1c1c1c] text-[#55ff55] border border-[#3c3c3c]">
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
      <div className="mc-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1c1c1c]">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mc-input w-full pl-9 pr-3 py-1 text-xs"
            />
          </div>
          <span className="text-xs text-[#888888] font-minecraft">{filteredGroups.length} groups found</span>
        </div>

        <div className="overflow-x-auto border-2 border-[#1c1c1c]">
          <table className="w-full text-left text-xs font-minecraft">
            <thead className="bg-[#1c1c1c] text-[#aaaaaa] uppercase tracking-wider border-b-2 border-[#2b2b2b]">
              <tr>
                <th className="px-4 py-3">Group Name</th>
                <th className="px-4 py-3">Prefix Preview</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Parent Groups</th>
                <th className="px-4 py-3 text-right">Online Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] bg-[#242424]">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#888888]">
                    <Shield className="w-8 h-8 text-[#555555] mx-auto mb-2" />
                    <p className="font-minecraft text-white">No groups found</p>
                    <p className="text-xs text-[#666666] mt-1 font-minecraft">
                      {search ? `No groups matching "${search}"` : 'No LuckPerms groups are loaded on this server.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g) => (
                  <tr key={g.name} className="hover:bg-[#2e2e2e] transition-colors">
                    <td className="px-4 py-3 font-minecraft text-white font-bold uppercase">{g.name}</td>
                    <td className="px-4 py-3">
                      {g.prefix ? <FormattedText text={g.prefix} /> : <span className="text-[#666666] italic">None</span>}
                    </td>
                    <td className="px-4 py-3 text-[#aaaaaa]">{g.weight ?? 0}</td>
                    <td className="px-4 py-3 text-[#aaaaaa]">
                      {(g.parents && g.parents.length > 0) ? g.parents.join(', ') : 'None'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block px-2 py-0.5 bg-[#1c1c1c] text-[#55ff55] border border-[#3c3c3c]">
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
