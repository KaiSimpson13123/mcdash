package net.mcwebdashboard.security;

import io.javalin.http.Context;
import io.javalin.http.Handler;
import io.javalin.http.HttpStatus;
import net.mcwebdashboard.config.ConfigManager;
import net.mcwebdashboard.config.DashboardConfig;

public class AuthMiddleware implements Handler {
    public static final String SESSION_COOKIE = "DASHBOARD_SESSION";
    private final AuthService authService;
    private final SessionManager sessionManager;
    private final ConfigManager configManager;

    public AuthMiddleware(AuthService authService, SessionManager sessionManager, ConfigManager configManager) {
        this.authService = authService;
        this.sessionManager = sessionManager;
        this.configManager = configManager;
    }

    @Override
    public void handle(Context ctx) throws Exception {
        String path = ctx.path();

        // Allow static frontend assets, health check, and auth public routes
        if (!path.startsWith("/api/")) {
            return;
        }

        if (path.equals("/api/auth/status") || path.equals("/api/auth/login") || path.equals("/api/auth/setup")) {
            return;
        }

        // Check if initial setup is pending
        if (authService.isSetupRequired()) {
            ctx.status(HttpStatus.FORBIDDEN).json(java.util.Map.of(
                    "error", "setup_required",
                    "message", "Initial dashboard administrator setup is required."
            ));
            return;
        }

        // Check session
        String sessionId = ctx.cookie(SESSION_COOKIE);
        if (sessionId == null) {
            String authHeader = ctx.header("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                sessionId = authHeader.substring(7);
            }
        }

        DashboardConfig config = configManager.getConfig();
        SessionManager.Session session = sessionManager.getSession(sessionId, config.getSessionTimeoutMinutes());

        if (session == null) {
            ctx.status(HttpStatus.UNAUTHORIZED).json(java.util.Map.of(
                    "error", "unauthorized",
                    "message", "Active authenticated session required."
            ));
            return;
        }

        // Validate CSRF for mutating requests
        if (!CsrfService.validateRequest(ctx, session)) {
            ctx.status(HttpStatus.FORBIDDEN).json(java.util.Map.of(
                    "error", "csrf_invalid",
                    "message", "CSRF token missing or invalid."
            ));
            return;
        }

        // Attach session to context
        ctx.attribute("session", session);
        ctx.attribute("username", session.getUsername());
    }
}
