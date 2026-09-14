package net.mcwebdashboard.metrics;

import java.time.Instant;

public class ServerPerformanceSnapshot {
    private final Instant timestamp;
    private final double tps;
    private final double mspt;
    private final double cpuProcess;
    private final double cpuSystem;
    private final long heapUsed;
    private final long heapMax;
    private final long heapCommitted;
    private final long nonHeapUsed;
    private final int threadCount;
    private final int peakThreadCount;
    private final long gcCount;
    private final long gcTimeMillis;
    private final int onlinePlayers;
    private final int maxPlayers;
    private final long uptimeSeconds;

    public ServerPerformanceSnapshot(
            Instant timestamp,
            double tps,
            double mspt,
            double cpuProcess,
            double cpuSystem,
            long heapUsed,
            long heapMax,
            long heapCommitted,
            long nonHeapUsed,
            int threadCount,
            int peakThreadCount,
            long gcCount,
            long gcTimeMillis,
            int onlinePlayers,
            int maxPlayers,
            long uptimeSeconds) {
        this.timestamp = timestamp;
        this.tps = Math.round(tps * 100.0) / 100.0;
        this.mspt = Math.round(mspt * 100.0) / 100.0;
        this.cpuProcess = Math.round(cpuProcess * 10.0) / 10.0;
        this.cpuSystem = Math.round(cpuSystem * 10.0) / 10.0;
        this.heapUsed = heapUsed;
        this.heapMax = heapMax;
        this.heapCommitted = heapCommitted;
        this.nonHeapUsed = nonHeapUsed;
        this.threadCount = threadCount;
        this.peakThreadCount = peakThreadCount;
        this.gcCount = gcCount;
        this.gcTimeMillis = gcTimeMillis;
        this.onlinePlayers = onlinePlayers;
        this.maxPlayers = maxPlayers;
        this.uptimeSeconds = uptimeSeconds;
    }

    public String getTimestamp() {
        return timestamp != null ? timestamp.toString() : "";
    }

    public double getTps() {
        return tps;
    }

    public double getMspt() {
        return mspt;
    }

    public double getCpuProcess() {
        return cpuProcess;
    }

    public double getCpuSystem() {
        return cpuSystem;
    }

    public long getHeapUsed() {
        return heapUsed;
    }

    public long getHeapMax() {
        return heapMax;
    }

    public long getHeapCommitted() {
        return heapCommitted;
    }

    public long getNonHeapUsed() {
        return nonHeapUsed;
    }

    public int getThreadCount() {
        return threadCount;
    }

    public int getPeakThreadCount() {
        return peakThreadCount;
    }

    public long getGcCount() {
        return gcCount;
    }

    public long getGcTimeMillis() {
        return gcTimeMillis;
    }

    public int getOnlinePlayers() {
        return onlinePlayers;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public long getUptimeSeconds() {
        return uptimeSeconds;
    }
}
