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

    public boolean verifyUser(String username, String rawPassword) {
        if (username == null || rawPassword == null) {
            return false;
        }
        if (isSetupRequired()) {
            return false;
        }
        DashboardConfig config = configManager.getConfig();
        String u = username.trim();

        // 1. Sudo user authentication
        if ("sudo".equalsIgnoreCase(u)) {
            String sudoHash = config.getSudoPasswordHash();
            if (sudoHash != null && !sudoHash.trim().isEmpty()) {
                BCrypt.Result result = BCrypt.verifyer().verify(rawPassword.toCharArray(), sudoHash);
                if (result.verified) return true;
            }
            // Fallback to admin setup password if sudo hash not yet set
            String adminHash = config.getPasswordHash();
            if (adminHash != null && !adminHash.trim().isEmpty()) {
                BCrypt.Result result = BCrypt.verifyer().verify(rawPassword.toCharArray(), adminHash);
                if (result.verified) return true;
            }
            return "sudo".equals(rawPassword);
        }

        // 2. Configured admin user authentication
        String configuredUser = config.getUsername();
        if (u.equalsIgnoreCase(configuredUser)) {
            String hash = config.getPasswordHash();
            if (hash == null || hash.trim().isEmpty()) {
                return false;
            }
            BCrypt.Result result = BCrypt.verifyer().verify(rawPassword.toCharArray(), hash);
            return result.verified;
        }

        return false;
    }

    public boolean completeSetup(String username, String password) {
        if (username == null || username.trim().isEmpty() || password == null || password.length() < 6) {
            return false;
        }

        String hash = hashPassword(password);
        DashboardConfig config = configManager.getConfig();
        config.setUsername(username.trim());
        config.setPasswordHash(hash);
        config.setSudoUsername("sudo");
        if (config.getSudoPasswordHash() == null || config.getSudoPasswordHash().trim().isEmpty()) {
            config.setSudoPasswordHash(hash);
        }
        boolean saved = configManager.save();
        if (saved) {
            LOGGER.info("Setup completed successfully for user: {} (and sudo user ready)", username.trim());
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

    public boolean updateSudoPassword(String newPassword) {
        if (newPassword == null || newPassword.length() < 4) {
            return false;
        }
        DashboardConfig config = configManager.getConfig();
        config.setSudoPasswordHash(hashPassword(newPassword));
        return configManager.save();
    }

    public boolean updateAdminPassword(String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            return false;
        }
        DashboardConfig config = configManager.getConfig();
        config.setPasswordHash(hashPassword(newPassword));
        return configManager.save();
    }

    public boolean updatePassword(String username, String newPassword) {
        if (username == null || username.trim().isEmpty() || newPassword == null || newPassword.length() < 6) {
            return false;
        }
        String u = username.trim();
        if ("sudo".equalsIgnoreCase(u)) {
            return updateSudoPassword(newPassword);
        }
        DashboardConfig config = configManager.getConfig();
        String configuredAdmin = config.getUsername();
        if (configuredAdmin == null || configuredAdmin.trim().isEmpty() || u.equalsIgnoreCase(configuredAdmin.trim())) {
            config.setPasswordHash(hashPassword(newPassword));
            return configManager.save();
        }
        return false;
    }

    public boolean changeUserPassword(String username, String currentPassword, String newPassword) {
        if (username == null || username.trim().isEmpty() || newPassword == null || newPassword.length() < 6) {
            return false;
        }
        String u = username.trim();
        if (currentPassword != null && !currentPassword.isEmpty()) {
            if (!verifyUser(u, currentPassword)) {
                return false;
            }
        }
        return updatePassword(u, newPassword);
    }
}
