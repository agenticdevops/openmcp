---
id: gateway-config
title: Gateway Configuration
sidebar_position: 1
---

# Gateway Configuration

The gateway configuration file (`config.yaml`) controls the core server settings.

## Complete Reference

```yaml
# Required: Address and port to listen on
listen_addr: "0.0.0.0:4444"

# Required: Path to server catalog file
catalog_path: "catalog.yaml"

# Optional: Logging level (default: "info")
# Values: trace, debug, info, warn, error
log_level: "info"

# Optional: API key for authentication
# When set, all requests must include this key
api_key: "${MCP_GATEWAY_API_KEY}"

# Optional: Idle timeout in seconds (default: 300)
# Servers are stopped after this period of inactivity
idle_timeout_seconds: 300

# Optional: Health check interval in seconds (default: 30)
# How often to check running server health
health_check_interval_seconds: 30

# Optional: Maximum concurrent connections per server (default: 10)
max_connections_per_server: 10

# Optional: Request timeout in seconds (default: 30)
# Maximum time to wait for a server response
request_timeout_seconds: 30

# Optional: Enable CORS (default: true)
cors_enabled: true

# Optional: CORS allowed origins (default: ["*"])
cors_origins:
  - "http://localhost:3000"
  - "https://app.example.com"
```

## Configuration Options

### listen_addr

**Type:** String
**Required:** Yes
**Default:** None

The address and port the HTTP server binds to.

```yaml
# Listen on all interfaces, port 4444
listen_addr: "0.0.0.0:4444"

# Listen only on localhost
listen_addr: "127.0.0.1:4444"

# Use a different port
listen_addr: "0.0.0.0:8080"
```

### catalog_path

**Type:** String
**Required:** Yes
**Default:** None

Path to the server catalog file. Supports:
- Absolute paths: `/etc/mcp-gateway/catalog.yaml`
- Relative paths: `./catalog.yaml` (relative to config file)
- Home directory: `~/mcp/catalog.yaml`

```yaml
# Relative to config file location
catalog_path: "catalog.yaml"

# Absolute path
catalog_path: "/etc/mcp-gateway/servers.yaml"
```

### log_level

**Type:** String
**Required:** No
**Default:** `"info"`

Controls logging verbosity. The levels are:

| Level | Description |
|-------|-------------|
| `trace` | Very detailed debugging (includes all message content) |
| `debug` | Debugging information (connection details, lifecycle) |
| `info` | Normal operation (startup, reload, requests) |
| `warn` | Warning conditions (timeouts, retries) |
| `error` | Error conditions only |

```yaml
# Development
log_level: "debug"

# Production
log_level: "warn"
```

You can also set via environment:
```bash
RUST_LOG=debug gateway-http --config config.yaml
```

### api_key

**Type:** String
**Required:** No
**Default:** None (no authentication)

When set, all API requests must include this key. See [Authentication](/docs/configuration/authentication) for details.

```yaml
# From environment variable (recommended)
api_key: "${MCP_GATEWAY_API_KEY}"

# Inline (not recommended for production)
api_key: "your-secret-key"
```

### idle_timeout_seconds

**Type:** Integer
**Required:** No
**Default:** `300` (5 minutes)

Time in seconds after which an idle server is automatically stopped.

```yaml
# Stop after 10 minutes of inactivity
idle_timeout_seconds: 600

# Stop after 1 minute (aggressive cleanup)
idle_timeout_seconds: 60

# Never auto-stop (not recommended)
idle_timeout_seconds: 0
```

### health_check_interval_seconds

**Type:** Integer
**Required:** No
**Default:** `30`

How often to check the health of running servers.

```yaml
# Check every minute
health_check_interval_seconds: 60

# Check every 10 seconds (more responsive)
health_check_interval_seconds: 10
```

### max_connections_per_server

**Type:** Integer
**Required:** No
**Default:** `10`

Maximum number of concurrent connections to maintain per server.

```yaml
# Allow more concurrent requests
max_connections_per_server: 50

# Limit to single connection
max_connections_per_server: 1
```

### request_timeout_seconds

**Type:** Integer
**Required:** No
**Default:** `30`

Maximum time to wait for a server response before timing out.

```yaml
# Longer timeout for slow operations
request_timeout_seconds: 120

# Short timeout for fast operations
request_timeout_seconds: 10
```

### cors_enabled

**Type:** Boolean
**Required:** No
**Default:** `true`

Enable or disable CORS headers.

```yaml
# Disable CORS (if behind a proxy that handles it)
cors_enabled: false
```

### cors_origins

**Type:** Array of Strings
**Required:** No
**Default:** `["*"]`

Allowed CORS origins. Only used when `cors_enabled: true`.

```yaml
# Allow specific origins
cors_origins:
  - "http://localhost:3000"
  - "https://app.example.com"

# Allow all origins (default)
cors_origins:
  - "*"
```

## Example Configurations

### Development

```yaml
listen_addr: "127.0.0.1:4444"
catalog_path: "catalog.yaml"
log_level: "debug"
idle_timeout_seconds: 60
```

### Production

```yaml
listen_addr: "0.0.0.0:4444"
catalog_path: "/etc/mcp-gateway/catalog.yaml"
log_level: "warn"
api_key: "${MCP_GATEWAY_API_KEY}"
idle_timeout_seconds: 300
health_check_interval_seconds: 30
cors_origins:
  - "https://app.example.com"
```

### High-Traffic

```yaml
listen_addr: "0.0.0.0:4444"
catalog_path: "catalog.yaml"
log_level: "info"
idle_timeout_seconds: 600
max_connections_per_server: 100
request_timeout_seconds: 60
```
