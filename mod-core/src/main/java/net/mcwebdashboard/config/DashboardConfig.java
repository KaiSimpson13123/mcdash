package net.mcwebdashboard.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DashboardConfig {
    private boolean enabled = true;
    private String host = "0.0.0.0";
    private int port = 10019;
    private String username = "admin";
    private String passwordHash = "";
    private String sudoUsername = "sudo";
    private String sudoPasswordHash = "";
    private int sessionTimeoutMinutes = 1440;
    private int logHistorySize = 500;
    private boolean enablePlayerTracking = true;
    private boolean enableMetrics = true;
    private boolean enableChatTracking = true;
    private boolean enableCommandTracking = true;
    private boolean enableLuckPerms = true;
    private boolean enableActivityTracking = true;

    public DashboardConfig() {
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public int getSessionTimeoutMinutes() {
        return sessionTimeoutMinutes;
    }

    public void setSessionTimeoutMinutes(int sessionTimeoutMinutes) {
        this.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }

    public int getLogHistorySize() {
        return logHistorySize;
    }

    public void setLogHistorySize(int logHistorySize) {
        this.logHistorySize = logHistorySize;
    }

    public boolean isEnablePlayerTracking() {
        return enablePlayerTracking;
    }

    public void setEnablePlayerTracking(boolean enablePlayerTracking) {
        this.enablePlayerTracking = enablePlayerTracking;
    }

    public boolean isEnableMetrics() {
        return enableMetrics;
    }

    public void setEnableMetrics(boolean enableMetrics) {
        this.enableMetrics = enableMetrics;
    }

    public boolean isEnableChatTracking() {
        return enableChatTracking;
    }

    public void setEnableChatTracking(boolean enableChatTracking) {
        this.enableChatTracking = enableChatTracking;
    }

    public boolean isEnableCommandTracking() {
        return enableCommandTracking;
    }

    public void setEnableCommandTracking(boolean enableCommandTracking) {
        this.enableCommandTracking = enableCommandTracking;
    }

    public boolean isEnableLuckPerms() {
        return enableLuckPerms;
    }

    public void setEnableLuckPerms(boolean enableLuckPerms) {
        this.enableLuckPerms = enableLuckPerms;
    }

    public boolean isEnableActivityTracking() {
        return enableActivityTracking;
    }

    public void setEnableActivityTracking(boolean enableActivityTracking) {
        this.enableActivityTracking = enableActivityTracking;
    }

    public String getSudoUsername() {
        return sudoUsername != null && !sudoUsername.trim().isEmpty() ? sudoUsername : "sudo";
    }

    public void setSudoUsername(String sudoUsername) {
        this.sudoUsername = sudoUsername;
    }

    public String getSudoPasswordHash() {
        return sudoPasswordHash;
    }

    public void setSudoPasswordHash(String sudoPasswordHash) {
        this.sudoPasswordHash = sudoPasswordHash;
    }
}
