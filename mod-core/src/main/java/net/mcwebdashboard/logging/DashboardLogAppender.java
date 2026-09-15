package net.mcwebdashboard.logging;

import org.apache.logging.log4j.core.Appender;
import org.apache.logging.log4j.core.Core;
import org.apache.logging.log4j.core.Filter;
import org.apache.logging.log4j.core.Layout;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Property;
import org.apache.logging.log4j.core.config.plugins.Plugin;
import org.apache.logging.log4j.core.config.plugins.PluginAttribute;
import org.apache.logging.log4j.core.config.plugins.PluginElement;
import org.apache.logging.log4j.core.config.plugins.PluginFactory;

import java.io.PrintWriter;
import java.io.Serializable;
import java.io.StringWriter;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

@Plugin(name = "DashboardLogAppender", category = Core.CATEGORY_NAME, elementType = Appender.ELEMENT_TYPE, printObject = true)
public class DashboardLogAppender extends AbstractAppender {
    private static final AtomicLong SEQUENCE = new AtomicLong(0);
    private final Consumer<LogEntry> listener;

    public DashboardLogAppender(String name, Filter filter, Layout<? extends Serializable> layout, boolean ignoreExceptions, Property[] properties, Consumer<LogEntry> listener) {
        super(name, filter, layout, ignoreExceptions, properties);
        this.listener = listener;
    }

    @PluginFactory
    public static DashboardLogAppender createAppender(
            @PluginAttribute("name") String name,
            @PluginElement("Filter") Filter filter,
            @PluginElement("Layout") Layout<? extends Serializable> layout) {
        return new DashboardLogAppender(name != null ? name : "DashboardLogAppender", filter, layout, true, Property.EMPTY_ARRAY, null);
    }

    private static final java.util.regex.Pattern PRIVATE_CHAT_PATTERN = java.util.regex.Pattern.compile(
            "(?i)(\\bwhispers to\\b|\\bwhispers:|issued server command:\\s*/(w|tell|msg|whisper|teammsg|tm)\\b|\\[team\\]|\\(team\\)|\\[.+?\\s*->\\s*.+?\\])"
    );

    private static final java.util.regex.Pattern TELEPORT_PATTERN = java.util.regex.Pattern.compile(
            "(?i)(issued server command:\\s*/(?:tp|teleport|execute.*?run tp)\\s+\\S+\\s+)[-\\d\\.~^]+(?:\\s+[-\\d\\.~^]+){1,2}"
    );

    private static final java.util.regex.Pattern TELEPORTED_MSG_PATTERN = java.util.regex.Pattern.compile(
            "(?i)(Teleported\\s+.*?to\\s+)[-\\d\\.]+(?:,\\s*|\\s+)[-\\d\\.]+(?:,\\s*|\\s+)[-\\d\\.]+"
    );

    private static final java.util.regex.Pattern COORD_AT_PATTERN = java.util.regex.Pattern.compile(
            "(?i)\\b(at|to|location|coords|coordinates|position)\\s*[:=]?\\s*\\[?\\s*-?\\d+(?:\\.\\d+)?[,\\s]+-?\\d+(?:\\.\\d+)?[,\\s]+-?\\d+(?:\\.\\d+)?\\s*\\]?"
    );

    private static final java.util.regex.Pattern BLOCKPOS_PATTERN = java.util.regex.Pattern.compile(
            "(?i)BlockPos\\s*\\{[^}]*\\}"
    );

    private static final java.util.regex.Pattern XYZ_PATTERN = java.util.regex.Pattern.compile(
            "(?i)\\bx\\s*=\\s*-?\\d+(?:\\.\\d+)?[,\\s]+y\\s*=\\s*-?\\d+(?:\\.\\d+)?[,\\s]+z\\s*=\\s*-?\\d+(?:\\.\\d+)?"
    );

    private static final java.util.regex.Pattern BRACKETED_COORD_PATTERN = java.util.regex.Pattern.compile(
            "[\\[\\(]\\s*-?\\d+(?:\\.\\d+)?[,\\s]+-?\\d+(?:\\.\\d+)?[,\\s]+-?\\d+(?:\\.\\d+)?\\s*[\\]\\)]"
    );

    private static final java.util.regex.Pattern GENERIC_COORD_TRIPLET = java.util.regex.Pattern.compile(
            "\\b-?\\d+(?:\\.\\d+)?(?:,\\s*|\\s+)-?\\d+(?:\\.\\d+)?(?:,\\s*|\\s+)-?\\d+(?:\\.\\d+)?\\b"
    );

    private static boolean isPrivateChat(String message) {
        if (message == null || message.isEmpty()) return false;
        return PRIVATE_CHAT_PATTERN.matcher(message).find();
    }

    public static String sanitizeCoordinates(String message) {
        if (message == null || message.isEmpty()) return "";
        String s = TELEPORT_PATTERN.matcher(message).replaceAll("$1void");
        s = TELEPORTED_MSG_PATTERN.matcher(s).replaceAll("$1void");
        s = COORD_AT_PATTERN.matcher(s).replaceAll("$1 void");
        s = BLOCKPOS_PATTERN.matcher(s).replaceAll("void");
        s = XYZ_PATTERN.matcher(s).replaceAll("void");
        s = BRACKETED_COORD_PATTERN.matcher(s).replaceAll("void");
        s = GENERIC_COORD_TRIPLET.matcher(s).replaceAll("void");
        return s;
    }

    @Override
    public void append(LogEvent event) {
        if (listener == null) {
            return;
        }

        try {
            String message = event.getMessage() != null ? event.getMessage().getFormattedMessage() : "";
            if (isPrivateChat(message)) {
                return; // Hide whisper and team chats from logs
            }
            message = sanitizeCoordinates(message);

            long id = SEQUENCE.incrementAndGet();
            Instant timestamp = Instant.ofEpochMilli(event.getTimeMillis());
            String level = event.getLevel().name();
            String loggerName = event.getLoggerName();
            String threadName = event.getThreadName();

            String throwableStr = null;
            if (event.getThrown() != null) {
                StringWriter sw = new StringWriter();
                PrintWriter pw = new PrintWriter(sw);
                event.getThrown().printStackTrace(pw);
                throwableStr = sw.toString();
            }

            LogEntry entry = new LogEntry(id, timestamp, level, loggerName, threadName, message, throwableStr);
            listener.accept(entry);
        } catch (Exception ignored) {
            // Avoid throwing during log append to keep Minecraft stable
        }
    }
}
