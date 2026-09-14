# MC-WebDashboard Configuration Guide

MC-WebDashboard stores its server configuration in `config/mc-webdashboard.json` located in your Minecraft server root directory.

---

## Default Configuration

When launching the server for the first time, MC-WebDashboard automatically generates `config/mc-webdashboard.json` if it does not exist:

```json
{
  "enabled": true,
  "host": "0.0.0.0",
  "port": 8080,
  "username": "admin",
  "passwordHash": "",
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

---

## Configuration Options

### Network & Web Server Settings

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Enables or disables the entire dashboard web server and background collectors. |
| `host` | `string` | `"0.0.0.0"` | The network interface IP address to bind to. `"0.0.0.0"` binds to all interfaces. Use `"127.0.0.1"` if hosting behind a reverse proxy on the same machine. |
| `port` | `integer` | `8080` | The TCP port used to serve HTTP requests and WebSocket connections. |

### Security & Authentication Settings

| Property | Type | Default | Description |
|---|---|---|---|
| `username` | `string` | `"admin"` | Administrator username for dashboard access. |
| `passwordHash` | `string` | `""` | Salted BCrypt (cost 12) hash of the administrator password. When empty, the dashboard displays the initial **Setup Wizard**. |
| `sessionTimeoutMinutes` | `integer` | `1440` | Duration in minutes before an inactive web session expires (default: 24 hours). |

### Logging & History Buffers

| Property | Type | Default | Description |
|---|---|---|---|
| `logHistorySize` | `integer` | `500` | Maximum number of Log4j 2 console events held in memory for streaming and display. |

### Feature Toggles

| Property | Type | Default | Description |
|---|---|---|---|
| `enablePlayerTracking` | `boolean` | `true` | Enables real-time player tracking, coordinates, inventory inspection, and session durations. |
| `enableMetrics` | `boolean` | `true` | Enables the 1-second rolling telemetry collector for TPS, MSPT, CPU, and memory metrics. |
| `enableChatTracking` | `boolean` | `true` | Enables live audit and broadcasting of in-game chat messages. |
| `enableCommandTracking` | `boolean` | `true` | Records player command execution in the audit feed. |
| `enableLuckPerms` | `boolean` | `true` | Enables LuckPerms integration for group hierarchies, permissions, and formatted prefixes. |
| `enableActivityTracking` | `boolean` | `true` | Enables event feed logging (joins, leaves, deaths, advancements, dimension travel). |

---

## Security Best Practices

1. **Change Default Port**: If port 8080 conflicts with other services, change `port` to an open port (e.g., `8443`, `9090`).
2. **Reverse Proxy & SSL**: In production, bind `host` to `"127.0.0.1"` and use Nginx, Caddy, or Cloudflare Tunnels to provide HTTPS/TLS encryption.
3. **Strong Password**: Ensure the password created during the Setup Wizard is at least 12 characters long with mixed alphanumeric and special characters.
