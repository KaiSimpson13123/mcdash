package net.mcwebdashboard.events;

import net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.message.v1.ServerMessageEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.mcwebdashboard.config.ConfigManager;
import net.mcwebdashboard.config.DashboardConfig;
import net.mcwebdashboard.dashboard.WebDashboardServer;
import net.mcwebdashboard.database.StorageManager;
import net.mcwebdashboard.logging.LogService;
import net.mcwebdashboard.luckperms.LuckPermsService;
import net.mcwebdashboard.metrics.MetricsCollector;
import net.mcwebdashboard.security.SessionManager;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.services.PlayerTrackerService;
import net.mcwebdashboard.services.WorldInfoService;
import net.mcwebdashboard.websocket.WebSocketService;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.network.chat.PlayerChatMessage;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.LivingEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ServerEventHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Events");

    private final ConfigManager configManager;
    private final WebDashboardServer dashboardServer;
    private final MetricsCollector metricsCollector;
    private final LogService logService;
    private final WebSocketService webSocketService;
    private final ActivityTrackerService activityTracker;
    private final PlayerTrackerService playerTracker;
    private final WorldInfoService worldInfo;
    private final LuckPermsService luckPermsService;
    private final SessionManager sessionManager;
    private final StorageManager storageManager;

    private volatile MinecraftServer server;
    private long tickStartTimeNanos = 0;

    public ServerEventHandler(
            ConfigManager configManager,
            WebDashboardServer dashboardServer,
            MetricsCollector metricsCollector,
            LogService logService,
            WebSocketService webSocketService,
            ActivityTrackerService activityTracker,
            PlayerTrackerService playerTracker,
            WorldInfoService worldInfo,
            LuckPermsService luckPermsService,
            SessionManager sessionManager,
            StorageManager storageManager) {
        this.configManager = configManager;
        this.dashboardServer = dashboardServer;
        this.metricsCollector = metricsCollector;
        this.logService = logService;
        this.webSocketService = webSocketService;
        this.activityTracker = activityTracker;
        this.playerTracker = playerTracker;
        this.worldInfo = worldInfo;
        this.luckPermsService = luckPermsService;
        this.sessionManager = sessionManager;
        this.storageManager = storageManager;
    }

    private boolean isPlayerOp(ServerPlayer player) {
        return server != null && server.getPlayerList() != null && server.getPlayerList().isOp(player.nameAndId());
    }

    public void register() {
        // SERVER_STARTING
        ServerLifecycleEvents.SERVER_STARTING.register(serverInstance -> {
            LOGGER.info("Minecraft server starting. Initializing MC-WebDashboard services...");
            this.server = serverInstance;
            dashboardServer.setMinecraftServer(serverInstance);

            // Initialize LuckPerms soft dependency
            luckPermsService.init(webSocketService, activityTracker);

            // Start metrics
            metricsCollector.start();

            // Start log appender
            logService.start();

            // Start Web server
            dashboardServer.start();

            activityTracker.recordEvent("SERVER", "Server Starting", "Minecraft server is starting up.");
        });

        // SERVER_STARTED (Fully booted and ready)
        ServerLifecycleEvents.SERVER_STARTED.register(serverInstance -> {
            this.server = serverInstance;
            dashboardServer.setMinecraftServer(serverInstance);
            if (!luckPermsService.isAvailable()) {
                luckPermsService.init(webSocketService, activityTracker);
            }
            activityTracker.recordEvent("SERVER", "Server Started", "Minecraft server is fully online and ready.");
        });

        // SERVER_STOPPED
        ServerLifecycleEvents.SERVER_STOPPED.register(serverInstance -> {
            LOGGER.info("Minecraft server stopping. Shutting down MC-WebDashboard services...");
            activityTracker.recordEvent("SERVER", "Server Stopped", "Minecraft server has stopped.");

            // Save pending data
            if (storageManager != null) {
                storageManager.flush();
            }

            // Disconnect WebSockets
            if (webSocketService != null) {
                webSocketService.disconnectAll();
            }

            // Stop Web Server
            if (dashboardServer != null) {
                dashboardServer.stop();
            }

            // Stop log appender
            if (logService != null) {
                logService.stop();
            }

            // Stop metrics
            if (metricsCollector != null) {
                metricsCollector.stop();
            }

            // Shutdown session manager
            if (sessionManager != null) {
                sessionManager.shutdown();
            }

            this.server = null;
            LOGGER.info("MC-WebDashboard shutdown complete.");
        });

        // SERVER TICK
        ServerTickEvents.START_SERVER_TICK.register(serverInstance -> {
            tickStartTimeNanos = System.nanoTime();
        });

        ServerTickEvents.END_SERVER_TICK.register(serverInstance -> {
            if (tickStartTimeNanos > 0) {
                long duration = System.nanoTime() - tickStartTimeNanos;
                metricsCollector.recordTick(duration);
            }
        });

        // PLAYER JOIN
        ServerPlayConnectionEvents.JOIN.register((handler, sender, serverInstance) -> {
            ServerPlayer player = handler.getPlayer();
            playerTracker.onPlayerJoin(player);

            String prefix = luckPermsService.getPlayerPrefix(player.getUUID(), isPlayerOp(player));
            String name = player.getName().getString();
            activityTracker.recordEvent("JOIN", "Player Joined", (prefix.isEmpty() ? "" : prefix + " ") + name + " joined the server.");
        });

        // PLAYER DISCONNECT
        ServerPlayConnectionEvents.DISCONNECT.register((handler, serverInstance) -> {
            ServerPlayer player = handler.getPlayer();
            playerTracker.onPlayerDisconnect(player);

            String prefix = luckPermsService.getPlayerPrefix(player.getUUID(), isPlayerOp(player));
            String name = player.getName().getString();
            activityTracker.recordEvent("LEAVE", "Player Left", (prefix.isEmpty() ? "" : prefix + " ") + name + " left the server.");
        });

        // CHAT MESSAGE
        ServerMessageEvents.CHAT_MESSAGE.register((message, sender, params) -> {
            DashboardConfig config = configManager.getConfig();
            if (!config.isEnableChatTracking()) return;

            String senderName = sender.getName().getString();
            String prefix = luckPermsService.getPlayerPrefix(sender.getUUID(), isPlayerOp(sender));
            String content = message.signedContent();

            activityTracker.recordEvent("CHAT", "Chat Message", (prefix.isEmpty() ? "" : prefix + " ") + senderName + ": " + content);
        });

        // COMMAND MESSAGE
        ServerMessageEvents.COMMAND_MESSAGE.register((message, source, params) -> {
            DashboardConfig config = configManager.getConfig();
            if (!config.isEnableCommandTracking()) return;

            String senderName = source.getTextName();
            String content = message.signedContent();

            // Ignore internal commands, whispers, and team chats
            String lower = content.toLowerCase().trim();
            if (lower.startsWith("/tellraw") || lower.startsWith("/execute")
                    || lower.startsWith("/w ") || lower.equals("/w")
                    || lower.startsWith("/tell ") || lower.equals("/tell")
                    || lower.startsWith("/msg ") || lower.equals("/msg")
                    || lower.startsWith("/whisper ") || lower.equals("/whisper")
                    || lower.startsWith("/teammsg ") || lower.equals("/teammsg")
                    || lower.startsWith("/tm ") || lower.equals("/tm")) {
                return;
            }

            // Sanitize coordinates in teleport commands
            if (lower.startsWith("/tp ") || lower.startsWith("/teleport ")) {
                content = content.replaceAll("(?i)/(tp|teleport)\\s+.*", "/$1 [COORDINATES REDACTED]");
            }

            activityTracker.recordEvent("COMMAND", "Command Executed", senderName + " executed: " + content);
        });

        // DEATH
        ServerLivingEntityEvents.AFTER_DEATH.register((entity, damageSource) -> {
            if (entity instanceof ServerPlayer player) {
                String deathMsg = damageSource.getLocalizedDeathMessage(player).getString();
                activityTracker.recordEvent("DEATH", "Player Died", deathMsg);
            }
        });

        LOGGER.info("Fabric server lifecycle and game event hooks registered successfully.");
    }
}
