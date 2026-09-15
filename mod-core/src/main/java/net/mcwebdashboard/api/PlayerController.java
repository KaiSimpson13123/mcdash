package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.services.PlayerTrackerService;

import java.util.Map;
import java.util.UUID;

public class PlayerController {
    private final PlayerTrackerService playerTrackerService;
    private final ActivityTrackerService activityTrackerService;

    public PlayerController(PlayerTrackerService playerTrackerService, ActivityTrackerService activityTrackerService) {
        this.playerTrackerService = playerTrackerService;
        this.activityTrackerService = activityTrackerService;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/players", this::handleGetPlayers);
        app.get("/api/players/{uuid}/full", this::handleGetFullPlayer);

        app.post("/api/players/{uuid}/kick", this::handleKick);
        app.post("/api/players/{uuid}/ban", this::handleBan);
        app.post("/api/players/{uuid}/kill", this::handleKill);
        app.post("/api/players/{uuid}/op", this::handleOp);
        app.post("/api/players/{uuid}/deop", this::handleDeop);
        app.post("/api/players/{uuid}/teleport", this::handleTeleport);
    }

    private void handleGetPlayers(Context ctx) {
        ctx.json(playerTrackerService.getOnlinePlayers());
    }

    private void handleGetFullPlayer(Context ctx) {
        if (!checkSudo(ctx)) return;

        UUID uuid = parseUuid(ctx);
        if (uuid == null) return;

        Map<String, Object> details = playerTrackerService.getFullPlayerDetails(uuid);
        if (details == null) {
            ctx.status(HttpStatus.NOT_FOUND).json(Map.of(
                    "error", "player_not_found",
                    "message", "Player is not online or not found."
            ));
            return;
        }

        ctx.json(details);
    }

    private boolean checkSudo(Context ctx) {
        String username = ctx.attribute("username");
        if (username == null || !"sudo".equalsIgnoreCase(username.trim())) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of(
                    "error", "permission_denied",
                    "message", "Permission denied: Only the 'sudo' user is permitted to use action buttons."
            ));
            return false;
        }
        return true;
    }

    private void handleKick(Context ctx) {
        if (!checkSudo(ctx)) return;

        UUID uuid = parseUuid(ctx);
        if (uuid == null) return;

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String reason = body.getOrDefault("reason", "Kicked by administrator");

        boolean success = playerTrackerService.kickPlayer(uuid, reason);
        activityTrackerService.recordEvent("PLAYER_ACTION", "Player Kicked", "UUID: " + uuid + " Reason: " + reason);
        ctx.json(Map.of("success", success));
    }

    private void handleBan(Context ctx) {
        if (!checkSudo(ctx)) return;

        UUID uuid = parseUuid(ctx);
        if (uuid == null) return;

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String reason = body.getOrDefault("reason", "Banned by administrator");

        boolean success = playerTrackerService.banPlayer(uuid, reason);
        activityTrackerService.recordEvent("PLAYER_ACTION", "Player Banned", "UUID: " + uuid + " Reason: " + reason);
        ctx.json(Map.of("success", success));
    }

    private void handleKill(Context ctx) {
        if (!checkSudo(ctx)) return;

        UUID uuid = parseUuid(ctx);
        if (uuid == null) return;

        boolean success = playerTrackerService.killPlayer(uuid);
        activityTrackerService.recordEvent("PLAYER_ACTION", "Player Killed", "UUID: " + uuid);
        ctx.json(Map.of("success", success));
    }

    private void handleOp(Context ctx) {
        if (!checkSudo(ctx)) return;

        UUID uuid = parseUuid(ctx);
        if (uuid == null) return;

        boolean success = playerTrackerService.opPlayer(uuid);
        activityTrackerService.recordEvent("PLAYER_ACTION", "Operator Granted", "UUID: " + uuid);
        ctx.json(Map.of("success", success));
    }

    private void handleDeop(Context ctx) {
        if (!checkSudo(ctx)) return;

        UUID uuid = parseUuid(ctx);
        if (uuid == null) return;

        boolean success = playerTrackerService.deopPlayer(uuid);
        activityTrackerService.recordEvent("PLAYER_ACTION", "Operator Revoked", "UUID: " + uuid);
        ctx.json(Map.of("success", success));
    }

    private void handleTeleport(Context ctx) {
        if (!checkSudo(ctx)) return;

        UUID uuid = parseUuid(ctx);
        if (uuid == null) return;

        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        double x = Double.parseDouble(body.getOrDefault("x", 0).toString());
        double y = Double.parseDouble(body.getOrDefault("y", 64).toString());
        double z = Double.parseDouble(body.getOrDefault("z", 0).toString());
        String dim = (String) body.getOrDefault("dimension", "minecraft:overworld");

        boolean success = playerTrackerService.teleportPlayer(uuid, x, y, z, dim);
        activityTrackerService.recordEvent("PLAYER_ACTION", "Player Teleported", "UUID: " + uuid + " to void");
        ctx.json(Map.of("success", success));
    }

    private UUID parseUuid(Context ctx) {
        try {
            return UUID.fromString(ctx.pathParam("uuid"));
        } catch (IllegalArgumentException e) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_uuid"));
            return null;
        }
    }
}
