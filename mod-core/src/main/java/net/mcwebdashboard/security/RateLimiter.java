package net.mcwebdashboard.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class RateLimiter {
    private static class AttemptRecord {
        int failedAttempts = 0;
        Instant lockoutUntil = Instant.EPOCH;
        Instant lastAttempt = Instant.now();
    }

    private final Map<String, AttemptRecord> records = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final Duration lockoutDuration;

    public RateLimiter(int maxAttempts, Duration lockoutDuration) {
        this.maxAttempts = maxAttempts;
        this.lockoutDuration = lockoutDuration;
    }

    public RateLimiter() {
        this(5, Duration.ofMinutes(15));
    }

    public synchronized boolean isBlocked(String ip) {
        AttemptRecord record = records.get(ip);
        if (record == null) {
            return false;
        }

        if (Instant.now().isBefore(record.lockoutUntil)) {
            return true;
        }

        // Reset if lockout period expired and last attempt was long ago
        if (Duration.between(record.lastAttempt, Instant.now()).toMinutes() > 30) {
            records.remove(ip);
            return false;
        }

        return false;
    }

    public synchronized void recordFailure(String ip) {
        AttemptRecord record = records.computeIfAbsent(ip, k -> new AttemptRecord());
        record.failedAttempts++;
        record.lastAttempt = Instant.now();

        if (record.failedAttempts >= maxAttempts) {
            record.lockoutUntil = Instant.now().plus(lockoutDuration);
        }
    }

    public synchronized void recordSuccess(String ip) {
        records.remove(ip);
    }
}
