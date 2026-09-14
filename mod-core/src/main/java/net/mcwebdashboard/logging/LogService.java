package net.mcwebdashboard.logging;

import net.mcwebdashboard.config.ConfigManager;
import net.mcwebdashboard.websocket.WebSocketService;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.config.Configuration;
import org.apache.logging.log4j.core.config.LoggerConfig;
import org.apache.logging.log4j.core.config.Property;
import org.apache.logging.log4j.core.layout.PatternLayout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.stream.Collectors;

public class LogService {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/LogService");
    private final ConfigManager configManager;
    private final WebSocketService webSocketService;
    private final ConcurrentLinkedDeque<LogEntry> logBuffer = new ConcurrentLinkedDeque<>();
    private DashboardLogAppender appender;

    public LogService(ConfigManager configManager, WebSocketService webSocketService) {
        this.configManager = configManager;
        this.webSocketService = webSocketService;
    }

    public synchronized void start() {
        try {
            int maxHistory = configManager.getConfig().getLogHistorySize();
            appender = new DashboardLogAppender(
                    "MCWebDashboardAppender",
                    null,
                    PatternLayout.createDefaultLayout(),
                    true,
                    Property.EMPTY_ARRAY,
                    this::onLogEntry
            );
            appender.start();

            LoggerContext context = (LoggerContext) LogManager.getContext(false);
            Configuration config = context.getConfiguration();
            config.addAppender(appender);

            for (LoggerConfig loggerConfig : config.getLoggers().values()) {
                loggerConfig.addAppender(appender, null, null);
            }
            config.getRootLogger().addAppender(appender, null, null);
            context.updateLoggers();

            LOGGER.info("Dashboard LogAppender attached successfully (buffer size: {}).", maxHistory);
        } catch (Exception e) {
            LOGGER.error("Failed to attach Dashboard LogAppender.", e);
        }
    }

    public synchronized void stop() {
        if (appender != null) {
            try {
                LoggerContext context = (LoggerContext) LogManager.getContext(false);
                Configuration config = context.getConfiguration();
                for (LoggerConfig loggerConfig : config.getLoggers().values()) {
                    loggerConfig.removeAppender("MCWebDashboardAppender");
                }
                config.getRootLogger().removeAppender("MCWebDashboardAppender");
                context.updateLoggers();
                appender.stop();
                LOGGER.info("Dashboard LogAppender stopped.");
            } catch (Exception e) {
                LOGGER.error("Error stopping LogAppender.", e);
            }
        }
    }

    private void onLogEntry(LogEntry entry) {
        int maxSize = configManager.getConfig().getLogHistorySize();
        logBuffer.addLast(entry);
        while (logBuffer.size() > maxSize) {
            logBuffer.pollFirst();
        }

        if (webSocketService != null) {
            webSocketService.broadcastLogs(entry);
        }
    }

    public List<LogEntry> getLogs(String level, String search, int limit) {
        return logBuffer.stream()
                .filter(entry -> {
                    if (level != null && !level.equalsIgnoreCase("ALL") && !level.trim().isEmpty()) {
                        if (!entry.getLevel().equalsIgnoreCase(level.trim())) {
                            return false;
                        }
                    }
                    if (search != null && !search.trim().isEmpty()) {
                        String query = search.toLowerCase();
                        boolean matchMsg = entry.getMessage().toLowerCase().contains(query);
                        boolean matchLogger = entry.getLoggerName().toLowerCase().contains(query);
                        boolean matchErr = entry.getThrowable() != null && entry.getThrowable().toLowerCase().contains(query);
                        return matchMsg || matchLogger || matchErr;
                    }
                    return true;
                })
                .skip(Math.max(0, logBuffer.size() - (limit > 0 ? limit : 500)))
                .collect(Collectors.toList());
    }

    public String exportRawLogs() {
        StringBuilder sb = new StringBuilder();
        for (LogEntry entry : logBuffer) {
            sb.append("[").append(entry.getTimestamp()).append("] [")
                    .append(entry.getThreadName()).append("/").append(entry.getLevel()).append("] (")
                    .append(entry.getLoggerName()).append("): ")
                    .append(entry.getMessage()).append("\n");
            if (entry.getThrowable() != null) {
                sb.append(entry.getThrowable()).append("\n");
            }
        }
        return sb.toString();
    }
}
