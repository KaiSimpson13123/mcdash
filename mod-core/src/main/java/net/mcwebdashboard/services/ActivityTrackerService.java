package net.mcwebdashboard.services;

import net.mcwebdashboard.logging.DashboardLogAppender;
import net.mcwebdashboard.websocket.WebSocketService;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicLong;

public class ActivityTrackerService {
    public static class ActivityEvent {
        private final long id;
        private final Instant timestamp;
        private final String category; // JOIN, LEAVE, DEATH, CHAT, COMMAND, ADVANCEMENT, DIMENSION, WEATHER, LUCKPERMS, SERVER
        private final String title;
        private final String description;

        public ActivityEvent(long id, Instant timestamp, String category, String title, String description) {
            this.id = id;
            this.timestamp = timestamp;
            this.category = category;
            this.title = title;
            this.description = description;
        }

        public long getId() {
            return id;
        }

        public String getTimestamp() {
            return timestamp != null ? timestamp.toString() : "";
        }

        public String getCategory() {
            return category;
        }

        public String getTitle() {
            return title;
        }

        public String getDescription() {
            return description;
        }
    }

    private static final AtomicLong SEQUENCE = new AtomicLong(0);
    private final ConcurrentLinkedDeque<ActivityEvent> eventBuffer = new ConcurrentLinkedDeque<>();
    private final WebSocketService webSocketService;
    private final int maxEvents = 1000;

    public ActivityTrackerService(WebSocketService webSocketService) {
        this.webSocketService = webSocketService;
    }

    public void recordEvent(String category, String title, String description) {
        long id = SEQUENCE.incrementAndGet();
        String safeTitle = DashboardLogAppender.sanitizeCoordinates(title);
        String safeDesc = DashboardLogAppender.sanitizeCoordinates(description);
        ActivityEvent event = new ActivityEvent(id, Instant.now(), category, safeTitle, safeDesc);
        eventBuffer.addFirst(event); // Newest first

        while (eventBuffer.size() > maxEvents) {
            eventBuffer.pollLast();
        }

        if (webSocketService != null) {
            webSocketService.broadcastActivity(event);
        }
    }

    public List<ActivityEvent> getRecentEvents(int limit, String category) {
        int targetLimit = limit > 0 ? Math.min(limit, maxEvents) : 100;
        List<ActivityEvent> result = new ArrayList<>();

        for (ActivityEvent event : eventBuffer) {
            if (category != null && !category.equalsIgnoreCase("ALL") && !category.trim().isEmpty()) {
                if (!event.getCategory().equalsIgnoreCase(category.trim())) {
                    continue;
                }
            }
            String safeTitle = DashboardLogAppender.sanitizeCoordinates(event.getTitle());
            String safeDesc = DashboardLogAppender.sanitizeCoordinates(event.getDescription());
            result.add(new ActivityEvent(
                    event.getId(),
                    event.timestamp,
                    event.getCategory(),
                    safeTitle,
                    safeDesc
            ));
            if (result.size() >= targetLimit) {
                break;
            }
        }
        return result;
    }
}
