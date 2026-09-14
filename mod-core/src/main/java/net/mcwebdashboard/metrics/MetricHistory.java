package net.mcwebdashboard.metrics;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

public class MetricHistory {
    private final ConcurrentLinkedDeque<ServerPerformanceSnapshot> oneMinuteHistory = new ConcurrentLinkedDeque<>();
    private final ConcurrentLinkedDeque<ServerPerformanceSnapshot> oneHourHistory = new ConcurrentLinkedDeque<>();
    private final ConcurrentLinkedDeque<ServerPerformanceSnapshot> twentyFourHourHistory = new ConcurrentLinkedDeque<>();

    private int secondCounter = 0;

    public void addSnapshot(ServerPerformanceSnapshot snapshot) {
        // 1-minute resolution: 1 point per second (up to 60 points)
        oneMinuteHistory.addLast(snapshot);
        while (oneMinuteHistory.size() > 60) {
            oneMinuteHistory.pollFirst();
        }

        secondCounter++;

        // 1-hour resolution: 1 point every 10 seconds (up to 360 points)
        if (secondCounter % 10 == 0) {
            oneHourHistory.addLast(snapshot);
            while (oneHourHistory.size() > 360) {
                oneHourHistory.pollFirst();
            }
        }

        // 24-hour resolution: 1 point every 5 minutes (300 seconds, up to 288 points)
        if (secondCounter % 300 == 0) {
            twentyFourHourHistory.addLast(snapshot);
            while (twentyFourHourHistory.size() > 288) {
                twentyFourHourHistory.pollFirst();
            }
            secondCounter = 0; // reset counter after full 5-minute cycle
        }
    }

    public List<ServerPerformanceSnapshot> getOneMinuteHistory() {
        return new ArrayList<>(oneMinuteHistory);
    }

    public List<ServerPerformanceSnapshot> getOneHourHistory() {
        return new ArrayList<>(oneHourHistory);
    }

    public List<ServerPerformanceSnapshot> getTwentyFourHourHistory() {
        return new ArrayList<>(twentyFourHourHistory);
    }
}
