# MC-WebDashboard API Reference

This document provides complete technical specifications for the MC-WebDashboard REST API and real-time WebSocket protocol.

---

## 1. Authentication & Session Management

All API routes (except `/api/auth/*` and static assets) require an active session cookie (`DASHBOARD_SESSION`). State-modifying requests (`POST`, `PUT`, `DELETE`) require a valid `X-CSRF-Token` header.

### `GET /api/auth/status`
Checks the server setup state and current authentication session.

**Response `200 OK`:**
```json
{
  "setupRequired": false,
  "authenticated": true,
  "username": "admin",
  "csrfToken": "a8f9c73e-5b12-4d69-9f7e-8c3b9a1e2f4a"
}
```

### `POST /api/auth/setup`
Initializes administrator credentials when no password hash exists in configuration.

**Request Body:**
```json
{
  "username": "admin",
  "password": "SuperSecretPassword123!"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "username": "admin",
  "csrfToken": "a8f9c73e-5b12-4d69-9f7e-8c3b9a1e2f4a"
}
```

### `POST /api/auth/login`
Authenticates with credentials and establishes an HTTP session.

**Request Body:**
```json
{
  "username": "admin",
  "password": "SuperSecretPassword123!"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "username": "admin",
  "csrfToken": "a8f9c73e-5b12-4d69-9f7e-8c3b9a1e2f4a"
}
```

### `POST /api/auth/logout`
Destroys the current authenticated session.

**Response `200 OK`:**
```json
{
  "success": true
}
```

---

## 2. Server & Performance Endpoints

### `GET /api/server`
Returns high-level server status, versioning, MOTD, and uptime.

**Response `200 OK`:**
```json
{
  "status": "ONLINE",
  "motd": "Production Minecraft Server",
  "minecraftVersion": "26.2",
  "javaVersion": "25.0.4.1",
  "jvmVendor": "Microsoft",
  "jvmVersion": "25.0.4.1+1-LTS",
  "fabricLoaderVersion": "0.19.3",
  "uptimeSeconds": 14205,
  "onlinePlayers": 4,
  "maxPlayers": 50
}
```

### `GET /api/stats`
Returns the most recent 1-second telemetry snapshot.

**Response `200 OK`:**
```json
{
  "timestamp": "2026-09-14T16:00:00Z",
  "tps": 20.0,
  "mspt": 4.82,
  "cpuProcess": 12.4,
  "cpuSystem": 22.1,
  "heapUsed": 1048576000,
  "heapCommitted": 2147483648,
  "heapMax": 4294967296,
  "nonHeapUsed": 134217728,
  "threadCount": 48,
  "peakThreadCount": 62,
  "gcCount": 14,
  "gcTimeMillis": 120,
  "onlinePlayers": 4,
  "maxPlayers": 50,
  "uptimeSeconds": 14205
}
```

### `GET /api/performance`
Retrieves current telemetry along with 1-minute, 1-hour, and 24-hour historical buffers.

**Response `200 OK`:**
```json
{
  "current": { ... },
  "history1m": [ ... ],
  "history1h": [ ... ],
  "history24h": [ ... ]
}
```

---

## 3. Player Management Endpoints

### `GET /api/players`
Returns all online players with full position, health, food, and session information.

**Response `200 OK`:**
```json
[
  {
    "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    "username": "Notch",
    "isOp": true,
    "prefix": "<red>[Owner]</red> ",
    "suffix": "",
    "primaryGroup": "owner",
    "health": 20.0,
    "maxHealth": 20.0,
    "food": 20,
    "xpLevel": 42,
    "ping": 18,
    "gameMode": "survival",
    "dimension": "minecraft:overworld",
    "x": 124.5,
    "y": 68.0,
    "z": -250.2,
    "onlineDuration": 3600,
    "firstJoin": "2026-09-14T15:00:00Z",
    "lastSeen": "2026-09-14T16:00:00Z"
  }
]
```

### `GET /api/player/{uuid}`
Returns detailed player information including inventory items, ender chest items, and LuckPerms permissions.

### `POST /api/players/{uuid}/kick`
Kicks a player from the server.
```json
{ "reason": "Disruptive behavior" }
```

### `POST /api/players/{uuid}/ban`
Bans a player from the server.
```json
{ "reason": "Violating rules" }
```

### `POST /api/players/{uuid}/kill`
Kills the player in-game.

### `POST /api/players/{uuid}/op`
Grants Minecraft server operator status.

### `POST /api/players/{uuid}/deop`
Revokes Minecraft server operator status.

### `POST /api/players/{uuid}/teleport`
Teleports the player to specified coordinates and dimension.
```json
{
  "x": 0.5,
  "y": 72.0,
  "z": 0.5,
  "dimension": "minecraft:overworld"
}
```

---

## 4. World, Logs & Activity Endpoints

### `GET /api/world`
Returns global world stats, seed, weather, spawn coordinates, world border, and dimension breakdown (Overworld, Nether, End).

### `GET /api/logs?level={level}&search={query}&limit={limit}`
Retrieves captured console log entries from the in-memory buffer.

### `GET /api/logs/download`
Downloads the entire console buffer as an attachment (`server-console.log`).

### `GET /api/activity?limit={limit}&category={category}`
Retrieves audit events (joins, leaves, deaths, chats, commands, luckperms changes).

### `POST /api/chat/send`
Broadcasts an administrative chat message to in-game players.
```json
{ "message": "Server will restart for scheduled maintenance in 10 minutes." }
```

---

## 5. LuckPerms Endpoints

### `GET /api/luckperms/groups`
Lists all LuckPerms groups with prefixes, suffixes, weights, parents, and active online member counts.

### `GET /api/luckperms/distribution`
Returns a key-value mapping of group names to online member counts for chart visualization.

### `GET /api/luckperms/user/{uuid}`
Returns full LuckPerms permissions, meta keys, and temporary node expiries for a specific player.

---

## 6. Real-Time WebSockets

Clients connect to WebSocket channels under `/ws/{topic}`.

| Endpoint | Update Frequency | Description |
|---|---|---|
| `/ws/stats` | 1 second | Broadcasts `ServerPerformanceSnapshot` (TPS, MSPT, CPU, Memory). |
| `/ws/logs` | Real-time | Broadcasts newly logged console lines formatted with severity level and logger name. |
| `/ws/players` | Event-driven | Broadcasts player join, leave, and coordinate/stat changes. |
| `/ws/activity` | Event-driven | Broadcasts recent activity events across all tracked categories. |
| `/ws/luckperms` | Event-driven | Broadcasts permission, group, or prefix modifications. |

All WebSocket connections support heartbeat ping/pong (`"ping"` -> `"pong"`).
