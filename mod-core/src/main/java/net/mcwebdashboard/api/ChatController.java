package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;

import java.time.Instant;
import java.util.Map;

public class ChatController {
    private final ActivityTrackerService activityTrackerService;
    private volatile MinecraftServer server;

    public ChatController(ActivityTrackerService activityTrackerService) {
        this.activityTrackerService = activityTrackerService;
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public void registerRoutes(Javalin app) {
        app.post("/api/chat/send", this::handleSendMessage);
    }

    private void handleSendMessage(Context ctx) {
        if (server == null) {
            ctx.status(HttpStatus.SERVICE_UNAVAILABLE).json(Map.of("error", "server_not_ready"));
            return;
        }

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String message = body.get("message");
        if (message == null || message.trim().isEmpty()) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of("error", "message_empty"));
            return;
        }

        String trimmed = message.trim();
        // Support Minecraft color codes (&a -> §a, &c -> §c, etc.)
        String colored = trimmed.replaceAll("(?i)&([0-9a-fk-or])", "§$1");
        String formatted = "§c[WebDashboard] §f" + colored;
        server.execute(() -> {
            if (server.getPlayerList() != null) {
                server.getPlayerList().broadcastSystemMessage(Component.literal(formatted), false);
            }
        });

        // Record CHAT event in ActivityTracker so it broadcasts over WebSocket to all web clients
        if (activityTrackerService != null) {
            activityTrackerService.recordEvent("CHAT", "Chat: [WebDashboard]", trimmed);
        }

        ctx.json(Map.of(
                "success", true,
                "message", trimmed,
                "sender", "[WebDashboard]",
                "timestamp", Instant.now().toString()
        ));
    }
}
