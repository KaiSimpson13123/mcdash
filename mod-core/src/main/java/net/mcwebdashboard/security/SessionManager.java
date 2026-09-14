package net.mcwebdashboard.security;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class SessionManager {
    public static class Session {
        private final String sessionId;
        private final String username;
        private final String csrfToken;
        private final String ipAddress;
        private final Instant createdAt;
        private volatile Instant lastAccessedAt;

        public Session(String sessionId, String username, String csrfToken, String ipAddress) {
            this.sessionId = sessionId;
            this.username = username;
            this.csrfToken = csrfToken;
            this.ipAddress = ipAddress;
            this.createdAt = Instant.now();
            this.lastAccessedAt = Instant.now();
        }

        public String getSessionId() {
            return sessionId;
        }

        public String getUsername() {
            return username;
        }

        public String getCsrfToken() {
            return csrfToken;
        }

        public String getIpAddress() {
            return ipAddress;
        }

        public Instant getCreatedAt() {
            return createdAt;
        }

        public Instant getLastAccessedAt() {
            return lastAccessedAt;
        }

        public void touch() {
            this.lastAccessedAt = Instant.now();
        }
    }

    private final Map<String, Session> activeSessions = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();
    private final ScheduledExecutorService cleanupExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "MC-WebDashboard-SessionCleanup");
        t.setDaemon(true);
        return t;
    });

    public SessionManager() {
        cleanupExecutor.scheduleAtFixedRate(this::cleanExpiredSessions, 1, 1, TimeUnit.HOURS);
    }

    private String generateSecureToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public Session createSession(String username, String ipAddress) {
        String sessionId = generateSecureToken(32);
        String csrfToken = generateSecureToken(24);
        Session session = new Session(sessionId, username, csrfToken, ipAddress);
        activeSessions.put(sessionId, session);
        return session;
    }

    public Session getSession(String sessionId, int timeoutMinutes) {
        if (sessionId == null) {
            return null;
        }
        Session session = activeSessions.get(sessionId);
        if (session == null) {
            return null;
        }

        if (Duration.between(session.getLastAccessedAt(), Instant.now()).toMinutes() >= timeoutMinutes) {
            activeSessions.remove(sessionId);
            return null;
        }

        session.touch();
        return session;
    }

    public void invalidateSession(String sessionId) {
        if (sessionId != null) {
            activeSessions.remove(sessionId);
        }
    }

    public void cleanExpiredSessions() {
        Instant threshold = Instant.now().minus(Duration.ofHours(24));
        activeSessions.entrySet().removeIf(entry -> entry.getValue().getLastAccessedAt().isBefore(threshold));
    }

    public void shutdown() {
        cleanupExecutor.shutdownNow();
        activeSessions.clear();
    }
}
