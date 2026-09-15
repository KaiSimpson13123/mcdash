import React, { useEffect, useState } from 'react';
import {
  Globe,
  Sun,
  CloudRain,
  CloudLightning,
  Clock,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const dimensions = worldData?.dimensions || [];
  const border = worldData?.worldBorder || { centerX: 0, centerZ: 0, size: 60000000 };

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2e2f30] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading tracking-wide text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-[#55ffff]" />
              WORLD DIAGNOSTICS
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-heading bg-[#1e3816] text-[#55ff55] border border-[#11240c] uppercase">
              {worldData?.difficulty || 'Normal'}
            </span>
          </div>
          <p className="text-xs font-mono text-[#aaaaaa] mt-1">
            Environment metadata, dimension chunk stats, mob counts, and world border telemetry.
          </p>
        </div>

        <button
          onClick={fetchWorld}
          className="mc-btn px-3 py-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          REFRESH
        </button>
      </div>

      {/* Global World Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#ffaa00]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-heading text-[#aaaaaa]">DAY & CLOCK</p>
            <h3 className="text-xl font-heading text-white">Day {worldData?.dayCount || 0}</h3>
            <p className="text-[10px] font-mono text-[#888]">{formatWorldClock(worldData?.worldTime)}</p>
          </div>
        </div>

        <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#55ffff]">
            {worldData?.weather === 'THUNDER' ? (
              <CloudLightning className="w-5 h-5 text-[#a855f7]" />
            ) : worldData?.weather === 'RAIN' ? (
              <CloudRain className="w-5 h-5 text-[#55ffff]" />
            ) : (
              <Sun className="w-5 h-5 text-[#ffaa00]" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-heading text-[#aaaaaa]">WEATHER CONDITION</p>
            <h3 className="text-xl font-heading text-white uppercase">{worldData?.weather || 'CLEAR'}</h3>
            <p className="text-[10px] font-mono text-[#888]">Atmosphere State</p>
          </div>
        </div>

        <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#55ff55]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-heading text-[#aaaaaa]">LOADED CHUNKS</p>
            <h3 className="text-xl font-heading text-white font-mono">
              {(worldData?.loadedChunks || 0).toLocaleString()}
            </h3>
            <p className="text-[10px] font-mono text-[#888]">Across all dimensions</p>
          </div>
        </div>

        <div className="bg-[#313233] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e1e1f] border-2 border-[#141415] flex items-center justify-center text-[#ff55ff]">
            <Ghost className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-heading text-[#aaaaaa]">ACTIVE ENTITIES</p>
            <h3 className="text-xl font-heading text-white font-mono">
              {(worldData?.entityCount || 0).toLocaleString()}
            </h3>
            <p className="text-[10px] font-mono text-[#888]">{(worldData?.mobCount || 0).toLocaleString()} active mobs</p>
          </div>
        </div>
      </div>

      {/* World Seed, Spawn, and Border Information */}
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-heading text-[#55ff55]">
            <Globe className="w-4 h-4" /> WORLD SEED
          </div>
          <p className="text-sm font-mono text-white break-all">Active Generator</p>
          <p className="text-[10px] font-mono text-[#888]">Minecraft world seed</p>
        </div>

        <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-heading text-[#ffaa00]">
            <Compass className="w-4 h-4" /> WORLD SPAWN
          </div>
          <p className="text-sm font-mono text-white">Default Spawnpoint</p>
          <p className="text-[10px] font-mono text-[#888]">Primary respawn coordinates</p>
        </div>

        <div className="p-3 bg-[#1a1a1b] border-2 border-[#141415] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-heading text-[#55ffff]">
            <Square className="w-4 h-4" /> WORLD BORDER
          </div>
          <p className="text-sm font-mono text-white">
            {Math.round(border.size).toLocaleString()} blocks diameter
          </p>
          <p className="text-[10px] font-mono text-[#888]">Server boundary size</p>
        </div>
      </div>

      {/* Dimension Breakdown */}
      <div>
        <h2 className="text-lg font-heading text-white mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#55ff55]" />
          DIMENSIONS OVERVIEW
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dimensions.map((dim: any) => {
            const isOverworld = dim.id.includes('overworld');
            const isNether = dim.id.includes('the_nether');
            const dimBorder = isOverworld ? 'border-[#3c8527]' : isNether ? 'border-[#a82323]' : 'border-[#7345e5]';
            const dimTitleColor = isOverworld ? 'text-[#55ff55]' : isNether ? 'text-[#ff5555]' : 'text-[#ff55ff]';

            return (
              <div
                key={dim.id}
                className={`bg-[#313233] border-4 ${dimBorder} shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#141415] p-5 space-y-4`}
              >
                <div className="flex items-center justify-between border-b-2 border-[#222223] pb-2">
                  <h3 className={`text-base font-heading ${dimTitleColor}`}>{dim.name}</h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#1a1a1b] border border-[#141415] text-[#888]">
                    {dim.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-[#1a1a1b] border-2 border-[#141415] space-y-0.5">
                    <p className="text-[10px] font-heading text-[#aaaaaa] flex items-center gap-1">
                      <Users className="w-3 h-3" /> PLAYERS
                    </p>
                    <p className="text-lg font-heading text-white">{dim.players}</p>
                  </div>

                  <div className="p-2.5 bg-[#1a1a1b] border-2 border-[#141415] space-y-0.5">
                    <p className="text-[10px] font-heading text-[#aaaaaa] flex items-center gap-1">
                      <Layers className="w-3 h-3" /> CHUNKS
                    </p>
                    <p className="text-lg font-heading text-white">{dim.loadedChunks}</p>
                  </div>

                  <div className="p-2.5 bg-[#1a1a1b] border-2 border-[#141415] space-y-0.5">
                    <p className="text-[10px] font-heading text-[#aaaaaa] flex items-center gap-1">
                      <Box className="w-3 h-3" /> ENTITIES
                    </p>
                    <p className="text-lg font-heading text-white">{dim.entities}</p>
                  </div>

                  <div className="p-2.5 bg-[#1a1a1b] border-2 border-[#141415] space-y-0.5">
                    <p className="text-[10px] font-heading text-[#aaaaaa] flex items-center gap-1">
                      <Ghost className="w-3 h-3" /> MOBS
                    </p>
                    <p className="text-lg font-heading text-white">{dim.mobs}</p>
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
