package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import net.mcwebdashboard.logging.LogService;

public class LogController {
    private final LogService logService;

    public LogController(LogService logService) {
        this.logService = logService;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/logs", this::handleGetLogs);
        app.get("/api/logs/download", this::handleDownloadLogs);
    }

    private void handleGetLogs(Context ctx) {
        String level = ctx.queryParam("level");
        String search = ctx.queryParam("search");
        int limit = ctx.queryParamAsClass("limit", Integer.class).getOrDefault(500);

        ctx.json(logService.getLogs(level, search, limit));
    }

    private void handleDownloadLogs(Context ctx) {
        ctx.header("Content-Disposition", "attachment; filename=\"server-console.log\"");
        ctx.contentType("text/plain; charset=UTF-8");
        ctx.result(logService.exportRawLogs());
    }
}
