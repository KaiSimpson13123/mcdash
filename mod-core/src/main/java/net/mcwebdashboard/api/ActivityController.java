package net.mcwebdashboard.api;

import io.javalin.Javalin;
import io.javalin.http.Context;
import net.mcwebdashboard.services.ActivityTrackerService;

public class ActivityController {
    private final ActivityTrackerService activityTrackerService;

    public ActivityController(ActivityTrackerService activityTrackerService) {
        this.activityTrackerService = activityTrackerService;
    }

    public void registerRoutes(Javalin app) {
        app.get("/api/activity", this::handleGetActivity);
    }

    private void handleGetActivity(Context ctx) {
        int limit = ctx.queryParamAsClass("limit", Integer.class).getOrDefault(100);
        String category = ctx.queryParam("category");

        ctx.json(activityTrackerService.getRecentEvents(limit, category));
    }
}
