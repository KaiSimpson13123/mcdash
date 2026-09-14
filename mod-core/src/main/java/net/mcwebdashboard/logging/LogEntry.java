package net.mcwebdashboard.logging;

import java.time.Instant;

public class LogEntry {
    private final long id;
    private final Instant timestamp;
    private final String level;
    private final String loggerName;
    private final String threadName;
    private final String message;
    private final String throwable;

    public LogEntry(long id, Instant timestamp, String level, String loggerName, String threadName, String message, String throwable) {
        this.id = id;
        this.timestamp = timestamp;
        this.level = level;
        this.loggerName = loggerName;
        this.threadName = threadName;
        this.message = message;
        this.throwable = throwable;
    }

    public long getId() {
        return id;
    }

    public String getTimestamp() {
        return timestamp != null ? timestamp.toString() : "";
    }

    public String getLevel() {
        return level;
    }

    public String getLoggerName() {
        return loggerName;
    }

    public String getThreadName() {
        return threadName;
    }

    public String getMessage() {
        return message;
    }

    public String getThrowable() {
        return throwable;
    }
}
