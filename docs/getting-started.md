---
id: getting-started
title: Getting Started
sidebar_position: 3
---

# Getting Started

This guide will help you get Open MCP Gateway running in under 5 minutes.

## Prerequisites

- **Rust 1.75+** (for building from source)
- **OR** Docker (for containerized deployment)
- One or more MCP servers to connect to

## Installation

### From Source (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/agentic/mcp-gateway.git
cd mcp-gateway

# Build release binaries
cargo build --release

# Binaries are now available at:
# - target/release/gateway-http
# - target/release/gateway-stdio
```

### Using Docker

```bash
# Pull the latest image
docker pull ghcr.io/agentic/mcp-gateway:latest

# Or build locally
docker build -t mcp-gateway .
```

### Pre-built Binaries

Download from [GitHub Releases](https://github.com/agentic/mcp-gateway/releases):

- `gateway-http-linux-amd64`
- `gateway-http-darwin-amd64`
- `gateway-http-darwin-arm64`
- `gateway-stdio-*` variants

## Quick Start

### Step 1: Create a Server Catalog

Create a file called `catalog.yaml`:

```yaml
servers:
  - id: echo
    display_name: Echo Server
    description: Simple echo server for testing
    runtime:
      type: local-process
      command: npx
      args: ["-y", "@anthropic/mcp-echo"]
    tags: [testing]
```

### Step 2: Create Gateway Configuration

Create a file called `config.yaml`:

```yaml
listen_addr: "0.0.0.0:4444"
catalog_path: "catalog.yaml"
log_level: "info"
```

### Step 3: Start the Gateway

```bash
# From source
./target/release/gateway-http --config config.yaml

# Or with cargo
cargo run --bin gateway-http -- --config config.yaml
```

You should see:

```
INFO gateway_http: Starting Open MCP Gateway
INFO gateway_http: Loaded 1 servers from catalog
INFO gateway_http: Listening on 0.0.0.0:4444
INFO gateway_http: Hot reload enabled for catalog.yaml
```

### Step 4: Verify It Works

```bash
# Check health
curl http://localhost:4444/health
# Response: {"status":"ok"}

# List servers
curl http://localhost:4444/servers
# Response: [{"id":"echo","display_name":"Echo Server","status":"stopped",...}]

# Start a server
curl -X POST http://localhost:4444/servers/echo/start
# Response: {"status":"running"}

# Call an MCP method
curl -X POST http://localhost:4444/mcp \
  -H "Content-Type: application/json" \
  -d '{"server_id": "echo", "method": "tools/list"}'
```

## What Just Happened?

1. **Gateway Started**: The HTTP server began listening on port 4444
2. **Catalog Loaded**: Your server definitions were loaded into the registry
3. **Hot Reload Enabled**: File watcher monitors `catalog.yaml` for changes
4. **Server On-Demand**: The echo server wasn't started until you called `/start`
5. **Auto-Lifecycle**: If idle for 5 minutes, the server will automatically stop

## Adding More Servers

Edit `catalog.yaml` to add more servers:

```yaml
servers:
  - id: echo
    display_name: Echo Server
    runtime:
      type: local-process
      command: npx
      args: ["-y", "@anthropic/mcp-echo"]

  - id: postgres
    display_name: PostgreSQL Tools
    runtime:
      type: local-process
      command: postgres-mcp
      args: ["--connection-string", "postgresql://localhost/mydb"]
    env:
      PGPASSWORD: "${POSTGRES_PASSWORD}"
    tags: [database, production]

  - id: external-api
    display_name: External API
    runtime:
      type: remote-sse
      url: https://mcp.example.com/api
      headers:
        Authorization: "Bearer ${API_TOKEN}"
```

Save the file - the gateway will detect changes and reload automatically!

```
INFO catalog_watcher: Catalog changed, reloading...
INFO catalog_watcher: Loaded 3 servers (added: 2, removed: 0)
```

## Next Steps

- [Configuration Guide](/docs/configuration) - Full configuration reference
- [HTTP Transport](/docs/usage/http-transport) - HTTP API details
- [Claude Desktop Setup](/docs/usage/claude-desktop) - Connect Claude Desktop
- [Production Deployment](/docs/deployment/production) - Deploy to production
