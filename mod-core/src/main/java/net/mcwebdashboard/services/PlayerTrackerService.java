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

    public Map<String, Object> getFullPlayerDetails(UUID uuid) {
        if (server == null || server.getPlayerList() == null) {
            return null;
        }
        ServerPlayer player = server.getPlayerList().getPlayer(uuid);
        return player != null ? serializeFullPlayer(player) : null;
    }

    public Map<String, Object> serializeFullPlayer(ServerPlayer player) {
        Map<String, Object> data = serializePlayer(player);
        if (player == null) return data;

        // Position & Dimension
        Map<String, Object> pos = new LinkedHashMap<>();
        pos.put("x", Math.round(player.getX() * 100.0) / 100.0);
        pos.put("y", Math.round(player.getY() * 100.0) / 100.0);
        pos.put("z", Math.round(player.getZ() * 100.0) / 100.0);
        pos.put("yaw", Math.round(player.getYRot() * 10.0) / 10.0);
        pos.put("pitch", Math.round(player.getXRot() * 10.0) / 10.0);
        pos.put("dimension", player.level() != null ? player.level().dimension().identifier().toString() : "minecraft:overworld");
        data.put("position", pos);

        // Vitals
        Map<String, Object> vitals = new LinkedHashMap<>();
        vitals.put("health", Math.round(player.getHealth() * 10.0) / 10.0);
        vitals.put("maxHealth", Math.round(player.getMaxHealth() * 10.0) / 10.0);
        vitals.put("foodLevel", player.getFoodData() != null ? player.getFoodData().getFoodLevel() : 20);
        vitals.put("saturationLevel", player.getFoodData() != null ? Math.round(player.getFoodData().getSaturationLevel() * 10.0) / 10.0 : 5.0);
        vitals.put("experienceLevel", player.experienceLevel);
        vitals.put("experienceProgress", Math.round(player.experienceProgress * 100.0) / 100.0);
        vitals.put("totalExperience", player.totalExperience);
        vitals.put("airSupply", player.getAirSupply());
        vitals.put("maxAirSupply", player.getMaxAirSupply());
        vitals.put("score", player.getScore());
        data.put("vitals", vitals);

        // Active Potion Effects
        List<Map<String, Object>> effects = new ArrayList<>();
        if (player.getActiveEffects() != null) {
            for (var effect : player.getActiveEffects()) {
                Map<String, Object> effMap = new LinkedHashMap<>();
                String effectName = "";
                try {
                    effectName = net.minecraft.core.registries.BuiltInRegistries.MOB_EFFECT.getKey(effect.getEffect().value()).toString();
                } catch (Throwable t) {
                    effectName = effect.getDescriptionId();
                }
                effMap.put("name", effectName);
                effMap.put("duration", effect.getDuration());
                effMap.put("amplifier", effect.getAmplifier());
                effMap.put("ambient", effect.isAmbient());
                effMap.put("visible", effect.isVisible());
                effects.add(effMap);
            }
        }
        data.put("effects", effects);

        // Inventory
        Map<String, Object> inventoryData = new LinkedHashMap<>();
        var inv = player.getInventory();
        if (inv != null) {
            inventoryData.put("selectedSlot", inv.getSelectedSlot());

            // Equipment Armor
            Map<String, Object> armor = new LinkedHashMap<>();
            armor.put("boots", serializeItemStack(player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.FEET), 0));
            armor.put("leggings", serializeItemStack(player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.LEGS), 1));
            armor.put("chestplate", serializeItemStack(player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.CHEST), 2));
            armor.put("helmet", serializeItemStack(player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.HEAD), 3));
            inventoryData.put("armor", armor);

            // Offhand
            inventoryData.put("offhand", serializeItemStack(player.getItemBySlot(net.minecraft.world.entity.EquipmentSlot.OFFHAND), 40));

            // Main inventory & Hotbar (36 storage slots: 0-8 hotbar, 9-35 main inventory)
            List<Map<String, Object>> mainSlots = new ArrayList<>();
            int maxSlots = Math.min(36, inv.getContainerSize());
            for (int i = 0; i < maxSlots; i++) {
                mainSlots.add(serializeItemStack(inv.getItem(i), i));
            }
            inventoryData.put("items", mainSlots);
        }
        data.put("inventory", inventoryData);

        // Ender Chest (27 slots)
        var enderChest = player.getEnderChestInventory();
        List<Map<String, Object>> enderSlots = new ArrayList<>();
        if (enderChest != null) {
            for (int i = 0; i < enderChest.getContainerSize(); i++) {
                enderSlots.add(serializeItemStack(enderChest.getItem(i), i));
            }
        }
        data.put("enderChest", enderSlots);

        return data;
    }

    private Map<String, Object> serializeItemStack(net.minecraft.world.item.ItemStack stack, int slotIndex) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (slotIndex >= 0) {
            map.put("slot", slotIndex);
        }
        if (stack == null || stack.isEmpty()) {
            map.put("empty", true);
            return map;
        }

        map.put("empty", false);
        map.put("count", stack.getCount());
        map.put("maxStackSize", stack.getMaxStackSize());
        map.put("name", stack.getHoverName().getString());

        String itemId = "";
        try {
            itemId = net.minecraft.core.registries.BuiltInRegistries.ITEM.getKey(stack.getItem()).toString();
        } catch (Throwable t) {
            itemId = stack.getItem().toString();
        }
        map.put("id", itemId);

        map.put("damage", stack.getDamageValue());
        map.put("maxDamage", stack.getMaxDamage());
        map.put("isDamaged", stack.isDamaged());

        return map;
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
