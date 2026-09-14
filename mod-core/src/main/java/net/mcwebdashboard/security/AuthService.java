package net.mcwebdashboard.security;

import at.favre.lib.crypto.bcrypt.BCrypt;
import net.mcwebdashboard.config.ConfigManager;
import net.mcwebdashboard.config.DashboardConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AuthService {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Auth");
    private final ConfigManager configManager;

    public AuthService(ConfigManager configManager) {
        this.configManager = configManager;
    }

    public boolean isSetupRequired() {
        DashboardConfig config = configManager.getConfig();
        String hash = config.getPasswordHash();
        return hash == null || hash.trim().isEmpty();
    }

    public String hashPassword(String rawPassword) {
        return BCrypt.withDefaults().hashToString(12, rawPassword.toCharArray());
    }

    public boolean verifyPassword(String rawPassword) {
        if (isSetupRequired()) {
            return false;
        }
        DashboardConfig config = configManager.getConfig();
        String hash = config.getPasswordHash();
        BCrypt.Result result = BCrypt.verifyer().verify(rawPassword.toCharArray(), hash);
        return result.verified;
    }

    public boolean completeSetup(String username, String password) {
        if (username == null || username.trim().isEmpty() || password == null || password.length() < 6) {
            return false;
        }

        String hash = hashPassword(password);
        DashboardConfig config = configManager.getConfig();
        config.setUsername(username.trim());
        config.setPasswordHash(hash);
        boolean saved = configManager.save();
        if (saved) {
            LOGGER.info("Setup completed successfully for user: {}", username.trim());
        } else {
            LOGGER.error("Failed to save credentials during setup.");
        }
        return saved;
    }

    public boolean updateCredentials(String currentPassword, String newUsername, String newPassword) {
        if (!verifyPassword(currentPassword)) {
            return false;
        }

        DashboardConfig config = configManager.getConfig();
        if (newUsername != null && !newUsername.trim().isEmpty()) {
            config.setUsername(newUsername.trim());
        }
        if (newPassword != null && newPassword.length() >= 6) {
            config.setPasswordHash(hashPassword(newPassword));
        }

        return configManager.save();
    }
}
