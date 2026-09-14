import React, { useEffect, useState } from 'react';
import {
  Globe,
  Sun,
  CloudRain,
  CloudLightning,
  Clock,
  Shield,
  Layers,
  Box,
  Compass,
  Square,
  Users,
  Ghost,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from '../components/Skeleton';

export const World: React.FC = () => {
  const { addToast } = useToast();
  const [worldData, setWorldData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorld = async () => {
    try {
      const data = await api.getWorld();
      setWorldData(data);
    } catch (e) {
      addToast('error', 'Failed to fetch world details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorld();
    const interval = setInterval(fetchWorld, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatWorldClock = (ticks?: number) => {
    if (ticks === undefined) return '06:00';
    const hours = Math.floor((ticks / 1000 + 6) % 24);
    const minutes = Math.floor(((ticks % 1000) / 1000) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const dimensions = worldData?.dimensions || [];
  const spawn = worldData?.spawnLocation || { x: 0, y: 64, z: 0 };
  const border = worldData?.worldBorder || { centerX: 0, centerZ: 0, size: 60000000 };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">World Status</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 capitalize">
              {worldData?.difficulty || 'Normal'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Global world metadata, dimension tracking, chunk statistics, and world border details.
          </p>
        </div>

        <button
          onClick={fetchWorld}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Global World Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Day & Clock</p>
            <h3 className="text-xl font-bold text-white mt-0.5">Day {worldData?.dayCount || 0}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{formatWorldClock(worldData?.worldTime)}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {worldData?.weather === 'THUNDER' ? (
              <CloudLightning className="w-6 h-6" />
            ) : worldData?.weather === 'RAIN' ? (
              <CloudRain className="w-6 h-6" />
            ) : (
              <Sun className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Weather System</p>
            <h3 className="text-xl font-bold text-white mt-0.5 capitalize">{worldData?.weather?.toLowerCase() || 'Clear'}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Overworld Conditions</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Loaded Chunks</p>
            <h3 className="text-xl font-bold text-white mt-0.5 font-mono">
              {(worldData?.loadedChunks || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Across all dimensions</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Ghost className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Entities / Mobs</p>
            <h3 className="text-xl font-bold text-white mt-0.5 font-mono">
              {(worldData?.entityCount || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{(worldData?.mobCount || 0).toLocaleString()} active mobs</p>
          </div>
        </div>
      </div>

      {/* World Seed, Spawn, and Border Information */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Globe className="w-4 h-4 text-emerald-400" /> World Seed
          </div>
          <p className="text-lg font-mono font-bold text-white break-all">Redacted</p>
          <p className="text-xs text-slate-500">World generation seed</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Compass className="w-4 h-4 text-brand-400" /> World Spawn
          </div>
          <p className="text-lg font-mono font-bold text-white">
            Redacted
          </p>
          <p className="text-xs text-slate-500">Default spawn point for new players</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Square className="w-4 h-4 text-amber-400" /> World Border
          </div>
          <p className="text-lg font-mono font-bold text-white">
            {Math.round(border.size).toLocaleString()} blocks diameter
          </p>
          <p className="text-xs text-slate-500">
            Global border boundary
          </p>
        </div>
      </div>

      {/* Dimension Cards */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-400" />
          Dimension Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dimensions.map((dim: any) => {
            const isOverworld = dim.id.includes('overworld');
            const isNether = dim.id.includes('the_nether');
            const isEnd = dim.id.includes('the_end');

            const gradientClass = isOverworld
              ? 'from-emerald-950/40 to-dark-900/80 border-emerald-500/20'
              : isNether
                ? 'from-rose-950/40 to-dark-900/80 border-rose-500/20'
                : 'from-purple-950/40 to-dark-900/80 border-purple-500/20';

            const accentColor = isOverworld ? 'text-emerald-400' : isNether ? 'text-rose-400' : 'text-purple-400';

            return (
              <div
                key={dim.id}
                className={`glass-card p-6 rounded-2xl border bg-gradient-to-b ${gradientClass} space-y-5 transition-transform hover:-translate-y-1 duration-200`}
              >
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-extrabold tracking-tight ${accentColor}`}>{dim.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-950/80 border border-white/5 text-slate-400">
                    {dim.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Players
                    </p>
                    <p className="text-xl font-bold text-white font-mono">{dim.players}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Chunks
                    </p>
                    <p className="text-xl font-bold text-white font-mono">{dim.loadedChunks}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5" /> Entities
                    </p>
                    <p className="text-xl font-bold text-white font-mono">{dim.entities}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-950/60 border border-white/5 space-y-1">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Ghost className="w-3.5 h-3.5" /> Mobs
                    </p>
                    <p className="text-xl font-bold text-white font-mono">{dim.mobs}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
