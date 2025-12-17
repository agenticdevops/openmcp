---
id: why-mcp-gateway
title: Why MCP Gateway?
sidebar_position: 2
---

# Why Open MCP Gateway?

As AI applications increasingly rely on MCP servers for tool access and data integration, the need for robust infrastructure becomes critical. Open MCP Gateway addresses real-world challenges that teams face when scaling MCP deployments.

## The Challenges You Face

### 1. Connection Management Complexity

**Without a Gateway:**
Every AI client must:
- Know how to connect to each MCP server
- Handle different connection protocols
- Manage connection pooling and retries
- Deal with server discovery

**With Open MCP Gateway:**
- Single endpoint for all MCP servers
- Gateway handles connection management
- Automatic retries and health checks
- Centralized server discovery via catalog

### 2. Resource Inefficiency

**Without a Gateway:**
- MCP servers run continuously, consuming resources
- No automatic cleanup of idle servers
- Manual process management required
- Each developer manages their own server instances

**With Open MCP Gateway:**
- Servers start on-demand when first request arrives
- Automatic shutdown after configurable idle period (default: 5 minutes)
- Centralized lifecycle management
- Shared server instances across clients

### 3. Configuration Fragmentation

**Without a Gateway:**
- Each client has its own server configuration
- Changes require updating multiple places
- No single source of truth
- Version drift between environments

**With Open MCP Gateway:**
- Single YAML catalog defines all servers
- Hot reload without restarts
- Git-friendly configuration
- Consistent across all clients

### 4. Platform Lock-in

**Existing Solutions:**
- Docker-only gateways (Docker MCP Gateway)
- Vendor-specific orchestration (IBM ContextForge)
- No unified multi-runtime solution

**Open MCP Gateway:**
- Vendor-neutral runtime abstraction
- Local processes for development
- Remote HTTP for cloud services
- Docker and Kubernetes for production
- Same configuration works everywhere

## Unique Selling Points

### 🦀 Rust-Native Performance

Built entirely in Rust, Open MCP Gateway delivers:

| Metric | Benefit |
|--------|---------|
| **Memory Safety** | No garbage collection pauses, no null pointer crashes |
| **Low Overhead** | ~5MB base memory footprint |
| **High Concurrency** | Tokio async runtime handles thousands of connections |
| **Fast Startup** | Cold start in milliseconds |
| **Small Image** | Docker image under 50MB |

### 🔄 True Hot Reload

Unlike solutions that require restart for config changes:

```bash
# Edit your catalog
vim catalog.yaml

# Gateway detects changes automatically
# New servers available immediately
# Existing connections unaffected
```

The file watcher uses debounced reloads (500ms) to handle rapid saves, and atomic registry swaps ensure zero-downtime updates.

### 🎯 Auto-Managed Lifecycle

The gateway manages the complete server lifecycle:

```
Request arrives → Server not running?
                        ↓
              Start server automatically
                        ↓
              Process request
                        ↓
              Track last activity
                        ↓
              Idle timeout reached?
                        ↓
              Graceful shutdown
```

This means:
- **Zero manual intervention** for routine operations
- **Automatic resource recovery** from idle servers
- **Self-healing** when servers crash
- **Metrics and status** for every server

### 🌐 Dual Transport Architecture

Serve both web and desktop clients from the same gateway:

**HTTP/SSE Transport** (gateway-http):
```bash
# Modern REST API
POST /mcp {"server_id": "postgres", "method": "tools/call", ...}

# Server management
GET /servers
POST /servers/postgres/start
```

**Stdio Transport** (gateway-stdio):
```json
// Claude Desktop config
{
  "mcpServers": {
    "gateway": {
      "command": "gateway-stdio",
      "args": ["--server", "postgres"]
    }
  }
}
```

### 🔌 Universal Runtime Support

One gateway, any deployment model:

| Runtime | Use Case | Status |
|---------|----------|--------|
| **Local Process** | Development, testing | ✅ Available |
| **Remote SSE** | Cloud MCP services | ✅ Available |
| **Docker** | Containerized deployment | 🚧 v0.2 |
| **Kubernetes Job** | Ephemeral workloads | 🚧 v0.3 |
| **Kubernetes Service** | Long-running servers | 🚧 v0.3 |

## Comparison with Alternatives

### vs. Direct MCP Connections

| Aspect | Direct | With Gateway |
|--------|--------|--------------|
| Setup complexity | Each client configured separately | Single catalog, multiple clients |
| Resource usage | All servers always running | On-demand lifecycle |
| Configuration changes | Update every client | Update one file, hot reload |
| Monitoring | DIY per server | Centralized stats endpoint |

### vs. Docker MCP Gateway

| Aspect | Docker Gateway | Open MCP Gateway |
|--------|----------------|------------------|
| Runtime support | Docker only | Process, HTTP, Docker, K8s |
| Language | Varies | Rust (memory safe, fast) |
| Stdio support | Limited | First-class |
| Hot reload | No | Yes |

### vs. IBM ContextForge

| Aspect | ContextForge | Open MCP Gateway |
|--------|--------------|------------------|
| Target | Enterprise IBM ecosystem | Any environment |
| Complexity | Full platform | Minimal core |
| Open source | No | Apache-2.0 |
| Self-hosted | Limited | Full control |

## When to Use Open MCP Gateway

### Ideal For:

✅ **Development teams** managing multiple MCP servers
✅ **Production deployments** requiring lifecycle automation
✅ **Mixed environments** (local + cloud + containers)
✅ **Claude Desktop/Cline users** wanting centralized config
✅ **Kubernetes deployments** (with v0.3 runtimes)
✅ **Resource-conscious environments** needing idle cleanup

### May Not Need If:

- Single MCP server with one client
- Already using a platform with built-in MCP orchestration
- Need multi-tenant isolation immediately (coming in v0.3)

## Real-World Scenarios

### Scenario 1: Development Team

> "We have 5 developers, each running 3 MCP servers locally. Configuration was scattered across everyone's machines."

**Solution:** Central gateway with shared catalog in Git. Each developer points Claude Desktop to the gateway. Configuration changes go through PR review.

### Scenario 2: Production API

> "Our AI service needs to access 10 different MCP tools, but we can't afford to run all servers 24/7."

**Solution:** Gateway with 5-minute idle timeout. Servers spin up on first request, shut down when idle. 80% reduction in compute costs.

### Scenario 3: Multi-Cloud Deployment

> "Some MCP servers run locally, some in our cloud, some are SaaS endpoints."

**Solution:** Mixed runtime catalog:
```yaml
servers:
  - id: local-db
    runtime:
      type: local-process
      command: db-mcp
  - id: cloud-api
    runtime:
      type: remote-sse
      url: https://mcp.internal.company.com/api
  - id: saas-tool
    runtime:
      type: remote-sse
      url: https://mcp.vendor.com/tool
```

## Getting Started

Ready to simplify your MCP infrastructure?

1. [Install the Gateway](/docs/installation)
2. [Create your catalog](/docs/configuration/server-catalog)
3. [Connect your clients](/docs/usage/http-transport)

Join the community on [GitHub](https://github.com/agentic/mcp-gateway) and help shape the future of MCP orchestration.
