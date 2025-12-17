---
id: quick-start
title: Quick Start
sidebar_position: 5
---

# Quick Start

Get a fully functional MCP Gateway running in 5 minutes.

## Prerequisites

- Rust 1.75+ or Docker
- An MCP server to test with (we'll use the official echo server)

## Step 1: Get the Gateway

**Option A: Build from source**
```bash
git clone https://github.com/agentic/mcp-gateway.git
cd mcp-gateway
cargo build --release
```

**Option B: Use Docker**
```bash
docker pull ghcr.io/agentic/mcp-gateway:latest
```

## Step 2: Create Configuration Files

Create `config.yaml`:
```yaml
listen_addr: "0.0.0.0:4444"
catalog_path: "catalog.yaml"
log_level: "info"
```

Create `catalog.yaml`:
```yaml
servers:
  - id: echo
    display_name: Echo Test Server
    description: A simple echo server for testing MCP connections
    runtime:
      type: local-process
      command: npx
      args: ["-y", "@modelcontextprotocol/server-echo"]
    tags: [testing, demo]
```

## Step 3: Start the Gateway

**From source:**
```bash
./target/release/gateway-http --config config.yaml
```

**With Docker:**
```bash
docker run -p 4444:4444 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -v $(pwd)/catalog.yaml:/app/catalog.yaml \
  ghcr.io/agentic/mcp-gateway:latest
```

## Step 4: Test the Gateway

Open a new terminal and run these commands:

```bash
# 1. Health check
curl http://localhost:4444/health
# {"status":"ok"}

# 2. List available servers
curl http://localhost:4444/servers | jq
# [{"id":"echo","display_name":"Echo Test Server","status":"stopped",...}]

# 3. Start the echo server
curl -X POST http://localhost:4444/servers/echo/start
# {"id":"echo","status":"running"}

# 4. Call the echo server
curl -X POST http://localhost:4444/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": "echo",
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## Step 5: Try Hot Reload

Edit `catalog.yaml` to add another server:

```yaml
servers:
  - id: echo
    display_name: Echo Test Server
    runtime:
      type: local-process
      command: npx
      args: ["-y", "@modelcontextprotocol/server-echo"]

  - id: time
    display_name: Time Server
    description: Get current time in various formats
    runtime:
      type: local-process
      command: npx
      args: ["-y", "@modelcontextprotocol/server-time"]
```

Save the file and check the logs:
```
INFO catalog_watcher: Catalog changed, reloading...
INFO catalog_watcher: Loaded 2 servers
```

Verify the new server is available:
```bash
curl http://localhost:4444/servers | jq '.[].id'
# "echo"
# "time"
```

## What's Next?

You now have a working MCP Gateway! Here's what to explore next:

| Goal | Documentation |
|------|--------------|
| Add more servers | [Server Catalog](/docs/configuration/server-catalog) |
| Connect Claude Desktop | [Claude Desktop Setup](/docs/usage/claude-desktop) |
| Secure with API key | [Authentication](/docs/configuration/authentication) |
| Deploy to production | [Production Guide](/docs/deployment/production) |
| Use Docker containers | [Docker Runtime](/docs/configuration/runtimes#docker) |
| Understand the architecture | [Architecture Overview](/docs/developer/architecture) |
