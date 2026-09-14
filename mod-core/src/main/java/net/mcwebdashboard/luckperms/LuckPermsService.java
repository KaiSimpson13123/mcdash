package net.mcwebdashboard.luckperms;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import net.luckperms.api.cacheddata.CachedMetaData;
import net.luckperms.api.model.group.Group;
import net.luckperms.api.model.user.User;
import net.luckperms.api.node.Node;
import net.luckperms.api.node.types.InheritanceNode;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.websocket.WebSocketService;
import net.minecraft.server.level.ServerPlayer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public class LuckPermsService {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/LuckPerms");
    private boolean available = false;
    private LuckPerms luckPermsApi = null;

    public void init(WebSocketService webSocketService, ActivityTrackerService activityTracker) {
        try {
            Class.forName("net.luckperms.api.LuckPermsProvider");
            this.luckPermsApi = LuckPermsProvider.get();
            this.available = true;
            LOGGER.info("LuckPerms detected! Initializing LuckPerms integration.");
            LuckPermsEvents.register(this.luckPermsApi, webSocketService, activityTracker);
        } catch (ClassNotFoundException | NoClassDefFoundError | IllegalStateException e) {
            this.available = false;
            this.luckPermsApi = null;
            LOGGER.info("LuckPerms not detected. Running in vanilla permission fallback mode.");
        }
    }

    public boolean isAvailable() {
        if (!available) {
            try {
                this.luckPermsApi = LuckPermsProvider.get();
                if (this.luckPermsApi != null) {
                    this.available = true;
                }
            } catch (Throwable ignored) {
            }
        }
        return available && luckPermsApi != null;
    }

    public String getPlayerPrefix(UUID uuid, boolean isOp) {
        if (!isAvailable()) {
            return isOp ? "[OP]" : "";
        }
        try {
            User user = luckPermsApi.getUserManager().getUser(uuid);
            if (user != null) {
                CachedMetaData metaData = user.getCachedData().getMetaData();
                String prefix = metaData.getPrefix();
                return prefix != null ? prefix : "";
            }
        } catch (Exception ignored) {
        }
        return isOp ? "[OP]" : "";
    }

    public String getPlayerSuffix(UUID uuid) {
        if (!isAvailable()) {
            return "";
        }
        try {
            User user = luckPermsApi.getUserManager().getUser(uuid);
            if (user != null) {
                CachedMetaData metaData = user.getCachedData().getMetaData();
                String suffix = metaData.getSuffix();
                return suffix != null ? suffix : "";
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    public String getPlayerPrimaryGroup(UUID uuid, boolean isOp) {
        if (!isAvailable()) {
            return isOp ? "operator" : "default";
        }
        try {
            User user = luckPermsApi.getUserManager().getUser(uuid);
            if (user != null) {
                return user.getPrimaryGroup();
            }
        } catch (Exception ignored) {
        }
        return isOp ? "operator" : "default";
    }

    public Map<String, Object> getPlayerData(UUID uuid, boolean isOp) {
        Map<String, Object> data = new LinkedHashMap<>();
        if (!isAvailable()) {
            data.put("available", false);
            data.put("primaryGroup", isOp ? "operator" : "default");
            data.put("prefix", isOp ? "[OP]" : "");
            data.put("suffix", "");
            data.put("weight", isOp ? 100 : 0);
            data.put("allGroups", List.of(isOp ? "operator" : "default"));
            data.put("parentGroups", List.of());
            data.put("metaValues", Map.of());
            data.put("permissions", List.of());
            data.put("permissionCount", 0);
            data.put("inheritedPermissionCount", 0);
            return data;
        }

        try {
            User user = luckPermsApi.getUserManager().getUser(uuid);
            if (user == null) {
                user = luckPermsApi.getUserManager().loadUser(uuid).join();
            }

            if (user != null) {
                data.put("available", true);
                data.put("primaryGroup", user.getPrimaryGroup());
                CachedMetaData meta = user.getCachedData().getMetaData();
                data.put("prefix", meta.getPrefix() != null ? meta.getPrefix() : "");
                data.put("suffix", meta.getSuffix() != null ? meta.getSuffix() : "");

                int weight = 0;
                Group primaryGroup = luckPermsApi.getGroupManager().getGroup(user.getPrimaryGroup());
                if (primaryGroup != null && primaryGroup.getWeight().isPresent()) {
                    weight = primaryGroup.getWeight().getAsInt();
                }
                data.put("weight", weight);

                List<String> groups = user.getNodes().stream()
                        .filter(n -> n instanceof InheritanceNode)
                        .map(n -> ((InheritanceNode) n).getGroupName())
                        .collect(Collectors.toList());
                data.put("allGroups", groups);

                data.put("metaValues", meta.getMeta());

                List<Map<String, Object>> perms = new ArrayList<>();
                int inheritedCount = 0;
                for (Node node : user.resolveInheritedNodes(user.getQueryOptions())) {
                    Map<String, Object> p = new LinkedHashMap<>();
                    p.put("key", node.getKey());
                    p.put("value", node.getValue());
                    p.put("expiry", node.hasExpiry() ? node.getExpiry().getEpochSecond() : null);
                    perms.add(p);
                    inheritedCount++;
                }
                data.put("permissions", perms);
                data.put("permissionCount", user.getNodes().size());
                data.put("inheritedPermissionCount", inheritedCount);
                return data;
            }
        } catch (Exception e) {
            LOGGER.error("Error retrieving LuckPerms user data for {}", uuid, e);
        }

        data.put("available", false);
        data.put("primaryGroup", isOp ? "operator" : "default");
        return data;
    }

    public List<Map<String, Object>> getGroups(Collection<ServerPlayer> onlinePlayers, Predicate<ServerPlayer> isOpPredicate) {
        List<Map<String, Object>> groupsList = new ArrayList<>();
        if (!isAvailable()) {
            long opCount = onlinePlayers.stream().filter(isOpPredicate).count();
            long memberCount = onlinePlayers.size() - opCount;

            Map<String, Object> opGroup = new LinkedHashMap<>();
            opGroup.put("name", "operator");
            opGroup.put("displayName", "Operator");
            opGroup.put("prefix", "[OP]");
            opGroup.put("suffix", "");
            opGroup.put("weight", 100);
            opGroup.put("parents", List.of("default"));
            opGroup.put("memberCount", opCount);
            groupsList.add(opGroup);

            Map<String, Object> defaultGroup = new LinkedHashMap<>();
            defaultGroup.put("name", "default");
            defaultGroup.put("displayName", "Default");
            defaultGroup.put("prefix", "");
            defaultGroup.put("suffix", "");
            defaultGroup.put("weight", 0);
            defaultGroup.put("parents", List.of());
            defaultGroup.put("memberCount", memberCount);
            groupsList.add(defaultGroup);

            return groupsList;
        }

        try {
            Set<Group> loadedGroups = luckPermsApi.getGroupManager().getLoadedGroups();
            if (loadedGroups == null || loadedGroups.isEmpty()) {
                try {
                    luckPermsApi.getGroupManager().loadAllGroups().get(3, java.util.concurrent.TimeUnit.SECONDS);
                    loadedGroups = luckPermsApi.getGroupManager().getLoadedGroups();
                } catch (Exception ignored) {
                }
            }

            if (loadedGroups != null) {
                List<Group> sortedGroups = new ArrayList<>(loadedGroups);
                sortedGroups.sort((a, b) -> {
                    int wA = a.getWeight().orElse(0);
                    int wB = b.getWeight().orElse(0);
                    return Integer.compare(wB, wA); // Descending by weight
                });

                for (Group group : sortedGroups) {
                    Map<String, Object> gMap = new LinkedHashMap<>();
                    gMap.put("name", group.getName());
                    gMap.put("displayName", group.getDisplayName() != null ? group.getDisplayName() : group.getName());
                    CachedMetaData meta = group.getCachedData().getMetaData();
                    gMap.put("prefix", meta.getPrefix() != null ? meta.getPrefix() : "");
                    gMap.put("suffix", meta.getSuffix() != null ? meta.getSuffix() : "");
                    gMap.put("weight", group.getWeight().orElse(0));

                    List<String> parents = group.getNodes().stream()
                            .filter(n -> n instanceof InheritanceNode)
                            .map(n -> ((InheritanceNode) n).getGroupName())
                            .collect(Collectors.toList());
                    gMap.put("parents", parents != null ? parents : List.of());

                    long count = onlinePlayers.stream()
                            .filter(p -> {
                                try {
                                    User u = luckPermsApi.getUserManager().getUser(p.getUUID());
                                    return u != null && group.getName().equalsIgnoreCase(u.getPrimaryGroup());
                                } catch (Exception e) {
                                    return false;
                                }
                            })
                            .count();
                    gMap.put("memberCount", count);

                    groupsList.add(gMap);
                }
            }
        } catch (Exception e) {
            LOGGER.error("Error retrieving LuckPerms groups", e);
        }

        return groupsList;
    }

    public Map<String, Long> getGroupDistribution(Collection<ServerPlayer> onlinePlayers, Predicate<ServerPlayer> isOpPredicate) {
        Map<String, Long> distribution = new LinkedHashMap<>();
        if (!isAvailable()) {
            long opCount = onlinePlayers.stream().filter(isOpPredicate).count();
            distribution.put("operator", opCount);
            distribution.put("default", (long) Math.max(0, onlinePlayers.size() - opCount));
            return distribution;
        }

        try {
            Set<Group> loadedGroups = luckPermsApi.getGroupManager().getLoadedGroups();
            if (loadedGroups != null) {
                for (Group g : loadedGroups) {
                    distribution.put(g.getName(), 0L);
                }
            }
        } catch (Exception ignored) {
        }

        for (ServerPlayer player : onlinePlayers) {
            String group = getPlayerPrimaryGroup(player.getUUID(), isOpPredicate.test(player));
            distribution.put(group, distribution.getOrDefault(group, 0L) + 1);
        }
        return distribution;
    }
}
