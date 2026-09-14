package net.mcwebdashboard.services;

import net.mcwebdashboard.luckperms.LuckPermsService;
import net.mcwebdashboard.websocket.WebSocketService;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.players.UserBanListEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class PlayerTrackerService {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/PlayerTracker");

    public static class PlayerSessionData {
        private final UUID uuid;
        private final String username;
        private final Instant joinTime;
        private volatile Instant lastSeen;
        private long totalPlaytimeSeconds = 0;

        public PlayerSessionData(UUID uuid, String username) {
            this.uuid = uuid;
            this.username = username;
            this.joinTime = Instant.now();
            this.lastSeen = Instant.now();
        }

        public UUID getUuid() {
            return uuid;
        }

        public String getUsername() {
            return username;
        }

        public Instant getJoinTime() {
            return joinTime;
        }

        public Instant getLastSeen() {
            return lastSeen;
        }

        public void updateLastSeen() {
            this.lastSeen = Instant.now();
        }

        public long getSessionDurationSeconds() {
            return Duration.between(joinTime, Instant.now()).getSeconds();
        }

        public long getTotalPlaytimeSeconds() {
            return totalPlaytimeSeconds + getSessionDurationSeconds();
        }
    }

    private final Map<UUID, PlayerSessionData> playerSessions = new ConcurrentHashMap<>();
    private final LuckPermsService luckPermsService;
    private final WebSocketService webSocketService;
    private volatile MinecraftServer server;

    public PlayerTrackerService(LuckPermsService luckPermsService, WebSocketService webSocketService) {
        this.luckPermsService = luckPermsService;
        this.webSocketService = webSocketService;
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public boolean isOp(ServerPlayer player) {
        return server != null && server.getPlayerList() != null && server.getPlayerList().isOp(player.nameAndId());
    }

    public void onPlayerJoin(ServerPlayer player) {
        PlayerSessionData session = new PlayerSessionData(player.getUUID(), player.getName().getString());
        playerSessions.put(player.getUUID(), session);

        if (webSocketService != null) {
            webSocketService.broadcastPlayers(Map.of(
                    "type", "JOIN",
                    "player", serializePlayer(player)
            ));
        }
    }

    public void onPlayerDisconnect(ServerPlayer player) {
        PlayerSessionData session = playerSessions.remove(player.getUUID());
        if (webSocketService != null) {
            webSocketService.broadcastPlayers(Map.of(
                    "type", "LEAVE",
                    "uuid", player.getUUID().toString(),
                    "username", player.getName().getString()
            ));
        }
    }

    public List<Map<String, Object>> getOnlinePlayers() {
        if (server == null || server.getPlayerList() == null) {
            return Collections.emptyList();
        }
        return server.getPlayerList().getPlayers().stream()
                .map(this::serializePlayer)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getPlayerDetails(UUID uuid) {
        if (server == null || server.getPlayerList() == null) {
            return null;
        }
        ServerPlayer player = server.getPlayerList().getPlayer(uuid);
        return player != null ? serializePlayer(player) : null;
    }

    public Map<String, Object> serializePlayer(ServerPlayer player) {
        Map<String, Object> data = new LinkedHashMap<>();
        UUID uuid = player.getUUID();
        boolean op = isOp(player);
        data.put("uuid", uuid.toString());
        data.put("username", player.getName().getString());
        data.put("isOp", op);
        data.put("prefix", luckPermsService.getPlayerPrefix(uuid, op));
        data.put("suffix", luckPermsService.getPlayerSuffix(uuid));
        data.put("primaryGroup", luckPermsService.getPlayerPrimaryGroup(uuid, op));
        data.put("ping", player.connection != null ? player.connection.latency() : 0);
        data.put("gameMode", player.gameMode != null ? player.gameMode.getGameModeForPlayer().getName() : "survival");

        PlayerSessionData session = playerSessions.get(uuid);
        if (session != null) {
            data.put("onlineDuration", session.getSessionDurationSeconds());
            data.put("firstJoin", session.getJoinTime().toString());
            data.put("lastSeen", session.getLastSeen().toString());
        } else {
            data.put("onlineDuration", 0L);
            data.put("firstJoin", Instant.now().toString());
            data.put("lastSeen", Instant.now().toString());
        }

        return data;
    }

    // Player Actions (Executed safely on server thread)
    public boolean kickPlayer(UUID uuid, String reason) {
        if (server == null) return false;
        server.execute(() -> {
            ServerPlayer player = server.getPlayerList().getPlayer(uuid);
            if (player != null && player.connection != null) {
                player.connection.disconnect(Component.literal(reason != null ? reason : "Kicked by administrator"));
            }
        });
        return true;
    }

    public boolean banPlayer(UUID uuid, String reason) {
        if (server == null) return false;
        server.execute(() -> {
            ServerPlayer player = server.getPlayerList().getPlayer(uuid);
            if (player != null) {
                UserBanListEntry entry = new UserBanListEntry(player.nameAndId(), new Date(), "Dashboard", null, reason != null ? reason : "Banned by administrator");
                server.getPlayerList().getBans().add(entry);
                if (player.connection != null) {
                    player.connection.disconnect(Component.literal(reason != null ? reason : "Banned by administrator"));
                }
            }
        });
        return true;
    }

    public boolean killPlayer(UUID uuid) {
        if (server == null) return false;
        server.execute(() -> {
            ServerPlayer player = server.getPlayerList().getPlayer(uuid);
            if (player != null) {
                player.kill(player.level());
            }
        });
        return true;
    }

    public boolean opPlayer(UUID uuid) {
        if (server == null) return false;
        server.execute(() -> {
            ServerPlayer player = server.getPlayerList().getPlayer(uuid);
            if (player != null) {
                server.getPlayerList().op(player.nameAndId());
            }
        });
        return true;
    }

    public boolean deopPlayer(UUID uuid) {
        if (server == null) return false;
        server.execute(() -> {
            ServerPlayer player = server.getPlayerList().getPlayer(uuid);
            if (player != null) {
                server.getPlayerList().deop(player.nameAndId());
            }
        });
        return true;
    }

    public boolean teleportPlayer(UUID uuid, double x, double y, double z, String dimension) {
        if (server == null) return false;
        server.execute(() -> {
            ServerPlayer player = server.getPlayerList().getPlayer(uuid);
            if (player != null) {
                ServerLevel targetWorld = player.level();
                if (dimension != null && !dimension.isEmpty()) {
                    for (ServerLevel world : server.getAllLevels()) {
                        if (world.dimension().identifier().toString().equalsIgnoreCase(dimension)) {
                            targetWorld = world;
                            break;
                        }
                    }
                }
                player.teleportTo(targetWorld, x, y, z, Collections.emptySet(), player.getYRot(), player.getXRot(), true);
            }
        });
        return true;
    }
}
