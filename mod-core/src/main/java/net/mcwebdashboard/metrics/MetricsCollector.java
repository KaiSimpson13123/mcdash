package net.mcwebdashboard.metrics;

import com.sun.management.OperatingSystemMXBean;
import net.mcwebdashboard.websocket.WebSocketService;
import net.minecraft.server.MinecraftServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.MemoryUsage;
import java.lang.management.ThreadMXBean;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

public class MetricsCollector {
    private static final Logger LOGGER = LoggerFactory.getLogger("MC-WebDashboard/Metrics");

    private final WebSocketService webSocketService;
    private final MetricHistory metricHistory = new MetricHistory();
    private final OperatingSystemMXBean osBean;
    private final MemoryMXBean memoryBean;
    private final ThreadMXBean threadBean;
    private final List<GarbageCollectorMXBean> gcBeans;

    private volatile MinecraftServer server;
    private final ConcurrentLinkedQueue<Long> recentTickDurationsNanos = new ConcurrentLinkedQueue<>();
    private final AtomicLong totalTicks = new AtomicLong(0);

    private ScheduledExecutorService scheduler;
    private volatile ServerPerformanceSnapshot latestSnapshot;

    public MetricsCollector(WebSocketService webSocketService) {
        this.webSocketService = webSocketService;
        this.osBean = (OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        this.memoryBean = ManagementFactory.getMemoryMXBean();
        this.threadBean = ManagementFactory.getThreadMXBean();
        this.gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
    }

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public void start() {
        if (scheduler != null && !scheduler.isShutdown()) {
            return;
        }

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "MC-WebDashboard-MetricsCollector");
            t.setDaemon(true);
            return t;
        });

        scheduler.scheduleAtFixedRate(this::collectMetrics, 1, 1, TimeUnit.SECONDS);
        LOGGER.info("Metrics collector started (1 Hz non-blocking sampling).");
    }

    public void stop() {
        if (scheduler != null) {
            scheduler.shutdownNow();
            scheduler = null;
        }
    }

    public void recordTick(long durationNanos) {
        totalTicks.incrementAndGet();
        recentTickDurationsNanos.add(durationNanos);
        while (recentTickDurationsNanos.size() > 100) {
            recentTickDurationsNanos.poll();
        }
    }

    private void collectMetrics() {
        try {
            long durationSum = 0;
            int count = 0;
            for (Long nanos : recentTickDurationsNanos) {
                durationSum += nanos;
                count++;
            }

            double avgMspt = count > 0 ? (durationSum / (double) count) / 1_000_000.0 : 0.0;
            double currentTps = avgMspt > 0 ? Math.min(20.0, 1000.0 / Math.max(50.0, avgMspt)) : 20.0;

            double cpuProcess = Math.max(0.0, osBean.getProcessCpuLoad() * 100.0);
            double cpuSystem = Math.max(0.0, osBean.getCpuLoad() * 100.0);

            MemoryUsage heap = memoryBean.getHeapMemoryUsage();
            MemoryUsage nonHeap = memoryBean.getNonHeapMemoryUsage();

            int threadCount = threadBean.getThreadCount();
            int peakThreadCount = threadBean.getPeakThreadCount();

            long totalGcCount = 0;
            long totalGcTime = 0;
            for (GarbageCollectorMXBean gc : gcBeans) {
                long c = gc.getCollectionCount();
                if (c > 0) totalGcCount += c;
                long t = gc.getCollectionTime();
                if (t > 0) totalGcTime += t;
            }

            int onlinePlayers = 0;
            int maxPlayers = 0;
            if (server != null && server.getPlayerList() != null) {
                onlinePlayers = server.getPlayerList().getPlayerCount();
                maxPlayers = server.getPlayerList().getMaxPlayers();
            }

            long uptimeSeconds = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;

            ServerPerformanceSnapshot snapshot = new ServerPerformanceSnapshot(
                    Instant.now(),
                    currentTps,
                    avgMspt,
                    cpuProcess,
                    cpuSystem,
                    heap.getUsed(),
                    heap.getMax(),
                    heap.getCommitted(),
                    nonHeap.getUsed(),
                    threadCount,
                    peakThreadCount,
                    totalGcCount,
                    totalGcTime,
                    onlinePlayers,
                    maxPlayers,
                    uptimeSeconds
            );

            this.latestSnapshot = snapshot;
            this.metricHistory.addSnapshot(snapshot);

            if (webSocketService != null) {
                webSocketService.broadcastStats(snapshot);
            }
        } catch (Exception e) {
            LOGGER.error("Error during metrics collection.", e);
        }
    }

    public ServerPerformanceSnapshot getLatestSnapshot() {
        return latestSnapshot;
    }

    public MetricHistory getMetricHistory() {
        return metricHistory;
    }
}
