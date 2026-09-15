package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.services.PlayerTrackerService;
import net.mcwebdashboard.util.JsonUtil;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.border.WorldBorder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

public class MapController {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/RadarMap");

    private final PlayerTrackerService playerTrackerService;
    private final ActivityTrackerService activityTrackerService;
    private volatile MinecraftServer server;

    private final List<Map<String, Object>> customWaypoints = new CopyOnWriteArrayList<>();
    private final Path waypointsFile = new File("config/mc-webdashboard-waypoints.json").toPath();

    public MapController(PlayerTrackerService playerTrackerService, ActivityTrackerService activityTrackerService) {
        this.playerTrackerService = playerTrackerService;
        this.activityTrackerService = activityTrackerService;
        loadWaypoints();
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/sudo/map", this::handleGetMapData);
        app.get("/api/sudo/map/waypoints", this::handleGetWaypoints);
        app.post("/api/sudo/map/waypoints", this::handleCreateWaypoint);
        app.delete("/api/sudo/map/waypoints/{id}", this::handleDeleteWaypoint);
        app.post("/api/sudo/map/teleport", this::handleTeleport);
    }

    /**
     * Stealth authentication check: Returns HTTP 404 if user is not 'sudo',
     * so that 'admin' or unauthenticated users cannot discover the route.
     */
    private boolean checkSudo(Context ctx) {
        String username = ctx.attribute("username");
        if (username == null || !"sudo".equalsIgnoreCase(username.trim())) {
            ctx.status(HttpStatus.NOT_FOUND).result("Not Found");
            return false;
        }
        return true;
    }

    private void handleGetMapData(Context ctx) {
        if (!checkSudo(ctx)) return;

        Map<String, Object> response = new LinkedHashMap<>();
        String requestedDim = ctx.queryParam("dimension");
        if (requestedDim == null || requestedDim.isBlank()) {
            requestedDim = "minecraft:overworld";
        }
        response.put("selectedDimension", requestedDim);

        List<Map<String, Object>> dimensions = new ArrayList<>();
        List<Map<String, Object>> players = new ArrayList<>();
        List<Map<String, Object>> waypoints = new ArrayList<>();

        if (server != null) {
            // Collect Dimension diagnostics & boundaries
            for (ServerLevel level : server.getAllLevels()) {
                String dimId = level.dimension().identifier().toString();
                String simpleName = dimId.substring(dimId.indexOf(':') + 1);
                if (simpleName.equals("overworld")) simpleName = "Overworld";
                else if (simpleName.equals("the_nether")) simpleName = "The Nether";
                else if (simpleName.equals("the_end")) simpleName = "The End";

                WorldBorder border = level.getWorldBorder();
                BlockPos spawn = level.getRespawnData() != null ? level.getRespawnData().pos() : BlockPos.ZERO;

                Map<String, Object> dimInfo = new LinkedHashMap<>();
                dimInfo.put("id", dimId);
                dimInfo.put("name", simpleName);
                dimInfo.put("loadedChunks", level.getChunkSource().getLoadedChunksCount());
                dimInfo.put("playerCount", level.players().size());
                dimInfo.put("worldBorder", Map.of(
                        "centerX", border.getCenterX(),
                        "centerZ", border.getCenterZ(),
                        "size", border.getSize()
                ));
                dimInfo.put("spawn", Map.of(
                        "x", spawn.getX(),
                        "y", spawn.getY(),
                        "z", spawn.getZ()
                ));

                dimensions.add(dimInfo);

                // Add World Spawn as a system waypoint for Overworld
                if (dimId.equals("minecraft:overworld")) {
                    Map<String, Object> spawnWaypoint = new LinkedHashMap<>();
                    spawnWaypoint.put("id", "sys-spawn");
                    spawnWaypoint.put("name", "World Spawn");
                    spawnWaypoint.put("x", spawn.getX());
                    spawnWaypoint.put("z", spawn.getZ());
                    spawnWaypoint.put("dimension", "minecraft:overworld");
                    spawnWaypoint.put("color", "#eab308");
                    spawnWaypoint.put("isSystem", true);
                    waypoints.add(spawnWaypoint);
                }
            }

            // Collect real-time player telemetry
            if (server.getPlayerList() != null) {
                for (ServerPlayer player : server.getPlayerList().getPlayers()) {
                    Map<String, Object> pData = new LinkedHashMap<>();
                    pData.put("uuid", player.getUUID().toString());
                    pData.put("username", player.getName().getString());
                    pData.put("dimension", player.level().dimension().identifier().toString());
                    pData.put("x", Math.round(player.getX() * 10.0) / 10.0);
                    pData.put("y", Math.round(player.getY() * 10.0) / 10.0);
                    pData.put("z", Math.round(player.getZ() * 10.0) / 10.0);
                    pData.put("yaw", Math.round(player.getYRot() * 10.0) / 10.0);
                    pData.put("pitch", Math.round(player.getXRot() * 10.0) / 10.0);
                    pData.put("health", Math.round(player.getHealth() * 10.0) / 10.0);
                    pData.put("maxHealth", Math.round(player.getMaxHealth() * 10.0) / 10.0);
                    pData.put("gameMode", player.gameMode != null ? player.gameMode.getGameModeForPlayer().getName() : "survival");
                    pData.put("ping", player.connection != null ? player.connection.latency() : 0);
                    pData.put("isOp", playerTrackerService.isOp(player));
                    pData.put("chunkX", ((int) Math.floor(player.getX())) >> 4);
                    pData.put("chunkZ", ((int) Math.floor(player.getZ())) >> 4);

                    players.add(pData);
                }
            }
        }

        // Add custom user waypoints
        waypoints.addAll(customWaypoints);

        response.put("dimensions", dimensions);
        response.put("players", players);
        response.put("waypoints", waypoints);

        ctx.json(response);
    }

    private void handleGetWaypoints(Context ctx) {
        if (!checkSudo(ctx)) return;

        List<Map<String, Object>> all = new ArrayList<>();
        if (server != null && server.overworld() != null) {
            BlockPos spawn = server.overworld().getRespawnData() != null ? server.overworld().getRespawnData().pos() : BlockPos.ZERO;
            all.add(Map.of(
                    "id", "sys-spawn",
                    "name", "World Spawn",
                    "x", spawn.getX(),
                    "z", spawn.getZ(),
                    "dimension", "minecraft:overworld",
                    "color", "#eab308",
                    "isSystem", true
            ));
        }
        all.addAll(customWaypoints);
        ctx.json(all);
    }

    @SuppressWarnings("unchecked")
    private void handleCreateWaypoint(Context ctx) {
        if (!checkSudo(ctx)) return;

        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        String name = (String) body.getOrDefault("name", "Waypoint");
        double x = Double.parseDouble(body.getOrDefault("x", 0).toString());
        double z = Double.parseDouble(body.getOrDefault("z", 0).toString());
        String dim = (String) body.getOrDefault("dimension", "minecraft:overworld");
        String color = (String) body.getOrDefault("color", "#10b981");

        Map<String, Object> wp = new LinkedHashMap<>();
        wp.put("id", UUID.randomUUID().toString().substring(0, 8));
        wp.put("name", name);
        wp.put("x", Math.round(x * 10.0) / 10.0);
        wp.put("z", Math.round(z * 10.0) / 10.0);
        wp.put("dimension", dim);
        wp.put("color", color);
        wp.put("isSystem", false);

        customWaypoints.add(wp);
        saveWaypoints();

        if (activityTrackerService != null) {
            activityTrackerService.recordEvent("RADAR_ACTION", "Waypoint Created", name + " at (" + x + ", " + z + ") [" + dim + "]");
        }

        ctx.status(HttpStatus.CREATED).json(wp);
    }

    private void handleDeleteWaypoint(Context ctx) {
        if (!checkSudo(ctx)) return;

        String id = ctx.pathParam("id");
        boolean removed = customWaypoints.removeIf(wp -> id.equals(wp.get("id")));

        if (removed) {
            saveWaypoints();
            if (activityTrackerService != null) {
                activityTrackerService.recordEvent("RADAR_ACTION", "Waypoint Removed", "ID: " + id);
            }
            ctx.json(Map.of("success", true, "message", "Waypoint deleted"));
        } else {
            ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "not_found", "message", "Waypoint not found"));
        }
    }

    @SuppressWarnings("unchecked")
    private void handleTeleport(Context ctx) {
        if (!checkSudo(ctx)) return;

        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        String uuidStr = (String) body.get("uuid");
        if (uuidStr == null) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "missing_uuid"));
            return;
        }

        UUID uuid;
        try {
            uuid = UUID.fromString(uuidStr);
        } catch (IllegalArgumentException e) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_uuid"));
            return;
        }

        double x = Double.parseDouble(body.getOrDefault("x", 0).toString());
        double y = Double.parseDouble(body.getOrDefault("y", 64).toString());
        double z = Double.parseDouble(body.getOrDefault("z", 0).toString());
        String dim = (String) body.getOrDefault("dimension", "minecraft:overworld");

        boolean success = playerTrackerService.teleportPlayer(uuid, x, y, z, dim);
        if (activityTrackerService != null) {
            activityTrackerService.recordEvent("RADAR_ACTION", "Tactical Teleport", "UUID: " + uuid + " to (" + x + ", " + y + ", " + z + ") [" + dim + "]");
        }

        ctx.json(Map.of("success", success, "message", "Player teleported successfully"));
    }

    @SuppressWarnings("unchecked")
    private void loadWaypoints() {
        try {
            if (Files.exists(waypointsFile)) {
                String content = Files.readString(waypointsFile, StandardCharsets.UTF_8);
                List<Map<String, Object>> list = JsonUtil.fromJson(content, List.class);
                if (list != null) {
                    customWaypoints.clear();
                    customWaypoints.addAll(list);
                }
            }
        } catch (Exception e) {
            LOGGER.warn("Could not load radar waypoints: {}", e.getMessage());
        }
    }

    private void saveWaypoints() {
        try {
            if (waypointsFile.getParent() != null) {
                Files.createDirectories(waypointsFile.getParent());
            }
            String json = JsonUtil.toJson(customWaypoints);
            Files.writeString(waypointsFile, json, StandardCharsets.UTF_8);
        } catch (Exception e) {
            LOGGER.error("Failed to save radar waypoints: {}", e.getMessage());
        }
    }
}
