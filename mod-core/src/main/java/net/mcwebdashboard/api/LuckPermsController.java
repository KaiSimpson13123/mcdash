package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import net.mcwebdashboard.luckperms.LuckPermsService;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;

import java.util.*;

public class LuckPermsController {
    private final LuckPermsService luckPermsService;
    private volatile MinecraftServer server;

    public LuckPermsController(LuckPermsService luckPermsService) {
        this.luckPermsService = luckPermsService;
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/luckperms/groups", this::handleGetGroups);
        app.get("/api/luckperms/group/{group}", this::handleGetGroup);
        app.get("/api/luckperms/users", this::handleGetUsers);
        app.get("/api/luckperms/user/{uuid}", this::handleGetUser);
        app.get("/api/luckperms/distribution", this::handleGetDistribution);
    }

    private Collection<ServerPlayer> getOnlinePlayers() {
        if (server == null || server.getPlayerList() == null) {
            return Collections.emptyList();
        }
        return server.getPlayerList().getPlayers();
    }

    private boolean isPlayerOp(ServerPlayer player) {
        return server != null && server.getPlayerList() != null && server.getPlayerList().isOp(player.nameAndId());
    }

    private void handleGetGroups(Context ctx) {
        ctx.json(luckPermsService.getGroups(getOnlinePlayers(), this::isPlayerOp));
    }

    private void handleGetGroup(Context ctx) {
        String groupName = ctx.pathParam("group");
        List<Map<String, Object>> groups = luckPermsService.getGroups(getOnlinePlayers(), this::isPlayerOp);
        for (Map<String, Object> group : groups) {
            if (groupName.equalsIgnoreCase(String.valueOf(group.get("name")))) {
                ctx.json(group);
                return;
            }
        }
        ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "group_not_found"));
    }

    private void handleGetUsers(Context ctx) {
        List<Map<String, Object>> users = new ArrayList<>();
        for (ServerPlayer player : getOnlinePlayers()) {
            boolean isOp = isPlayerOp(player);
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("uuid", player.getUUID().toString());
            user.put("username", player.getName().getString());
            user.put("prefix", luckPermsService.getPlayerPrefix(player.getUUID(), isOp));
            user.put("primaryGroup", luckPermsService.getPlayerPrimaryGroup(player.getUUID(), isOp));
            users.add(user);
        }
        ctx.json(users);
    }

    private void handleGetUser(Context ctx) {
        try {
            UUID uuid = UUID.fromString(ctx.pathParam("uuid"));
            ServerPlayer player = server != null && server.getPlayerList() != null ? server.getPlayerList().getPlayer(uuid) : null;
            boolean isOp = player != null && isPlayerOp(player);
            ctx.json(luckPermsService.getPlayerData(uuid, isOp));
        } catch (IllegalArgumentException e) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "invalid_uuid"));
        }
    }

    private void handleGetDistribution(Context ctx) {
        ctx.json(luckPermsService.getGroupDistribution(getOnlinePlayers(), this::isPlayerOp));
    }
}
