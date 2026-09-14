package net.mcwebdashboard.websocket;

import io.javalin.Javalin;
import io.javalin.websocket.WsConfig;
import io.javalin.websocket.WsContext;
import net.mcwebdashboard.util.JsonUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

public class WebSocketService {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/WebSocket");

    private final Set<WsContext> statsClients = ConcurrentHashMap.newKeySet();
    private final Set<WsContext> logsClients = ConcurrentHashMap.newKeySet();
    private final Set<WsContext> playersClients = ConcurrentHashMap.newKeySet();
    private final Set<WsContext> activityClients = ConcurrentHashMap.newKeySet();
    private final Set<WsContext> luckpermsClients = ConcurrentHashMap.newKeySet();

    public void registerRoutes(Javalin app) {
        app.ws(WebSocketTopic.STATS.getEndpoint(), createHandler(statsClients, "Stats"));
        app.ws(WebSocketTopic.LOGS.getEndpoint(), createHandler(logsClients, "Logs"));
        app.ws(WebSocketTopic.PLAYERS.getEndpoint(), createHandler(playersClients, "Players"));
        app.ws(WebSocketTopic.ACTIVITY.getEndpoint(), createHandler(activityClients, "Activity"));
        app.ws(WebSocketTopic.LUCKPERMS.getEndpoint(), createHandler(luckpermsClients, "LuckPerms"));
    }

    private Consumer<WsConfig> createHandler(Set<WsContext> clientSet, String name) {
        return ws -> {
            ws.onConnect(ctx -> {
                clientSet.add(ctx);
                LOGGER.debug("{} client connected: {}", name, ctx.sessionId());
            });
            ws.onClose(ctx -> {
                clientSet.remove(ctx);
                LOGGER.debug("{} client disconnected: {}", name, ctx.sessionId());
            });
            ws.onError(ctx -> {
                clientSet.remove(ctx);
                LOGGER.debug("{} client error: {}", name, ctx.sessionId());
            });
            ws.onMessage(ctx -> {
                // Heartbeat / ping responses
                if ("ping".equalsIgnoreCase(ctx.message())) {
                    ctx.send("pong");
                }
            });
        };
    }

    private void broadcast(Set<WsContext> clients, Object payload) {
        if (clients.isEmpty()) {
            return;
        }

        String json = JsonUtil.toJson(payload);
        for (WsContext client : clients) {
            try {
                if (client.session.isOpen()) {
                    client.send(json);
                } else {
                    clients.remove(client);
                }
            } catch (Exception e) {
                clients.remove(client);
            }
        }
    }

    public void broadcastStats(Object stats) {
        broadcast(statsClients, stats);
    }

    public void broadcastLogs(Object log) {
        broadcast(logsClients, log);
    }

    public void broadcastPlayers(Object playerEvent) {
        broadcast(playersClients, playerEvent);
    }

    public void broadcastActivity(Object activityEvent) {
        broadcast(activityClients, activityEvent);
    }

    public void broadcastLuckPerms(Object luckpermsEvent) {
        broadcast(luckpermsClients, luckpermsEvent);
    }

    public void disconnectAll() {
        LOGGER.info("Disconnecting all WebSocket subscribers cleanly...");
        closeSet(statsClients);
        closeSet(logsClients);
        closeSet(playersClients);
        closeSet(activityClients);
        closeSet(luckpermsClients);
    }

    private void closeSet(Set<WsContext> clients) {
        for (WsContext ctx : clients) {
            try {
                if (ctx.session.isOpen()) {
                    ctx.closeSession(1001, "Server shutting down");
                }
            } catch (Exception ignored) {
            }
        }
        clients.clear();
    }
}
