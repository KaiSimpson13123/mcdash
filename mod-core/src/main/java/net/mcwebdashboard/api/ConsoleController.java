package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.server.MinecraftServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

public class ConsoleController {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Console");
    private final ActivityTrackerService activityTrackerService;
    private volatile MinecraftServer server;

    public ConsoleController(ActivityTrackerService activityTrackerService) {
        this.activityTrackerService = activityTrackerService;
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public void registerRoutes(Javalin app) {
        app.post("/api/console/execute", this::handleExecute);
        app.post("/api/server/command", this::handleExecute);
    }

    private void handleExecute(Context ctx) {
        String username = ctx.attribute("username");
        if (username == null || !"sudo".equalsIgnoreCase(username.trim())) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of(
                    "error", "permission_denied",
                    "message", "Permission denied: Only the 'sudo' user is permitted to execute console commands."
            ));
            return;
        }

        if (server == null) {
            ctx.status(HttpStatus.SERVICE_UNAVAILABLE).json(Map.of(
                    "error", "server_not_ready",
                    "message", "Minecraft server is not ready."
            ));
            return;
        }

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String command = body.get("command");
        if (command == null || command.trim().isEmpty()) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "empty_command",
                    "message", "Command cannot be empty."
            ));
            return;
        }

        String clean = command.trim();
        if (clean.startsWith("/")) {
            clean = clean.substring(1);
        }

        final String cmdToRun = clean;
        server.execute(() -> {
            try {
                CommandSourceStack source = server.createCommandSourceStack();
                server.getCommands().performPrefixedCommand(source, cmdToRun);
            } catch (Exception e) {
                LOGGER.error("Failed to execute console command: {}", cmdToRun, e);
            }
        });

        if (activityTrackerService != null) {
            activityTrackerService.recordEvent("COMMAND", "Console Command Executed", "sudo executed: /" + cmdToRun);
        }

        ctx.json(Map.of(
                "success", true,
                "command", cmdToRun,
                "message", "Command executed successfully by sudo."
        ));
    }
}
