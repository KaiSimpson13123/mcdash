package net.mcwebdashboard;

import net.fabricmc.api.DedicatedServerModInitializer;
import net.mcwebdashboard.config.ConfigManager;
import net.mcwebdashboard.dashboard.WebDashboardServer;
import net.mcwebdashboard.database.StorageManager;
import net.mcwebdashboard.events.ServerEventHandler;
import net.mcwebdashboard.logging.LogService;
import net.mcwebdashboard.luckperms.LuckPermsService;
import net.mcwebdashboard.metrics.MetricsCollector;
import net.mcwebdashboard.security.AuthService;
import net.mcwebdashboard.security.RateLimiter;
import net.mcwebdashboard.security.SessionManager;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.services.PlayerTrackerService;
import net.mcwebdashboard.services.WorldInfoService;
import net.mcwebdashboard.websocket.WebSocketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MCWebDashboardMod implements DedicatedServerModInitializer {
    public static final String MOD_ID = "mc-webdashboard";
    public static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard");

    private static MCWebDashboardMod instance;

    private ConfigManager configManager;
    private AuthService authService;
    private SessionManager sessionManager;
    private RateLimiter rateLimiter;
    private WebSocketService webSocketService;
    private MetricsCollector metricsCollector;
    private LogService logService;
    private ActivityTrackerService activityTracker;
    private PlayerTrackerService playerTracker;
    private WorldInfoService worldInfo;
    private LuckPermsService luckPermsService;
    private StorageManager storageManager;
    private WebDashboardServer dashboardServer;
    private ServerEventHandler eventHandler;

    @Override
    public void onInitializeServer() {
        LOGGER.info("Initializing MC-WebDashboard for Minecraft 26.2 (Fabric Server)...");
        instance = this;

        // 1. Configuration
        configManager = new ConfigManager();
        configManager.load();

        // 2. Storage & Security
        storageManager = new StorageManager();
        authService = new AuthService(configManager);
        sessionManager = new SessionManager();
        rateLimiter = new RateLimiter();

        // 3. WebSockets & Real-time Services
        webSocketService = new WebSocketService();
        activityTracker = new ActivityTrackerService(webSocketService);
        luckPermsService = new LuckPermsService();
        playerTracker = new PlayerTrackerService(luckPermsService, webSocketService);
        worldInfo = new WorldInfoService();

        // 4. Metrics & Logs
        metricsCollector = new MetricsCollector(webSocketService);
        logService = new LogService(configManager, webSocketService);

        // 5. Embedded HTTP Server
        dashboardServer = new WebDashboardServer(
                configManager,
                authService,
                sessionManager,
                rateLimiter,
                webSocketService,
                metricsCollector,
                logService,
                activityTracker,
                playerTracker,
                worldInfo,
                luckPermsService
        );

        // 6. Register Fabric Event Hooks
        eventHandler = new ServerEventHandler(
                configManager,
                dashboardServer,
                metricsCollector,
                logService,
                webSocketService,
                activityTracker,
                playerTracker,
                worldInfo,
                luckPermsService,
                sessionManager,
                storageManager
        );
        eventHandler.register();

        LOGGER.info("MC-WebDashboard mod core initialized successfully.");
    }

    public static MCWebDashboardMod getInstance() {
        return instance;
    }

    public ConfigManager getConfigManager() {
        return configManager;
    }

    public AuthService getAuthService() {
        return authService;
    }

    public WebSocketService getWebSocketService() {
        return webSocketService;
    }

    public MetricsCollector getMetricsCollector() {
        return metricsCollector;
    }

    public LuckPermsService getLuckPermsService() {
        return luckPermsService;
    }
}
