package net.mcwebdashboard.config;

import net.mcwebdashboard.util.JsonUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public class ConfigManager {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Config");
    private static final Path CONFIG_PATH = Path.of("config", "mc-webdashboard.json");
    private DashboardConfig config;

    public ConfigManager() {
        this.config = new DashboardConfig();
    }

    public synchronized DashboardConfig load() {
        try {
            File configFile = CONFIG_PATH.toFile();
            if (!configFile.exists()) {
                LOGGER.info("Configuration file not found. Creating default at {}", CONFIG_PATH);
                File parent = configFile.getParentFile();
                if (parent != null && !parent.exists()) {
                    parent.mkdirs();
                }
                this.config = new DashboardConfig();
                save();
                return this.config;
            }

            this.config = JsonUtil.getMapper().readValue(configFile, DashboardConfig.class);
            if (this.config == null) {
                this.config = new DashboardConfig();
            }
            LOGGER.info("Successfully loaded dashboard configuration.");
        } catch (IOException e) {
            LOGGER.error("Failed to load configuration from {}. Using defaults.", CONFIG_PATH, e);
            this.config = new DashboardConfig();
        }
        return this.config;
    }

    public synchronized boolean save() {
        try {
            File configFile = CONFIG_PATH.toFile();
            File parent = configFile.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }

            Path tempPath = Path.of("config", "mc-webdashboard.json.tmp");
            JsonUtil.getMapper().writeValue(tempPath.toFile(), this.config);
            Files.move(tempPath, CONFIG_PATH, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            LOGGER.info("Configuration successfully persisted to disk.");
            return true;
        } catch (IOException e) {
            LOGGER.error("Failed to save configuration to {}", CONFIG_PATH, e);
            return false;
        }
    }

    public DashboardConfig getConfig() {
        return config;
    }

    public void setConfig(DashboardConfig config) {
        this.config = config;
    }
}
