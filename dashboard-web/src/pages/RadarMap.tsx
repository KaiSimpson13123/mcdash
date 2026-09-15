import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Compass,
  Crosshair,
  MapPin,
  Users,
  Globe,
  Flame,
  Moon,
  Plus,
  Minus,
  Maximize2,
  RefreshCw,
  Navigation,
  Shield,
  Layers,
  Trash2,
  Send,
  Radio,
  Sliders,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api, MapDataResponse, MapPlayer, MapWaypoint, MapDimension } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from '../components/Skeleton';
import { ConfirmModal } from '../components/ConfirmModal';

export const RadarMap: React.FC = () => {
  const { addToast } = useToast();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [activeDimension, setActiveDimension] = useState<string>('minecraft:overworld');
  const [selectedPlayer, setSelectedPlayer] = useState<MapPlayer | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<MapPlayer | null>(null);

  // Camera State (world units)
  const [camera, setCamera] = useState<{ x: number; z: number; zoom: number }>({
    x: 0,
    z: 0,
    zoom: 0.5, // 0.5 pixels per Minecraft block
  });

  // Cursor coordinates
  const [cursorWorld, setCursorWorld] = useState<{ x: number; z: number } | null>(null);

  // Layer Toggles
  const [layers, setLayers] = useState({
    grid: true,
    chunks: true,
    worldBorder: true,
    viewCones: true,
    playerLabels: true,
    waypoints: true,
    radarPulse: true,
  });
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Context Click Popup (Click on map to teleport/waypoint)
  const [clickCoord, setClickCoord] = useState<{ x: number; z: number; screenX: number; screenY: number } | null>(null);

  // Waypoint Modal
  const [waypointModalOpen, setWaypointModalOpen] = useState(false);
  const [newWpName, setNewWpName] = useState('');
  const [newWpColor, setNewWpColor] = useState('#10b981');

  // Teleport Modal
  const [teleportModalOpen, setTeleportModalOpen] = useState(false);
  const [teleportTargetUuid, setTeleportTargetUuid] = useState('');
  const [teleportCoords, setTeleportCoords] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 64, z: 0 });

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; camX: number; camZ: number }>({
    mouseX: 0,
    mouseY: 0,
    camX: 0,
    camZ: 0,
  });

  // Sonar pulse animation ticker
  const [pulseRadius, setPulseRadius] = useState<number>(0);

  // Fetch Map Data
  const fetchMapData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await api.getMapData(activeDimension);
      setMapData(data);
    } catch (e: any) {
      if (!isSilent) {
        addToast('error', e?.message || 'Failed to fetch tactical radar telemetry');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeDimension, addToast]);

  // Initial load and polling
  useEffect(() => {
    fetchMapData();
    const interval = setInterval(() => {
      fetchMapData(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  // Sonar radar pulse animation loop
  useEffect(() => {
    let frameId: number;
    let start = performance.now();
    const animate = (time: number) => {
      const elapsed = (time - start) % 2400;
      setPulseRadius((elapsed / 2400) * 80);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Filter players in current dimension
  const currentDimensionPlayers = useMemo(() => {
    if (!mapData?.players) return [];
    return mapData.players.filter((p) => p.dimension === activeDimension);
  }, [mapData, activeDimension]);

  // Filter waypoints in current dimension
  const currentDimensionWaypoints = useMemo(() => {
    if (!mapData?.waypoints) return [];
    return mapData.waypoints.filter((wp) => wp.dimension === activeDimension);
  }, [mapData, activeDimension]);

  // Current dimension metadata
  const currentDimInfo = useMemo(() => {
    return mapData?.dimensions?.find((d) => d.id === activeDimension) || null;
  }, [mapData, activeDimension]);

  // World to Screen transformation
  const worldToScreen = useCallback(
    (wx: number, wz: number, width: number, height: number) => {
      const sx = (wx - camera.x) * camera.zoom + width / 2;
      const sy = (wz - camera.z) * camera.zoom + height / 2;
      return { x: sx, y: sy };
    },
    [camera]
  );

  // Screen to World transformation
  const screenToWorld = useCallback(
    (sx: number, sy: number, width: number, height: number) => {
      const wx = (sx - width / 2) / camera.zoom + camera.x;
      const wz = (sy - height / 2) / camera.zoom + camera.z;
      return { x: Math.round(wx), z: Math.round(wz) };
    },
    [camera]
  );

  // Focus on Spawn
  const handleFocusSpawn = () => {
    const spawn = currentDimInfo?.spawn || { x: 0, z: 0 };
    setCamera((prev) => ({ ...prev, x: spawn.x, z: spawn.z, zoom: 0.8 }));
  };

  // Focus on Player
  const handleFocusPlayer = (p: MapPlayer) => {
    setSelectedPlayer(p);
    setCamera((prev) => ({ ...prev, x: p.x, z: p.z, zoom: 1.2 }));
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Clear background
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, width, height);

    // Dimension specific subtle gradient
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.8);
    if (activeDimension === 'minecraft:the_nether') {
      bgGrad.addColorStop(0, 'rgba(127, 29, 29, 0.12)');
      bgGrad.addColorStop(1, 'rgba(15, 16, 18, 0.95)');
    } else if (activeDimension === 'minecraft:the_end') {
      bgGrad.addColorStop(0, 'rgba(88, 28, 135, 0.12)');
      bgGrad.addColorStop(1, 'rgba(15, 16, 18, 0.95)');
    } else {
      bgGrad.addColorStop(0, 'rgba(16, 185, 129, 0.06)');
      bgGrad.addColorStop(1, 'rgba(15, 16, 18, 0.95)');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Calculate visible bounds in world coordinates
    const topLeft = screenToWorld(0, 0, width, height);
    const bottomRight = screenToWorld(width, height, width, height);

    // 2. Render Chunk Grid (16x16) if enabled and zoom is close enough
    if (layers.chunks && camera.zoom > 0.5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const startChunkX = Math.floor(topLeft.x / 16) * 16;
      const endChunkX = Math.ceil(bottomRight.x / 16) * 16;
      const startChunkZ = Math.floor(topLeft.z / 16) * 16;
      const endChunkZ = Math.ceil(bottomRight.z / 16) * 16;

      ctx.beginPath();
      for (let wx = startChunkX; wx <= endChunkX; wx += 16) {
        const sx = (wx - camera.x) * camera.zoom + width / 2;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let wz = startChunkZ; wz <= endChunkZ; wz += 16) {
        const sy = (wz - camera.z) * camera.zoom + height / 2;
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }

    // 3. Render Coordinate Grid (100 blocks & 500 blocks)
    if (layers.grid) {
      // 100 block sub-grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const start100X = Math.floor(topLeft.x / 100) * 100;
      const end100X = Math.ceil(bottomRight.x / 100) * 100;
      const start100Z = Math.floor(topLeft.z / 100) * 100;
      const end100Z = Math.ceil(bottomRight.z / 100) * 100;

      ctx.beginPath();
      for (let wx = start100X; wx <= end100X; wx += 100) {
        const sx = (wx - camera.x) * camera.zoom + width / 2;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let wz = start100Z; wz <= end100Z; wz += 100) {
        const sy = (wz - camera.z) * camera.zoom + height / 2;
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();

      // 500 block major grid + labels
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '10px monospace';
      const start500X = Math.floor(topLeft.x / 500) * 500;
      const end500X = Math.ceil(bottomRight.x / 500) * 500;
      const start500Z = Math.floor(topLeft.z / 500) * 500;
      const end500Z = Math.ceil(bottomRight.z / 500) * 500;

      for (let wx = start500X; wx <= end500X; wx += 500) {
        const sx = (wx - camera.x) * camera.zoom + width / 2;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
        ctx.fillText(`X: ${wx}`, sx + 4, 14);
      }
      for (let wz = start500Z; wz <= end500Z; wz += 500) {
        const sy = (wz - camera.z) * camera.zoom + height / 2;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
        ctx.fillText(`Z: ${wz}`, 6, sy - 4);
      }

      // Origin Axes (X=0 and Z=0)
      const originScreen = worldToScreen(0, 0, width, height);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 1.5;
      // Z-axis (vertical line at X=0)
      ctx.beginPath();
      ctx.moveTo(originScreen.x, 0);
      ctx.lineTo(originScreen.x, height);
      ctx.stroke();
      // X-axis (horizontal line at Z=0)
      ctx.beginPath();
      ctx.moveTo(0, originScreen.y);
      ctx.lineTo(width, originScreen.y);
      ctx.stroke();

      // Origin Center Crosshair
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('(0, 0)', originScreen.x + 8, originScreen.y - 8);
    }

    // 4. Render World Border
    if (layers.worldBorder && currentDimInfo?.worldBorder) {
      const { centerX, centerZ, size } = currentDimInfo.worldBorder;
      const halfSize = size / 2;
      const minScreen = worldToScreen(centerX - halfSize, centerZ - halfSize, width, height);
      const borderPx = size * camera.zoom;

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(minScreen.x, minScreen.y, borderPx, borderPx);
      ctx.setLineDash([]);

      // Subtle fill beyond or at border edge
      ctx.fillStyle = 'rgba(239, 68, 68, 0.03)';
      ctx.fillRect(minScreen.x, minScreen.y, borderPx, borderPx);

      ctx.fillStyle = '#ef4444';
      ctx.font = '10px monospace';
      ctx.fillText(`WORLD BORDER (${Math.round(size)}m)`, minScreen.x + 8, minScreen.y + 16);
    }

    // 5. Render Waypoints
    if (layers.waypoints) {
      currentDimensionWaypoints.forEach((wp) => {
        const s = worldToScreen(wp.x, wp.z, width, height);
        if (s.x < -50 || s.x > width + 50 || s.y < -50 || s.y > height + 50) return;

        // Draw pin
        ctx.fillStyle = wp.color || '#3b82f6';
        ctx.beginPath();
        // Diamond marker
        ctx.moveTo(s.x, s.y - 8);
        ctx.lineTo(s.x + 6, s.y);
        ctx.lineTo(s.x, s.y + 8);
        ctx.lineTo(s.x - 6, s.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(wp.name, s.x + 10, s.y + 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(`(${wp.x}, ${wp.z})`, s.x + 10, s.y + 15);
      });
    }

    // 6. Render Active Players
    currentDimensionPlayers.forEach((player) => {
      const s = worldToScreen(player.x, player.z, width, height);
      if (s.x < -100 || s.x > width + 100 || s.y < -100 || s.y > height + 100) return;

      const isSelected = selectedPlayer?.uuid === player.uuid;
      const isHovered = hoveredPlayer?.uuid === player.uuid;

      // Sonar Radar Wave Pulse
      if (layers.radarPulse) {
        ctx.strokeStyle = player.isOp ? 'rgba(234, 179, 8, 0.4)' : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Directional Field of View Cone (Yaw)
      if (layers.viewCones) {
        const radYaw = ((player.yaw + 90) * Math.PI) / 180;
        const fovAngle = Math.PI / 4; // 45 degree cone
        const coneLength = 36;

        ctx.fillStyle = player.isOp ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, coneLength, radYaw - fovAngle / 2, radYaw + fovAngle / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = player.isOp ? 'rgba(234, 179, 8, 0.5)' : 'rgba(16, 185, 129, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Player Marker Blip
      ctx.save();
      ctx.shadowColor = player.isOp ? '#eab308' : '#10b981';
      ctx.shadowBlur = isSelected ? 16 : 8;

      ctx.fillStyle = player.isOp ? '#eab308' : '#10b981';
      ctx.beginPath();
      ctx.arc(s.x, s.y, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Heading indicator tip
      const tipYaw = ((player.yaw + 90) * Math.PI) / 180;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(tipYaw) * 12, s.y + Math.sin(tipYaw) * 12);
      ctx.stroke();

      // Player Tag
      if (layers.playerLabels || isSelected || isHovered) {
        ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
        ctx.strokeStyle = isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        const labelText = player.username;
        ctx.font = 'bold 11px sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        const padX = 6;
        const boxW = textWidth + padX * 2;
        const boxH = 20;
        const boxX = s.x - boxW / 2;
        const boxY = s.y - 28;

        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, boxX + padX, boxY + 14);
      }
    });
  }, [
    camera,
    layers,
    activeDimension,
    currentDimensionPlayers,
    currentDimensionWaypoints,
    currentDimInfo,
    selectedPlayer,
    hoveredPlayer,
    pulseRadius,
    worldToScreen,
    screenToWorld,
  ]);

  // Mouse Handlers for Pan & Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      // Left click
      isDraggingRef.current = true;
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        camX: camera.x,
        camZ: camera.z,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Update cursor world coordinates
    const worldCoords = screenToWorld(sx, sy, rect.width, rect.height);
    setCursorWorld(worldCoords);

    // Pan camera if dragging
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setCamera((prev) => ({
        ...prev,
        x: dragStartRef.current.camX - dx / prev.zoom,
        z: dragStartRef.current.camZ - dy / prev.zoom,
      }));
      return;
    }

    // Check hovered player
    let found: MapPlayer | null = null;
    for (const p of currentDimensionPlayers) {
      const s = worldToScreen(p.x, p.z, rect.width, rect.height);
      const dist = Math.hypot(sx - s.x, sy - s.y);
      if (dist <= 14) {
        found = p;
        break;
      }
    }
    setHoveredPlayer(found);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = Math.abs(e.clientX - dragStartRef.current.mouseX);
      const dy = Math.abs(e.clientY - dragStartRef.current.mouseY);
      isDraggingRef.current = false;
      if (dx > 4 || dy > 4) {
        return; // Dragged, not a click
      }
    }

    // Clicked!
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Did we click a player?
    for (const p of currentDimensionPlayers) {
      const s = worldToScreen(p.x, p.z, rect.width, rect.height);
      const dist = Math.hypot(sx - s.x, sy - s.y);
      if (dist <= 14) {
        setSelectedPlayer(p);
        setClickCoord(null);
        return;
      }
    }

    // Otherwise, click coordinate popover
    const world = screenToWorld(sx, sy, rect.width, rect.height);
    setClickCoord({
      x: world.x,
      z: world.z,
      screenX: e.clientX,
      screenY: e.clientY,
    });
  };

  // Zoom Handler (Scroll wheel centered on cursor)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;
    setCamera((prev) => {
      const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.05), 4.0);
      // Zoom centered at cursor:
      const worldXBefore = (mouseX - rect.width / 2) / prev.zoom + prev.x;
      const worldZBefore = (mouseY - rect.height / 2) / prev.zoom + prev.z;
      const newCamX = worldXBefore - (mouseX - rect.width / 2) / newZoom;
      const newCamZ = worldZBefore - (mouseY - rect.height / 2) / newZoom;
      return {
        x: newCamX,
        z: newCamZ,
        zoom: newZoom,
      };
    });
  };

  // Create Waypoint
  const handleSaveWaypoint = async () => {
    if (!newWpName.trim()) {
      addToast('error', 'Please enter a waypoint name');
      return;
    }
    try {
      await api.createMapWaypoint({
        name: newWpName.trim(),
        x: clickCoord?.x ?? 0,
        z: clickCoord?.z ?? 0,
        dimension: activeDimension,
        color: newWpColor,
      });
      addToast('success', `Waypoint "${newWpName}" created`);
      setWaypointModalOpen(false);
      setNewWpName('');
      setClickCoord(null);
      fetchMapData(true);
    } catch (e: any) {
      addToast('error', e?.message || 'Failed to create waypoint');
    }
  };

  // Delete Waypoint
  const handleDeleteWaypoint = async (id: string, name: string) => {
    try {
      await api.deleteMapWaypoint(id);
      addToast('success', `Waypoint "${name}" deleted`);
      fetchMapData(true);
    } catch (e: any) {
      addToast('error', e?.message || 'Failed to delete waypoint');
    }
  };

  // Execute Teleport
  const handleExecuteTeleport = async () => {
    if (!teleportTargetUuid) {
      addToast('error', 'Select a player to teleport');
      return;
    }
    try {
      await api.teleportOnMap({
        uuid: teleportTargetUuid,
        x: teleportCoords.x,
        y: teleportCoords.y,
        z: teleportCoords.z,
        dimension: activeDimension,
      });
      addToast('success', 'Tactical teleportation executed');
      setTeleportModalOpen(false);
      setClickCoord(null);
      fetchMapData(true);
    } catch (e: any) {
      addToast('error', e?.message || 'Teleport failed');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] select-none">
      {/* Top Tactical Command Bar */}
      <div className="bg-[#1f2022] border-b-2 border-[#141415] p-3 shadow-md flex flex-wrap items-center justify-between gap-3 z-10">
        {/* Left: Title & Sudo Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#10b981]/20 border border-[#10b981] flex items-center justify-center text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-sm text-white tracking-wider flex items-center gap-1.5">
                TACTICAL RADAR
              </h1>
              <span className="bg-emerald-950/80 text-[#55ff55] border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.5 tracking-wider uppercase flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" /> CLASSIFIED SUDO
              </span>
            </div>
            <p className="text-[11px] text-[#aaaaaa] font-mono">
              Live orbital spatial telemetry & precision coordinate interception
            </p>
          </div>
        </div>

        {/* Center: Dimension Selector */}
        <div className="flex items-center bg-[#141415] p-1 border border-[#333] space-x-1">
          <button
            onClick={() => setActiveDimension('minecraft:overworld')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-heading transition-none ${
              activeDimension === 'minecraft:overworld'
                ? 'bg-[#3c8527] text-white shadow-[inset_1px_1px_0_#5db53b]'
                : 'text-[#888] hover:text-white hover:bg-[#252627]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>OVERWORLD</span>
          </button>
          <button
            onClick={() => setActiveDimension('minecraft:the_nether')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-heading transition-none ${
              activeDimension === 'minecraft:the_nether'
                ? 'bg-[#b91c1c] text-white shadow-[inset_1px_1px_0_#ef4444]'
                : 'text-[#888] hover:text-white hover:bg-[#252627]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>THE NETHER</span>
          </button>
          <button
            onClick={() => setActiveDimension('minecraft:the_end')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-heading transition-none ${
              activeDimension === 'minecraft:the_end'
                ? 'bg-[#7e22ce] text-white shadow-[inset_1px_1px_0_#a855f7]'
                : 'text-[#888] hover:text-white hover:bg-[#252627]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>THE END</span>
          </button>
        </div>

        {/* Right: Telemetry & Controls */}
        <div className="flex items-center space-x-2">
          {/* Cursor readout */}
          <div className="hidden md:flex items-center space-x-2 bg-[#141415] px-2.5 py-1.5 border border-[#333] text-xs font-mono text-[#55ff55]">
            <Crosshair className="w-3.5 h-3.5 text-[#888]" />
            <span>
              {cursorWorld ? `X: ${cursorWorld.x} · Z: ${cursorWorld.z}` : 'X: -- · Z: --'}
            </span>
          </div>

          {/* Layer toggles dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="bg-[#2a2b2c] hover:bg-[#333] text-white px-2.5 py-1.5 border border-[#444] text-xs flex items-center space-x-1.5"
              title="Display Layers"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>LAYERS</span>
            </button>
            {showLayerMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-[#1f2022] border-2 border-[#141415] shadow-xl p-2 z-50 text-xs font-mono space-y-1.5">
                <label className="flex items-center justify-between text-[#ccc] hover:text-white cursor-pointer py-0.5">
                  <span>Coord Grid</span>
                  <input
                    type="checkbox"
                    checked={layers.grid}
                    onChange={(e) => setLayers({ ...layers, grid: e.target.checked })}
                    className="accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[#ccc] hover:text-white cursor-pointer py-0.5">
                  <span>16x16 Chunks</span>
                  <input
                    type="checkbox"
                    checked={layers.chunks}
                    onChange={(e) => setLayers({ ...layers, chunks: e.target.checked })}
                    className="accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[#ccc] hover:text-white cursor-pointer py-0.5">
                  <span>World Border</span>
                  <input
                    type="checkbox"
                    checked={layers.worldBorder}
                    onChange={(e) => setLayers({ ...layers, worldBorder: e.target.checked })}
                    className="accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[#ccc] hover:text-white cursor-pointer py-0.5">
                  <span>Field of View</span>
                  <input
                    type="checkbox"
                    checked={layers.viewCones}
                    onChange={(e) => setLayers({ ...layers, viewCones: e.target.checked })}
                    className="accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[#ccc] hover:text-white cursor-pointer py-0.5">
                  <span>Player Labels</span>
                  <input
                    type="checkbox"
                    checked={layers.playerLabels}
                    onChange={(e) => setLayers({ ...layers, playerLabels: e.target.checked })}
                    className="accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[#ccc] hover:text-white cursor-pointer py-0.5">
                  <span>Waypoints</span>
                  <input
                    type="checkbox"
                    checked={layers.waypoints}
                    onChange={(e) => setLayers({ ...layers, waypoints: e.target.checked })}
                    className="accent-emerald-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[#ccc] hover:text-white cursor-pointer py-0.5">
                  <span>Sonar Pulse</span>
                  <input
                    type="checkbox"
                    checked={layers.radarPulse}
                    onChange={(e) => setLayers({ ...layers, radarPulse: e.target.checked })}
                    className="accent-emerald-500"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Zoom In / Out */}
          <div className="flex items-center bg-[#141415] border border-[#333]">
            <button
              onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.25, 4.0) }))}
              className="p-1.5 text-[#aaa] hover:text-white hover:bg-[#252627]"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-[#888]">
              {Math.round(camera.zoom * 100)}%
            </span>
            <button
              onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.max(prev.zoom * 0.8, 0.05) }))}
              className="p-1.5 text-[#aaa] hover:text-white hover:bg-[#252627]"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Action: Focus Spawn */}
          <button
            onClick={handleFocusSpawn}
            className="bg-[#2a2b2c] hover:bg-[#333] text-[#eab308] p-1.5 border border-[#444]"
            title="Center on Spawn"
          >
            <Navigation className="w-4 h-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchMapData(false)}
            className="bg-[#2a2b2c] hover:bg-[#333] text-white p-1.5 border border-[#444]"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport & Tactical HUD */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Canvas Engine */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Floating Quick Stats (Top Left of Canvas) */}
        <div className="absolute top-3 left-3 bg-[#18191a]/90 backdrop-blur border border-[#333] p-2.5 text-xs font-mono shadow-lg pointer-events-none space-y-1 z-10">
          <div className="flex items-center gap-2 text-white font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>
              {currentDimInfo?.name || 'Overworld'}
            </span>
          </div>
          <div className="text-[#888] text-[11px] space-y-0.5">
            <p>Active Chunks: <span className="text-[#55ff55]">{currentDimInfo?.loadedChunks ?? 0}</span></p>
            <p>Operatives in Sector: <span className="text-[#55ffff]">{currentDimensionPlayers.length}</span></p>
            <p>Camera: <span className="text-[#ccc]">{Math.round(camera.x)}, {Math.round(camera.z)}</span></p>
          </div>
        </div>

        {/* Click Coordinate Popover (Tactical Actions on Map) */}
        {clickCoord && (
          <div
            style={{
              position: 'fixed',
              left: Math.min(clickCoord.screenX + 10, window.innerWidth - 260),
              top: Math.min(clickCoord.screenY + 10, window.innerHeight - 180),
            }}
            className="w-60 bg-[#1e2022] border-2 border-[#10b981] shadow-2xl p-3 z-50 text-xs font-mono space-y-2 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-[#333] pb-1.5">
              <span className="text-[#55ff55] font-bold">
                SECTOR ({clickCoord.x}, {clickCoord.z})
              </span>
              <button
                onClick={() => setClickCoord(null)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => {
                  setTeleportCoords({ x: clickCoord.x, y: 64, z: clickCoord.z });
                  setTeleportModalOpen(true);
                }}
                className="w-full bg-[#3c8527] hover:bg-[#4f913c] text-white py-1 px-2 flex items-center space-x-1.5 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Teleport Player Here</span>
              </button>
              <button
                onClick={() => {
                  setNewWpName(`WP-${clickCoord.x}-${clickCoord.z}`);
                  setWaypointModalOpen(true);
                }}
                className="w-full bg-[#2563eb] hover:bg-[#3b82f6] text-white py-1 px-2 flex items-center space-x-1.5 text-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Save Waypoint Here</span>
              </button>
            </div>
          </div>
        )}

        {/* Right Drawer: Tactical Operatives & Waypoints HUD */}
        <div className="w-72 bg-[#18191b]/95 border-l-2 border-[#141415] shadow-2xl flex flex-col h-full z-10 backdrop-blur">
          {/* Drawer Header */}
          <div className="p-3 border-b border-[#2a2b2c] bg-[#141415]">
            <h2 className="text-xs font-heading text-white tracking-wider flex items-center justify-between">
              <span>OPERATIVES & WAYPOINTS</span>
              <span className="text-[10px] font-mono text-[#55ff55]">
                {currentDimensionPlayers.length} ONLINE
              </span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Player List */}
            <div>
              <p className="text-[10px] font-heading text-[#888] uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#55ff55]" />
                Tracked Operatives ({currentDimensionPlayers.length})
              </p>
              {currentDimensionPlayers.length === 0 ? (
                <div className="bg-[#121314] p-3 text-center border border-[#262729] text-[#777] text-xs font-mono">
                  No operatives detected in this dimension
                </div>
              ) : (
                <div className="space-y-1.5">
                  {currentDimensionPlayers.map((player) => (
                    <div
                      key={player.uuid}
                      onClick={() => handleFocusPlayer(player)}
                      className={`p-2 border cursor-pointer transition-none ${
                        selectedPlayer?.uuid === player.uuid
                          ? 'bg-[#2a3028] border-[#10b981] text-white'
                          : 'bg-[#1e1f21] border-[#2c2d30] text-[#ccc] hover:bg-[#252628] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-xs text-white flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              player.isOp ? 'bg-[#eab308]' : 'bg-[#10b981]'
                            }`}
                          />
                          {player.username}
                        </span>
                        <span className="text-[10px] font-mono text-[#55ffff]">
                          {player.ping}ms
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[#888]">
                        <span>
                          {player.x}, {player.y}, {player.z}
                        </span>
                        <span>{player.health} HP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waypoints List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-heading text-[#888] uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#38bdf8]" />
                  Tactical Waypoints ({currentDimensionWaypoints.length})
                </p>
                <button
                  onClick={() => {
                    setNewWpName(`Waypoint-${Math.floor(Math.random() * 1000)}`);
                    setClickCoord({
                      x: Math.round(camera.x),
                      z: Math.round(camera.z),
                      screenX: window.innerWidth / 2,
                      screenY: window.innerHeight / 2,
                    });
                    setWaypointModalOpen(true);
                  }}
                  className="text-[10px] text-[#38bdf8] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> ADD
                </button>
              </div>

              <div className="space-y-1.5">
                {currentDimensionWaypoints.map((wp) => (
                  <div
                    key={wp.id}
                    className="bg-[#1e1f21] border border-[#2c2d30] p-2 flex items-center justify-between"
                  >
                    <div
                      onClick={() => setCamera((prev) => ({ ...prev, x: wp.x, z: wp.z, zoom: 1.0 }))}
                      className="cursor-pointer flex-1"
                    >
                      <p className="text-xs font-heading text-white flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rotate-45"
                          style={{ backgroundColor: wp.color || '#3b82f6' }}
                        />
                        {wp.name}
                      </p>
                      <p className="text-[10px] font-mono text-[#888] mt-0.5">
                        X: {wp.x} · Z: {wp.z}
                      </p>
                    </div>
                    {!wp.isSystem && (
                      <button
                        onClick={() => handleDeleteWaypoint(wp.id, wp.name)}
                        className="text-[#666] hover:text-[#ff5555] p-1"
                        title="Delete Waypoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Waypoint Modal */}
      {waypointModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#242526] border-2 border-[#141415] shadow-2xl w-full max-w-sm p-4 space-y-3 font-mono">
            <h3 className="text-xs font-heading text-white tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#10b981]" />
              SAVE TACTICAL WAYPOINT
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[#888] text-[11px] block mb-1">Waypoint Name</label>
                <input
                  type="text"
                  value={newWpName}
                  onChange={(e) => setNewWpName(e.target.value)}
                  className="w-full bg-[#161718] border border-[#333] px-2.5 py-1.5 text-white font-mono"
                  placeholder="Base, Farm, Portal..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[#888] text-[11px] block mb-1">Marker Color</label>
                <div className="flex items-center space-x-2">
                  {['#10b981', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewWpColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        newWpColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="bg-[#18191a] p-2 text-[#aaa] text-[11px]">
                Target: <span className="text-[#55ff55]">{clickCoord?.x}, {clickCoord?.z}</span> [{activeDimension}]
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#333]">
              <button
                onClick={() => setWaypointModalOpen(false)}
                className="px-3 py-1.5 bg-[#333] text-[#ccc] hover:text-white text-xs font-heading"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveWaypoint}
                className="px-3 py-1.5 bg-[#3c8527] text-white hover:bg-[#4f913c] text-xs font-heading"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teleport Modal */}
      {teleportModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#242526] border-2 border-[#141415] shadow-2xl w-full max-w-sm p-4 space-y-3 font-mono">
            <h3 className="text-xs font-heading text-white tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-[#38bdf8]" />
              TACTICAL TELEPORTATION
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[#888] text-[11px] block mb-1">Select Operative</label>
                <select
                  value={teleportTargetUuid}
                  onChange={(e) => setTeleportTargetUuid(e.target.value)}
                  className="w-full bg-[#161718] border border-[#333] px-2.5 py-1.5 text-white font-mono"
                >
                  <option value="">-- Choose Player --</option>
                  {mapData?.players?.map((p) => (
                    <option key={p.uuid} value={p.uuid}>
                      {p.username} ({p.dimension.replace('minecraft:', '')})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[#888] text-[10px] block mb-0.5">X Coord</label>
                  <input
                    type="number"
                    value={teleportCoords.x}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, x: Number(e.target.value) })}
                    className="w-full bg-[#161718] border border-[#333] p-1 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[#888] text-[10px] block mb-0.5">Y Coord</label>
                  <input
                    type="number"
                    value={teleportCoords.y}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, y: Number(e.target.value) })}
                    className="w-full bg-[#161718] border border-[#333] p-1 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[#888] text-[10px] block mb-0.5">Z Coord</label>
                  <input
                    type="number"
                    value={teleportCoords.z}
                    onChange={(e) => setTeleportCoords({ ...teleportCoords, z: Number(e.target.value) })}
                    className="w-full bg-[#161718] border border-[#333] p-1 text-white font-mono text-xs"
                  />
                </div>
              </div>
              <div className="bg-[#18191a] p-2 text-[#aaa] text-[11px]">
                Target Dimension: <span className="text-[#55ff55]">{activeDimension}</span>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#333]">
              <button
                onClick={() => setTeleportModalOpen(false)}
                className="px-3 py-1.5 bg-[#333] text-[#ccc] hover:text-white text-xs font-heading"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteTeleport}
                className="px-3 py-1.5 bg-[#3c8527] text-white hover:bg-[#4f913c] text-xs font-heading"
              >
                TELEPORT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
