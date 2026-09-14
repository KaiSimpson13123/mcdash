package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import net.fabricmc.loader.api.FabricLoader;
import net.mcwebdashboard.metrics.MetricsCollector;
import net.mcwebdashboard.services.WorldInfoService;
import net.minecraft.server.MinecraftServer;

import java.lang.management.ManagementFactory;
import java.util.LinkedHashMap;
import java.util.Map;

public class ServerController {
    private final MetricsCollector metricsCollector;
    private final WorldInfoService worldInfoService;
    private volatile MinecraftServer server;

    public ServerController(MetricsCollector metricsCollector, WorldInfoService worldInfoService) {
        this.metricsCollector = metricsCollector;
        this.worldInfoService = worldInfoService;
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/server", this::handleServerInfo);
        app.get("/api/stats", this::handleStats);
        app.get("/api/world", this::handleWorld);
        app.get("/api/performance", this::handlePerformance);
    }

    private void handleServerInfo(Context ctx) {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("status", server != null && server.isRunning() ? "ONLINE" : "STARTING");
        info.put("motd", server != null ? server.getMotd() : "Minecraft Server");
        info.put("minecraftVersion", server != null ? server.getServerVersion() : "26.2");
        info.put("javaVersion", System.getProperty("java.version"));
        info.put("jvmVendor", System.getProperty("java.vendor"));
        info.put("jvmVersion", System.getProperty("java.vm.version"));

        String loaderVersion = FabricLoader.getInstance().getModContainer("fabricloader")
                .map(mod -> mod.getMetadata().getVersion().getFriendlyString())
                .orElse("0.19.3");
        info.put("fabricLoaderVersion", loaderVersion);

        long uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        info.put("uptimeSeconds", uptime);

        int online = server != null && server.getPlayerList() != null ? server.getPlayerList().getPlayerCount() : 0;
        int max = server != null && server.getPlayerList() != null ? server.getPlayerList().getMaxPlayers() : 20;
        info.put("onlinePlayers", online);
        info.put("maxPlayers", max);

        ctx.json(info);
    }

    private void handleStats(Context ctx) {
        ctx.json(metricsCollector.getLatestSnapshot());
    }

    private void handleWorld(Context ctx) {
        ctx.json(worldInfoService.getWorldStats());
    }

    private void handlePerformance(Context ctx) {
        Map<String, Object> performance = new LinkedHashMap<>();
        performance.put("current", metricsCollector.getLatestSnapshot());
        performance.put("history1m", metricsCollector.getMetricHistory().getOneMinuteHistory());
        performance.put("history1h", metricsCollector.getMetricHistory().getOneHourHistory());
        performance.put("history24h", metricsCollector.getMetricHistory().getTwentyFourHourHistory());
        ctx.json(performance);
    }
}
