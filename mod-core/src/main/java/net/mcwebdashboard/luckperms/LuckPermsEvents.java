package net.mcwebdashboard.luckperms;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.event.EventBus;
import net.luckperms.api.event.group.GroupDataRecalculateEvent;
import net.luckperms.api.event.node.NodeAddEvent;
import net.luckperms.api.event.node.NodeRemoveEvent;
import net.luckperms.api.event.user.UserDataRecalculateEvent;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.websocket.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class LuckPermsEvents {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/LuckPermsEvents");

    public static void register(LuckPerms luckPerms, WebSocketService webSocketService, ActivityTrackerService activityTracker) {
        if (luckPerms == null) {
            return;
        }

        try {
            EventBus eventBus = luckPerms.getEventBus();

            eventBus.subscribe(UserDataRecalculateEvent.class, e -> {
                String username = e.getUser().getUsername();
                String prefix = e.getData().getMetaData().getPrefix();
                String group = e.getData().getMetaData().getPrimaryGroup();

                Map<String, Object> payload = Map.of(
                        "type", "USER_UPDATE",
                        "username", username != null ? username : e.getUser().getUniqueId().toString(),
                        "uuid", e.getUser().getUniqueId().toString(),
                        "primaryGroup", group != null ? group : "default",
                        "prefix", prefix != null ? prefix : ""
                );
                webSocketService.broadcastLuckPerms(payload);
            });

            eventBus.subscribe(GroupDataRecalculateEvent.class, e -> {
                String groupName = e.getGroup().getName();
                Map<String, Object> payload = Map.of(
                        "type", "GROUP_UPDATE",
                        "group", groupName
                );
                webSocketService.broadcastLuckPerms(payload);
            });

            eventBus.subscribe(NodeAddEvent.class, e -> {
                String target = e.getTarget().getFriendlyName();
                String key = e.getNode().getKey();
                String desc = target + " granted permission: " + key;
                if (e.getNode().hasExpiry()) {
                    desc += " (temporary)";
                }

                if (activityTracker != null) {
                    activityTracker.recordEvent("LUCKPERMS", "Permission Granted", desc);
                }
                webSocketService.broadcastLuckPerms(Map.of(
                        "type", "NODE_ADD",
                        "target", target,
                        "node", key
                ));
            });

            eventBus.subscribe(NodeRemoveEvent.class, e -> {
                String target = e.getTarget().getFriendlyName();
                String key = e.getNode().getKey();
                String desc = target + " revoked permission: " + key;

                if (activityTracker != null) {
                    activityTracker.recordEvent("LUCKPERMS", "Permission Revoked", desc);
                }
                webSocketService.broadcastLuckPerms(Map.of(
                        "type", "NODE_REMOVE",
                        "target", target,
                        "node", key
                ));
            });

            LOGGER.info("LuckPerms EventBus listeners successfully registered.");
        } catch (Throwable t) {
            LOGGER.warn("Could not register LuckPerms event listeners: {}", t.getMessage());
        }
    }
}
