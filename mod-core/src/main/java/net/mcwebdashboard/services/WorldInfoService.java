package net.mcwebdashboard.services;

import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.level.border.WorldBorder;

import java.util.*;

public class WorldInfoService {
    private volatile MinecraftServer server;

    public void setServer(MinecraftServer server) {
        this.server = server;
    }

    public Map<String, Object> getWorldStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        if (server == null) {
            return stats;
        }

        ServerLevel overworld = server.overworld();
        if (overworld == null) {
            return stats;
        }

        long timeOfDay = overworld.getGameTime();
        long dayCount = timeOfDay / 24000L;
        long timeInDay = timeOfDay % 24000L;

        String weather = "CLEAR";
        if (overworld.isThundering()) {
            weather = "THUNDER";
        } else if (overworld.isRaining()) {
            weather = "RAIN";
        }

        BlockPos spawn = overworld.getRespawnData() != null ? overworld.getRespawnData().pos() : BlockPos.ZERO;
        WorldBorder border = overworld.getWorldBorder();

        stats.put("seed", "Redacted");
        stats.put("difficulty", server.getWorldData().getDifficulty().getSerializedName());
        stats.put("dayCount", dayCount);
        stats.put("worldTime", timeInDay);
        stats.put("weather", weather);
        stats.put("spawnLocation", Map.of("redacted", true));
        stats.put("worldBorder", Map.of(
                "centerX", 0,
                "centerZ", 0,
                "size", border.getSize()
        ));

        int totalLoadedChunks = 0;
        int totalEntities = 0;
        int totalMobs = 0;

        List<Map<String, Object>> dimensions = new ArrayList<>();

        for (ServerLevel world : server.getAllLevels()) {
            String dimId = world.dimension().identifier().toString();
            int chunks = world.getChunkSource().getLoadedChunksCount();
            int players = world.players().size();

            int entitiesInWorld = 0;
            int mobsInWorld = 0;

            for (Entity entity : world.getAllEntities()) {
                entitiesInWorld++;
                if (entity instanceof Mob) {
                    mobsInWorld++;
                }
            }

            totalLoadedChunks += chunks;
            totalEntities += entitiesInWorld;
            totalMobs += mobsInWorld;

            String simpleName = dimId.substring(dimId.indexOf(':') + 1);
            if (simpleName.equals("overworld")) simpleName = "Overworld";
            else if (simpleName.equals("the_nether")) simpleName = "The Nether";
            else if (simpleName.equals("the_end")) simpleName = "The End";

            dimensions.add(Map.of(
                    "id", dimId,
                    "name", simpleName,
                    "players", players,
                    "loadedChunks", chunks,
                    "entities", entitiesInWorld,
                    "mobs", mobsInWorld
            ));
        }

        stats.put("loadedChunks", totalLoadedChunks);
        stats.put("entityCount", totalEntities);
        stats.put("mobCount", totalMobs);
        stats.put("dimensions", dimensions);

        return stats;
    }
}
