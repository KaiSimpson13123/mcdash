package net.mcwebdashboard.api;

import com.fasterxml.jackson.core.type.TypeReference;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import net.mcwebdashboard.services.ActivityTrackerService;
import net.mcwebdashboard.util.JsonUtil;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.server.MinecraftServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.*;

public class WhitelistController {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Whitelist");
    private final ActivityTrackerService activityTrackerService;
    private volatile MinecraftServer server;

    public WhitelistController(ActivityTrackerService activityTrackerService) {
        this.activityTrackerService = activityTrackerService;
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/whitelist", this::handleGetWhitelist);
        app.post("/api/whitelist/add", this::handleAddPlayer);
        app.post("/api/whitelist", this::handleAddPlayer);
        app.post("/api/whitelist/toggle", this::handleToggleWhitelist);
        app.post("/api/whitelist/enable", this::handleToggleWhitelist);

        // Explicitly block any removal attempts as required by specification:
        // "Allow the user to manage the servers whitelists. But do not allow them to remove people, only add."
        app.delete("/api/whitelist/{name}", this::handleBlockRemoval);
        app.delete("/api/whitelist", this::handleBlockRemoval);
        app.post("/api/whitelist/remove", this::handleBlockRemoval);
    }

    private void handleBlockRemoval(Context ctx) {
        ctx.status(HttpStatus.FORBIDDEN).json(Map.of(
                "error", "removal_prohibited",
                "message", "Removing players from the whitelist is disabled by server policy. Only additions are allowed."
        ));
    }

    private void handleGetWhitelist(Context ctx) {
        boolean enabled = false;
        if (server != null && server.getPlayerList() != null) {
            enabled = server.getPlayerList().isUsingWhitelist();
        }

        List<Map<String, Object>> entries = new ArrayList<>();
        Set<String> seenNames = new HashSet<>();

        // 1. Check whitelist.json
        File whitelistFile = new File("whitelist.json");
        if (whitelistFile.exists() && whitelistFile.isFile()) {
            try {
                List<Map<String, Object>> parsed = JsonUtil.getMapper().readValue(
                        whitelistFile,
                        new TypeReference<List<Map<String, Object>>>() {}
                );
                if (parsed != null) {
                    for (Map<String, Object> item : parsed) {
                        String name = (String) item.get("name");
                        if (name != null && !name.trim().isEmpty()) {
                            entries.add(item);
                            seenNames.add(name.toLowerCase());
                        }
                    }
                }
            } catch (Exception e) {
                LOGGER.warn("Failed to read whitelist.json", e);
            }
        }

        // 2. Supplement with in-memory whitelist if available
        if (server != null && server.getPlayerList() != null && server.getPlayerList().getWhiteList() != null) {
            try {
                String[] names = server.getPlayerList().getWhiteList().getUserList();
                if (names != null) {
                    for (String name : names) {
                        if (name != null && !name.trim().isEmpty() && !seenNames.contains(name.toLowerCase())) {
                            Map<String, Object> entry = new LinkedHashMap<>();
                            entry.put("name", name);
                            entry.put("uuid", "");
                            entries.add(entry);
                            seenNames.add(name.toLowerCase());
                        }
                    }
                }
            } catch (Exception e) {
                LOGGER.warn("Failed to read in-memory whitelist", e);
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("enabled", enabled);
        response.put("count", entries.size());
        response.put("entries", entries);
        ctx.json(response);
    }

    private void handleAddPlayer(Context ctx) {
        if (server == null) {
            ctx.status(HttpStatus.SERVICE_UNAVAILABLE).json(Map.of(
                    "error", "server_not_ready",
                    "message", "Minecraft server is not ready."
            ));
            return;
        }

        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        String playerName = null;
        if (body.containsKey("name")) {
            playerName = String.valueOf(body.get("name"));
        } else if (body.containsKey("player")) {
            playerName = String.valueOf(body.get("player"));
        } else if (body.containsKey("username")) {
            playerName = String.valueOf(body.get("username"));
        }

        if (playerName == null || playerName.trim().isEmpty()) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "missing_player_name",
                    "message", "Player name is required."
            ));
            return;
        }

        String target = playerName.trim();
        if (!target.matches("^[a-zA-Z0-9_]{1,16}$")) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "invalid_player_name",
                    "message", "Invalid player name format."
            ));
            return;
        }

        final String cleanName = target;
        server.execute(() -> {
            try {
                CommandSourceStack source = server.createCommandSourceStack();
                server.getCommands().performPrefixedCommand(source, "whitelist add " + cleanName);
            } catch (Exception e) {
                LOGGER.error("Failed to add player to whitelist: {}", cleanName, e);
            }
        });

        if (activityTrackerService != null) {
            activityTrackerService.recordEvent("WHITELIST", "Whitelist Player Added", cleanName + " was added to the whitelist.");
        }

        ctx.json(Map.of(
                "success", true,
                "message", "Player " + cleanName + " added to whitelist.",
                "name", cleanName
        ));
    }

    private void handleToggleWhitelist(Context ctx) {
        if (server == null) {
            ctx.status(HttpStatus.SERVICE_UNAVAILABLE).json(Map.of(
                    "error", "server_not_ready",
                    "message", "Minecraft server is not ready."
            ));
            return;
        }

        Map<String, Object> body = ctx.bodyAsClass(Map.class);
        boolean enable = true;
        if (body.containsKey("enabled")) {
            Object val = body.get("enabled");
            if (val instanceof Boolean b) {
                enable = b;
            } else {
                enable = Boolean.parseBoolean(String.valueOf(val));
            }
        }

        final boolean targetState = enable;
        server.execute(() -> {
            try {
                CommandSourceStack source = server.createCommandSourceStack();
                server.getCommands().performPrefixedCommand(source, targetState ? "whitelist on" : "whitelist off");
            } catch (Exception e) {
                LOGGER.error("Failed to toggle whitelist to: {}", targetState, e);
            }
        });

        if (activityTrackerService != null) {
            activityTrackerService.recordEvent("WHITELIST", "Whitelist Toggled", "Server whitelist was turned " + (targetState ? "ON" : "OFF") + ".");
        }

        ctx.json(Map.of(
                "success", true,
                "enabled", targetState,
                "message", "Whitelist is now " + (targetState ? "enabled" : "disabled") + "."
        ));
    }
}
