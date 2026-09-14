package net.mcwebdashboard.dashboard;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import net.mcwebdashboard.api.*;
import net.mcwebdashboard.config.ConfigManager;
import net.mcwebdashboard.config.DashboardConfig;
import net.mcwebdashboard.logging.LogService;
import net.mcwebdashboard.luckperms.LuckPermsService;
import net.mcwebdashboard.metrics.MetricsCollector;
import net.mcwebdashboard.security.AuthMiddleware;
import net.mcwebdashboard.security.AuthService;
import net.mcwebdashboard.security.RateLimiter;
import net.mcwebdashboard.security.SessionManager;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.services.PlayerTrackerService;
import net.mcwebdashboard.services.WorldInfoService;
import net.mcwebdashboard.websocket.WebSocketService;
import net.minecraft.server.MinecraftServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class WebDashboardServer {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Server");

    private final ConfigManager configManager;
    private final AuthService authService;
    private final SessionManager sessionManager;
    private final RateLimiter rateLimiter;
    private final WebSocketService webSocketService;
    private final MetricsCollector metricsCollector;
    private final LogService logService;
    private final ActivityTrackerService activityTrackerService;
    private final PlayerTrackerService playerTrackerService;
    private final WorldInfoService worldInfoService;
    private final LuckPermsService luckPermsService;

    private Javalin app;
    private ServerController serverController;
    private PlayerController playerController;
    private LuckPermsController luckPermsController;
    private ChatController chatController;

    public WebDashboardServer(
            ConfigManager configManager,
            AuthService authService,
            SessionManager sessionManager,
            RateLimiter rateLimiter,
            WebSocketService webSocketService,
            MetricsCollector metricsCollector,
            LogService logService,
            ActivityTrackerService activityTrackerService,
            PlayerTrackerService playerTrackerService,
            WorldInfoService worldInfoService,
            LuckPermsService luckPermsService) {
        this.configManager = configManager;
        this.authService = authService;
        this.sessionManager = sessionManager;
        this.rateLimiter = rateLimiter;
        this.webSocketService = webSocketService;
        this.metricsCollector = metricsCollector;
        this.logService = logService;
        this.activityTrackerService = activityTrackerService;
        this.playerTrackerService = playerTrackerService;
        this.worldInfoService = worldInfoService;
        this.luckPermsService = luckPermsService;
    }

    private volatile MinecraftServer server;

    public void setMinecraftServer(MinecraftServer server) {
        this.server = server;
        if (metricsCollector != null) metricsCollector.setServer(server);
        if (playerTrackerService != null) playerTrackerService.setServer(server);
        if (worldInfoService != null) worldInfoService.setServer(server);
        if (serverController != null) serverController.setServer(server);
        if (luckPermsController != null) luckPermsController.setServer(server);
        if (chatController != null) chatController.setServer(server);
    }

    public synchronized void start() {
        DashboardConfig config = configManager.getConfig();
        if (!config.isEnabled()) {
            LOGGER.info("Web Dashboard is disabled in configuration.");
            return;
        }

        try {
            AuthMiddleware authMiddleware = new AuthMiddleware(authService, sessionManager, configManager);

            app = Javalin.create(javalinConfig -> {
                javalinConfig.showJavalinBanner = false;
                javalinConfig.jsonMapper(new io.javalin.json.JavalinJackson(net.mcwebdashboard.util.JsonUtil.getMapper(), false));

                // Static frontend assets served directly from JAR classpath /public
                javalinConfig.staticFiles.add(staticFiles -> {
                    staticFiles.hostedPath = "/";
                    staticFiles.directory = "/public";
                    staticFiles.location = Location.CLASSPATH;
                    staticFiles.precompress = false;
                });

                // Single Page Application routing fallback: route all unmatched URLs to index.html
                javalinConfig.spaRoot.addFile("/", "/public/index.html", Location.CLASSPATH);

                // Authentication and route protection filter
                javalinConfig.router.mount(router -> {
                    router.before(authMiddleware);
                });
            });

            // WebSocket routes
            webSocketService.registerRoutes(app);

            // REST API Controllers
            AuthController authController = new AuthController(authService, sessionManager, rateLimiter, configManager);
            authController.registerRoutes(app);

            serverController = new ServerController(metricsCollector, worldInfoService);
            serverController.registerRoutes(app);

            playerController = new PlayerController(playerTrackerService, activityTrackerService);
            playerController.registerRoutes(app);

            LogController logController = new LogController(logService);
            logController.registerRoutes(app);

            ActivityController activityController = new ActivityController(activityTrackerService);
            activityController.registerRoutes(app);

            luckPermsController = new LuckPermsController(luckPermsService);
            luckPermsController.registerRoutes(app);

            chatController = new ChatController();
            chatController.registerRoutes(app);

            if (this.server != null) {
                serverController.setServer(this.server);
                luckPermsController.setServer(this.server);
                chatController.setServer(this.server);
            }

            app.start(config.getHost(), config.getPort());
            LOGGER.info("MC-WebDashboard HTTP & WebSocket server listening on {}:{}", config.getHost(), config.getPort());

            if (authService.isSetupRequired()) {
                LOGGER.warn("==================================================================");
                LOGGER.warn("INITIAL SETUP REQUIRED: Please open http://{}:{}/ in your browser",
                        config.getHost().equals("0.0.0.0") ? "localhost" : config.getHost(), config.getPort());
                LOGGER.warn("to complete administrator credentials setup.");
                LOGGER.warn("==================================================================");
            }
        } catch (Exception e) {
            LOGGER.error("Failed to start WebDashboard server on {}:{}", config.getHost(), config.getPort(), e);
        }
    }

    public synchronized void stop() {
        if (app != null) {
            try {
                LOGGER.info("Stopping WebDashboard HTTP server...");
                app.stop();
                app = null;
                LOGGER.info("WebDashboard HTTP server stopped cleanly.");
            } catch (Exception e) {
                LOGGER.error("Error stopping WebDashboard server.", e);
            }
        }
    }
}
