package net.mcwebdashboard.database;

import net.mcwebdashboard.util.JsonUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class StorageManager {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Storage");
    private static final Path DATA_DIR = Path.of("config", "mc-webdashboard-data");
    private final Map<String, Object> memoryCache = new ConcurrentHashMap<>();

    public StorageManager() {
        try {
            if (!Files.exists(DATA_DIR)) {
                Files.createDirectories(DATA_DIR);
            }
        } catch (IOException e) {
            LOGGER.error("Failed to create storage directory: {}", DATA_DIR, e);
        }
    }

    public synchronized void saveRecord(String key, Object data) {
        memoryCache.put(key, data);
        try {
            File target = DATA_DIR.resolve(key + ".json").toFile();
            JsonUtil.getMapper().writeValue(target, data);
        } catch (IOException e) {
            LOGGER.error("Failed to persist record for key: {}", key, e);
        }
    }

    public synchronized <T> T loadRecord(String key, Class<T> clazz) {
        Object cached = memoryCache.get(key);
        if (cached != null && clazz.isInstance(cached)) {
            return clazz.cast(cached);
        }

        File target = DATA_DIR.resolve(key + ".json").toFile();
        if (target.exists()) {
            try {
                T val = JsonUtil.getMapper().readValue(target, clazz);
                memoryCache.put(key, val);
                return val;
            } catch (IOException e) {
                LOGGER.error("Failed to read record for key: {}", key, e);
            }
        }
        return null;
    }

    public void flush() {
        LOGGER.debug("Storage flushed.");
    }
}
