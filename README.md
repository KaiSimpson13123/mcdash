# MC-WebDashboard

<p align="center">
  <img src="https://img.shields.io/badge/Minecraft-26.2-blue?style=for-the-badge&logo=minecraft" alt="Minecraft 26.2" />
  <img src="https://img.shields.io/badge/Java-25-orange?style=for-the-badge&logo=openjdk" alt="Java 25" />
  <img src="https://img.shields.io/badge/Fabric%20Loader-0.19.3%2B-blueviolet?style=for-the-badge" alt="Fabric Loader" />
  <img src="https://img.shields.io/badge/Loom-1.17%2B-darkgreen?style=for-the-badge" alt="Loom" />
  <img src="https://img.shields.io/badge/Frontend-React%2018%20%7C%20Tailwind-38bdf8?style=for-the-badge&logo=react" alt="React & Tailwind" />
  <img src="https://img.shields.io/badge/WebSockets-Real--Time-emerald?style=for-the-badge" alt="WebSockets" />
</p>

**MC-WebDashboard** is an enterprise-grade, high-performance **Fabric SERVER-SIDE** administration dashboard for **Minecraft 26.2** running on **Java 25**.

It embeds a zero-external-dependency web server directly into your Minecraft server, offering a monitoring and management experience comparable to **Datadog**, **Grafana**, and modern SaaS administrative panels.

---

## 🌟 Key Features

### ⚡ Real-Time Server Monitoring
- **Live TPS & MSPT Telemetry**: Sub-second resolution of server tick rate and computing duration.
- **Hardware Utilization**: Live JVM Heap usage (Used, Committed, Max), Non-Heap Metaspace, and Process vs System CPU metrics.
- **Dynamic Time & Weather**: In-game 24-hour clock, day counter, and atmospheric condition tracking (Clear, Rain, Thunder).
- **Interactive Recharts**: 1-minute, 1-hour, and 24-hour historical trends for TPS, tick time, memory pools, and player concurrency.

### 👥 Comprehensive Player Management
- **Live Player Table**: Real-time position coordinates (X, Y, Z), dimension badges, health, hunger, ping, XP level, and session duration.
- **Detailed Player Profiles**: 3D player head avatars, interactive inventory summaries, Ender Chest slot inspector, and play session logs.
- **Administrative Controls**: Kick, Ban, Kill, Operator grant/revoke, and instantaneous Coordinate Teleportation with confirmation modals.

### 🛡️ First-Class LuckPerms Integration
- **Soft Dependency Architecture**: Gracefully adapts whether LuckPerms is installed or missing; never crashes if LuckPerms is absent.
- **Rich Prefix & Suffix Rendering**: True-to-game badge rendering supporting MiniMessage, Adventure formatting, RGB Hex gradients (`#ffffff`), and legacy color codes (`§a`, `&e`).
- **Visual Hierarchy Tree**: Visual group inheritance display (`Owner ➔ Admin ➔ Moderator ➔ Member`) with weight tracking.
- **Distribution Analytics**: Interactive Recharts Pie and Bar charts displaying online group shares.
- **Permissions Inspector**: Real-time permission node lookup and temporary permission countdowns.

### 💻 Real-Time Console Streaming
- **Custom Log4j 2 Appender**: Non-blocking in-memory capture of the last 500 server log events.
- **Severity Filtering & Color-Coding**: Visual differentiation for `INFO`, `WARN`, `ERROR`, and `DEBUG` events.
- **Terminal Capabilities**: Pause/resume stream, regex search, auto-scroll toggle, and one-click `.log` file export.

### 🌍 World & Dimension Diagnostics
- **World Metadata**: Seed, difficulty, spawn coordinates, and world border radius/center.
- **Dimension Breakdown**: Real-time statistics for Overworld, The Nether, and The End including loaded chunks, entities, and active mob counts.

### 💬 Live Chat & Audit Feeds
- **In-Game Chat Feed**: Live streaming of player conversations formatted with LuckPerms group badges.
- **Server Broadcast Form**: Send administrative announcements directly to players from the browser.
- **Comprehensive Activity Feed**: Real-time audit log of joins, disconnects, deaths, command executions, permission changes, and server lifecycle events.

### 🔒 Enterprise Security
- **BCrypt 12-Round Salted Hashing**: Secure storage of administrator credentials.
- **Interactive First-Run Setup Wizard**: Enforces credential creation prior to unlocking the dashboard.
- **Strict Session Security**: `HttpOnly; SameSite=Strict` cookies with configurable timeout.
- **CSRF Token Route Validation**: Rejects forged state-changing API operations.
- **Brute-Force Protection**: IP-based rate limiting to prevent unauthorized credential guessing.

---

## 🚀 Quickstart & Installation

### 1. Requirements
- **Server Platform**: Minecraft 26.2 Dedicated Server
- **Fabric Loader**: `0.19.3` or newer
- **Fabric API**: `0.159.0+26.2` or newer
- **Java Runtime**: Java 25 (e.g. Microsoft OpenJDK 25, Temurin 25)
- *(Optional)* **LuckPerms**: Latest Fabric build for permission management

### 2. Installation
1. Download `mc-webdashboard-1.0.0.jar` from Releases.
2. Place the JAR into your server's `mods/` directory.
3. Start your Minecraft server. The mod will automatically generate `config/mc-webdashboard.json` and start the web dashboard on port `8080`.

### 3. First-Run Setup Wizard
1. Open your web browser and navigate to:
   ```
   http://localhost:8080
   ```
2. You will be greeted by the **Setup Wizard**:
   - Set your administrator username (default: `admin`).
   - Create a strong password.
3. Click **Complete Setup**. The password will be hashed with BCrypt and saved to `config/mc-webdashboard.json`.
4. Sign in to access your dashboard!

---

## ⚙️ Configuration

The configuration file is saved at `config/mc-webdashboard.json`:

```json
{
  "enabled": true,
  "host": "0.0.0.0",
  "port": 8080,
  "username": "admin",
  "passwordHash": "$2a$12$...",
  "sessionTimeoutMinutes": 1440,
  "logHistorySize": 500,
  "enablePlayerTracking": true,
  "enableMetrics": true,
  "enableChatTracking": true,
  "enableCommandTracking": true,
  "enableLuckPerms": true,
  "enableActivityTracking": true
}
```

*For in-depth configuration options and explanations, see [Configuration Guide](docs/configuration.md).*

---

## 🌐 Production Reverse Proxy Setup

For public internet exposure, bind `host` to `"127.0.0.1"` in `mc-webdashboard.json` and proxy through Nginx or Caddy with SSL.

### Nginx Example
```nginx
server {
    listen 443 ssl http2;
    server_name mc.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy Example
```caddy
mc.yourdomain.com {
    reverse_proxy 127.0.0.1:8080
}
```

---

## 🛠️ Building From Source

### Prerequisites
- **Java 25 SDK**
- **Node.js 20+** & **npm**

### Build Commands
```bash
# 1. Clone repository
git clone https://github.com/your-repo/mc-webdashboard.git
cd mc-webdashboard

# 2. Build mod and bundle web dashboard assets
./gradlew build
```

The resulting mod JAR will be generated at:
```
mod-core/build/libs/mc-webdashboard-1.0.0.jar
```

---

## 📚 Documentation
- [System Architecture](docs/architecture.md)
- [REST & WebSocket API Reference](docs/api-reference.md)
- [Configuration Reference](docs/configuration.md)

---

## 📄 License
This project is licensed under the MIT License.
