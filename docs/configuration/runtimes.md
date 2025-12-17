---
id: runtimes
title: Runtime Types
sidebar_position: 3
---

# Runtime Types

Open MCP Gateway supports multiple runtime types for connecting to MCP servers. Each runtime handles server lifecycle and communication differently.

## Available Runtimes

| Runtime | Status | Use Case |
|---------|--------|----------|
| `local-process` | ✅ Available | Run MCP servers as local processes |
| `remote-sse` | ✅ Available | Connect to existing HTTP/SSE servers |
| `docker` | 🚧 v0.2 | Run servers in Docker containers |
| `k8s-job` | 🚧 v0.3 | Ephemeral Kubernetes workloads |
| `k8s-service` | 🚧 v0.3 | Long-running Kubernetes services |

---

## Local Process Runtime

Spawns MCP servers as child processes with stdio communication.

### Configuration

```yaml
runtime:
  type: local-process
  command: my-mcp-server        # Required: executable name or path
  args:                         # Optional: command arguments
    - "--transport=stdio"
    - "--verbose"
  working_dir: /opt/mcp         # Optional: working directory
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `local-process` |
| `command` | Yes | Executable name (in PATH) or absolute path |
| `args` | No | Array of command-line arguments |
| `working_dir` | No | Directory to run the process in |

### Examples

**Simple server:**
```yaml
runtime:
  type: local-process
  command: echo-mcp
```

**With arguments:**
```yaml
runtime:
  type: local-process
  command: postgres-mcp
  args:
    - "--host=localhost"
    - "--port=5432"
    - "--transport=stdio"
```

**Node.js server via npx:**
```yaml
runtime:
  type: local-process
  command: npx
  args:
    - "-y"
    - "@modelcontextprotocol/server-filesystem"
    - "/workspace"
```

**Python server:**
```yaml
runtime:
  type: local-process
  command: python
  args:
    - "-m"
    - "my_mcp_server"
  working_dir: /opt/my-server
```

### Environment Variables

Environment variables are passed from the server definition:

```yaml
- id: postgres
  runtime:
    type: local-process
    command: postgres-mcp
  env:
    PGHOST: localhost
    PGPORT: "5432"
    PGPASSWORD: "${DB_PASSWORD}"
```

### Lifecycle

1. **Start**: Process spawned with `stdin/stdout` pipes
2. **Communication**: JSON-RPC over stdio
3. **Health**: Process existence check
4. **Stop**: SIGTERM, wait, then SIGKILL if needed

---

## Remote SSE Runtime

Connects to existing MCP servers running as HTTP/SSE endpoints.

### Configuration

```yaml
runtime:
  type: remote-sse
  url: https://mcp.example.com/server   # Required: server URL
  headers:                               # Optional: HTTP headers
    Authorization: "Bearer ${TOKEN}"
    X-Custom-Header: "value"
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Must be `remote-sse` |
| `url` | Yes | Full URL of the MCP server endpoint |
| `headers` | No | HTTP headers to include in requests |

### Examples

**Public server:**
```yaml
runtime:
  type: remote-sse
  url: https://mcp.example.com/api
```

**With authentication:**
```yaml
runtime:
  type: remote-sse
  url: https://mcp.internal.company.com/tools
  headers:
    Authorization: "Bearer ${API_TOKEN}"
```

**With multiple headers:**
```yaml
runtime:
  type: remote-sse
  url: https://mcp.vendor.com/v1
  headers:
    Authorization: "Bearer ${TOKEN}"
    X-Tenant-ID: "${TENANT_ID}"
    X-Request-Source: "mcp-gateway"
```

### Lifecycle

1. **Start**: HTTP connection established
2. **Communication**: JSON-RPC over HTTP POST
3. **Health**: HTTP health check to URL
4. **Stop**: Connection closed (no process to stop)

---

## Docker Runtime (v0.2)

:::info Coming in v0.2
Docker runtime support is planned for version 0.2.0.
:::

Run MCP servers in Docker containers with automatic lifecycle management.

### Planned Configuration

```yaml
runtime:
  type: docker
  image: mcp/my-server:latest     # Required: Docker image
  container_name: my-mcp-server   # Optional: container name
  volumes:                         # Optional: volume mounts
    - /host/data:/container/data:ro
  network: mcp-network            # Optional: Docker network
  env_file: .env                  # Optional: env file path
```

### Planned Features

- Automatic image pull if not present
- Container lifecycle management
- Volume mounting for data access
- Network configuration
- Environment file support
- Resource limits (CPU, memory)

---

## Kubernetes Job Runtime (v0.3)

:::info Coming in v0.3
Kubernetes Job runtime is planned for version 0.3.0.
:::

Run ephemeral MCP servers as Kubernetes Jobs.

### Planned Configuration

```yaml
runtime:
  type: k8s-job
  namespace: mcp-servers          # Required: Kubernetes namespace
  image: mcp/my-server:v1.0       # Required: container image
  service_account: mcp-sa         # Optional: service account
  resources:                       # Optional: resource limits
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "500m"
```

### Use Cases

- One-shot operations
- Resource-intensive tasks
- Isolated execution
- Auto-cleanup after completion

---

## Kubernetes Service Runtime (v0.3)

:::info Coming in v0.3
Kubernetes Service runtime is planned for version 0.3.0.
:::

Connect to long-running MCP servers deployed as Kubernetes Services.

### Planned Configuration

```yaml
runtime:
  type: k8s-service
  namespace: mcp-servers          # Required: Kubernetes namespace
  service_name: my-mcp-service    # Required: service name
  port: 8080                      # Required: service port
```

### Use Cases

- Shared MCP servers across multiple gateways
- High-availability deployments
- Managed by Kubernetes operators
- Horizontal scaling

---

## Runtime Selection Guide

| Scenario | Recommended Runtime |
|----------|---------------------|
| Local development | `local-process` |
| Testing | `local-process` |
| Cloud-hosted MCP service | `remote-sse` |
| Self-hosted remote server | `remote-sse` |
| Production (isolated) | `docker` (v0.2) |
| Kubernetes deployment | `k8s-job` or `k8s-service` (v0.3) |

## Mixing Runtimes

A single catalog can mix different runtime types:

```yaml
servers:
  # Local development server
  - id: dev-tools
    runtime:
      type: local-process
      command: dev-mcp

  # Production database (remote)
  - id: prod-db
    runtime:
      type: remote-sse
      url: https://db-mcp.internal

  # Sandboxed execution (Docker, when available)
  - id: sandbox
    runtime:
      type: docker
      image: mcp/sandbox:latest
```

This flexibility allows you to:
- Develop locally with processes
- Connect to production services remotely
- Isolate sensitive operations in containers
- Scale with Kubernetes in production
