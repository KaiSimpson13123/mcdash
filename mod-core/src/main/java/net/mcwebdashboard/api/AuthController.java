package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.Cookie;
import io.javalin.http.HttpStatus;
import io.javalin.http.SameSite;
import net.mcwebdashboard.config.ConfigManager;
import net.mcwebdashboard.security.AuthMiddleware;
import net.mcwebdashboard.security.AuthService;
import net.mcwebdashboard.security.RateLimiter;
import net.mcwebdashboard.security.SessionManager;

import java.util.Map;

public class AuthController {
    private final AuthService authService;
    private final SessionManager sessionManager;
    private final RateLimiter rateLimiter;
    private final ConfigManager configManager;

    public AuthController(AuthService authService, SessionManager sessionManager, RateLimiter rateLimiter, ConfigManager configManager) {
        this.authService = authService;
        this.sessionManager = sessionManager;
        this.rateLimiter = rateLimiter;
        this.configManager = configManager;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/auth/status", this::handleStatus);
        app.post("/api/auth/login", this::handleLogin);
        app.post("/api/auth/logout", this::handleLogout);
        app.post("/api/auth/setup", this::handleSetup);
        app.post("/api/auth/password", this::handleChangePassword);
        app.post("/api/auth/change-password", this::handleChangePassword);
    }

    private void handleStatus(Context ctx) {
        boolean setupRequired = authService.isSetupRequired();
        String sessionId = ctx.cookie(AuthMiddleware.SESSION_COOKIE);
        SessionManager.Session session = sessionManager.getSession(sessionId, configManager.getConfig().getSessionTimeoutMinutes());

        if (session != null) {
            boolean isSudo = "sudo".equalsIgnoreCase(session.getUsername());
            ctx.json(Map.of(
                    "setupRequired", setupRequired,
                    "authenticated", true,
                    "username", session.getUsername(),
                    "isSudo", isSudo,
                    "csrfToken", session.getCsrfToken()
            ));
        } else {
            ctx.json(Map.of(
                    "setupRequired", setupRequired,
                    "authenticated", false
            ));
        }
    }

    private void handleLogin(Context ctx) {
        String ip = ctx.ip();
        if (rateLimiter.isBlocked(ip)) {
            ctx.status(HttpStatus.TOO_MANY_REQUESTS).json(Map.of(
                    "error", "rate_limited",
                    "message", "Too many failed attempts. Try again in 15 minutes."
            ));
            return;
        }

        if (authService.isSetupRequired()) {
            ctx.status(HttpStatus.FORBIDDEN).json(Map.of(
                    "error", "setup_required",
                    "message", "Administrator setup has not been completed."
            ));
            return;
        }

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || !authService.verifyUser(username, password)) {
            rateLimiter.recordFailure(ip);
            ctx.status(HttpStatus.UNAUTHORIZED).json(Map.of(
                    "error", "invalid_credentials",
                    "message", "Invalid username or password."
            ));
            return;
        }

        rateLimiter.recordSuccess(ip);
        String sessionUser = "sudo".equalsIgnoreCase(username.trim()) ? "sudo" : username.trim();
        SessionManager.Session session = sessionManager.createSession(sessionUser, ip);

        setSessionCookie(ctx, session.getSessionId());

        ctx.json(Map.of(
                "success", true,
                "username", session.getUsername(),
                "isSudo", "sudo".equalsIgnoreCase(session.getUsername()),
                "csrfToken", session.getCsrfToken()
        ));
    }

    private void handleLogout(Context ctx) {
        String sessionId = ctx.cookie(AuthMiddleware.SESSION_COOKIE);
        if (sessionId != null) {
            sessionManager.invalidateSession(sessionId);
        }

        Cookie cookie = new Cookie(AuthMiddleware.SESSION_COOKIE, "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        ctx.cookie(cookie);

        ctx.json(Map.of("success", true));
    }

    private void handleSetup(Context ctx) {
        if (!authService.isSetupRequired()) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "already_configured",
                    "message", "Dashboard is already configured."
            ));
            return;
        }

        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.trim().isEmpty() || password == null || password.length() < 6) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "validation_failed",
                    "message", "Username is required and password must be at least 6 characters."
            ));
            return;
        }

        boolean success = authService.completeSetup(username, password);
        if (success) {
            SessionManager.Session session = sessionManager.createSession(username, ctx.ip());
            setSessionCookie(ctx, session.getSessionId());

            ctx.json(Map.of(
                    "success", true,
                    "username", session.getUsername(),
                    "csrfToken", session.getCsrfToken()
            ));
        } else {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of(
                    "error", "setup_failed",
                    "message", "Failed to save configuration."
            ));
        }
    }

    private void handleChangePassword(Context ctx) {
        String sessionId = ctx.cookie(AuthMiddleware.SESSION_COOKIE);
        if (sessionId == null) {
            String authHeader = ctx.header("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                sessionId = authHeader.substring(7);
            }
        }

        SessionManager.Session session = sessionManager.getSession(sessionId, configManager.getConfig().getSessionTimeoutMinutes());
        if (session == null) {
            ctx.status(HttpStatus.UNAUTHORIZED).json(Map.of(
                    "error", "unauthorized",
                    "message", "Active authenticated session required."
            ));
            return;
        }

        String loggedInUser = session.getUsername();
        Map<String, String> body = ctx.bodyAsClass(Map.class);
        String targetUser = body.get("username");
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        // "make it so you have to be logged into the same user if u want to change the password"
        if (targetUser != null && !targetUser.trim().isEmpty()) {
            if (!loggedInUser.equalsIgnoreCase(targetUser.trim())) {
                ctx.status(HttpStatus.FORBIDDEN).json(Map.of(
                        "error", "permission_denied",
                        "message", "You must be logged into the same user to change their password."
                ));
                return;
            }
        }

        if (newPassword == null || newPassword.length() < 6) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "invalid_password",
                    "message", "New password must be at least 6 characters long."
            ));
            return;
        }

        if (currentPassword == null || currentPassword.isEmpty() || !authService.verifyUser(loggedInUser, currentPassword)) {
            ctx.status(HttpStatus.BAD_REQUEST).json(Map.of(
                    "error", "incorrect_current_password",
                    "message", "Current password does not match."
            ));
            return;
        }

        boolean success = authService.changeUserPassword(loggedInUser, currentPassword, newPassword);
        if (success) {
            ctx.json(Map.of(
                    "success", true,
                    "username", loggedInUser,
                    "message", "Password for " + loggedInUser + " updated successfully."
            ));
        } else {
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR).json(Map.of(
                    "error", "update_failed",
                    "message", "Failed to update password."
            ));
        }
    }

    private void setSessionCookie(Context ctx, String sessionId) {
        Cookie cookie = new Cookie(AuthMiddleware.SESSION_COOKIE, sessionId);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setSameSite(SameSite.STRICT);
        cookie.setMaxAge(configManager.getConfig().getSessionTimeoutMinutes() * 60);
        ctx.cookie(cookie);
    }
}
