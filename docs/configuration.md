---
id: configuration
title: Configuration Overview
sidebar_position: 6
---

# Configuration Overview

Open MCP Gateway uses two configuration files:

1. **Gateway Configuration** (`config.yaml`) - Gateway server settings
2. **Server Catalog** (`catalog.yaml`) - MCP server definitions

Both files support hot reload - changes are detected and applied without restart.

## Configuration File Locations

The gateway looks for configuration files in this order:

1. Path specified with `--config` flag
2. `./config.yaml` in current directory
3. `~/.config/mcp-gateway/config.yaml`
4. `/etc/mcp-gateway/config.yaml`

## Quick Reference

### Minimal Configuration

**config.yaml:**
```yaml
listen_addr: "0.0.0.0:4444"
catalog_path: "catalog.yaml"
```

**catalog.yaml:**
```yaml
servers:
  - id: my-server
    runtime:
      type: local-process
      command: my-mcp-server
```

### Full Configuration

**config.yaml:**
```yaml
# Network settings
listen_addr: "0.0.0.0:4444"

# Path to server catalog (supports hot reload)
catalog_path: "catalog.yaml"

# Logging level: trace, debug, info, warn, error
log_level: "info"

# Optional API key for authentication
api_key: "${MCP_GATEWAY_API_KEY}"

# Lifecycle settings
idle_timeout_seconds: 300        # Shutdown servers after 5 min idle
health_check_interval_seconds: 30 # Check server health every 30s
```

**catalog.yaml:**
```yaml
servers:
  # Local process server
  - id: postgres-mcp
    display_name: PostgreSQL Tools
    description: Database query and schema tools
    runtime:
      type: local-process
      command: postgres-mcp
      args: ["--transport", "stdio"]
      working_dir: /opt/mcp-servers
    env:
      DATABASE_URL: "${DATABASE_URL}"
      PGPASSWORD: "${PGPASSWORD}"
    tags: [database, production]

  # Remote SSE server
  - id: cloud-api
    display_name: Cloud API Server
    runtime:
      type: remote-sse
      url: https://mcp.example.com/api
      headers:
        Authorization: "Bearer ${API_TOKEN}"
    tags: [cloud, external]

  # Docker server (v0.2+)
  - id: sandbox
    display_name: Sandboxed Server
    runtime:
      type: docker
      image: mcp/sandbox:latest
      volumes:
        - /data:/data:ro
    tags: [sandbox]
```

## Environment Variable Substitution

Both configuration files support environment variable substitution:

```yaml
# Direct substitution
api_key: "${MCP_GATEWAY_API_KEY}"

# In nested fields
runtime:
  type: remote-sse
  headers:
    Authorization: "Bearer ${API_TOKEN}"
```

Variables are resolved at:
- **Gateway config**: Startup time
- **Catalog**: Reload time (allows dynamic secrets)

## Configuration Sections

| Section | File | Documentation |
|---------|------|---------------|
| Gateway Settings | config.yaml | [Gateway Config](/docs/configuration/gateway-config) |
| Server Definitions | catalog.yaml | [Server Catalog](/docs/configuration/server-catalog) |
| Runtime Types | catalog.yaml | [Runtimes](/docs/configuration/runtimes) |
| Authentication | config.yaml | [Authentication](/docs/configuration/authentication) |

## Validation

The gateway validates configuration on startup and reload:

```bash
# Validate without starting
gateway-http --config config.yaml --validate

# Common errors:
# - Invalid YAML syntax
# - Missing required fields (id, runtime)
# - Unknown runtime type
# - Invalid environment variable reference
```

## Hot Reload Behavior

When `catalog.yaml` changes:

1. File watcher detects modification
2. 500ms debounce period (handles rapid saves)
3. New catalog is parsed and validated
4. If valid, registry is atomically swapped
5. Running servers continue unaffected
6. New servers become available immediately
7. Removed servers are gracefully stopped

```
INFO catalog_watcher: Catalog changed, reloading...
INFO catalog_watcher: Loaded 5 servers (added: 1, removed: 1, unchanged: 3)
```

## Command-Line Overrides

Some settings can be overridden via command line:

```bash
gateway-http \
  --config config.yaml \
  --listen-addr 0.0.0.0:8080 \
  --log-level debug
```

| Flag | Config Equivalent | Description |
|------|-------------------|-------------|
| `--config` | - | Path to config file |
| `--listen-addr` | `listen_addr` | Override listen address |
| `--log-level` | `log_level` | Override log level |
| `--catalog` | `catalog_path` | Override catalog path |
