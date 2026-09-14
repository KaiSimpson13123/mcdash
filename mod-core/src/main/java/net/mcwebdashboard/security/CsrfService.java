package net.mcwebdashboard.security;

import io.javalin.http.Context;

public class CsrfService {
    public static final String CSRF_HEADER = "X-CSRF-Token";

    public static boolean validateRequest(Context ctx, SessionManager.Session session) {
        if (session == null) {
            return false;
        }

        // Safe HTTP methods don't require CSRF validation
        String method = ctx.method().name().toUpperCase();
        if ("GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method)) {
            return true;
        }

        String providedToken = ctx.header(CSRF_HEADER);
        return providedToken != null && providedToken.equals(session.getCsrfToken());
    }
}
