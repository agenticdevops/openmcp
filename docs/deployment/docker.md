---
id: docker
title: Docker Deployment
sidebar_position: 1
---

# Docker Deployment

Deploy Open MCP Gateway using Docker for containerized environments.

## Quick Start

```bash
# Pull the image
docker pull ghcr.io/agentic/mcp-gateway:latest

# Run with local config files
docker run -d \
  --name mcp-gateway \
  -p 4444:4444 \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  -v $(pwd)/catalog.yaml:/app/catalog.yaml:ro \
  ghcr.io/agentic/mcp-gateway:latest
```

## Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-gateway:
    image: ghcr.io/agentic/mcp-gateway:latest
    container_name: mcp-gateway
    ports:
      - "4444:4444"
    volumes:
      - ./config.yaml:/app/config.yaml:ro
      - ./catalog.yaml:/app/catalog.yaml:ro
    environment:
      - RUST_LOG=info
      - MCP_GATEWAY_API_KEY=${MCP_GATEWAY_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4444/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

Run:
```bash
docker-compose up -d
```

## Building the Image

Build from source:

```bash
# Clone the repository
git clone https://github.com/agentic/mcp-gateway.git
cd mcp-gateway

# Build the image
docker build -t mcp-gateway:local .

# Run your custom build
docker run -d \
  --name mcp-gateway \
  -p 4444:4444 \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  -v $(pwd)/catalog.yaml:/app/catalog.yaml:ro \
  mcp-gateway:local
```

## Dockerfile

The production Dockerfile uses multi-stage builds:

```dockerfile
# Build stage
FROM rust:1.75-slim-bookworm as builder

WORKDIR /app
COPY . .
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 gateway
USER gateway

WORKDIR /app
COPY --from=builder /app/target/release/gateway-http .
COPY --from=builder /app/target/release/gateway-stdio .

EXPOSE 4444

CMD ["./gateway-http", "--config", "/app/config.yaml"]
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RUST_LOG` | Log level | `info` |
| `MCP_GATEWAY_API_KEY` | API key for auth | None |

### Volume Mounts

| Path | Description |
|------|-------------|
| `/app/config.yaml` | Gateway configuration |
| `/app/catalog.yaml` | Server catalog |

### Ports

| Port | Description |
|------|-------------|
| 4444 | HTTP API |

## Running Local MCP Servers

To run local process MCP servers from Docker, you have options:

### Option 1: Install in Container

Create a custom Dockerfile:

```dockerfile
FROM ghcr.io/agentic/mcp-gateway:latest

# Install Node.js for npx-based servers
USER root
RUN apt-get update && apt-get install -y nodejs npm
USER gateway

# Or install specific MCP servers
RUN npm install -g @modelcontextprotocol/server-filesystem
```

### Option 2: Use Remote SSE Servers

Run MCP servers separately and connect via `remote-sse`:

```yaml
# catalog.yaml
servers:
  - id: filesystem
    runtime:
      type: remote-sse
      url: http://mcp-filesystem:8080/mcp
```

```yaml
# docker-compose.yml
services:
  mcp-gateway:
    image: ghcr.io/agentic/mcp-gateway:latest
    ports:
      - "4444:4444"
    volumes:
      - ./config.yaml:/app/config.yaml:ro
      - ./catalog.yaml:/app/catalog.yaml:ro

  mcp-filesystem:
    image: mcp/filesystem:latest
    environment:
      - ROOT_PATH=/workspace
    volumes:
      - ./workspace:/workspace:ro
```

### Option 3: Docker-in-Docker (v0.2)

When Docker runtime is available (v0.2+):

```yaml
# catalog.yaml
servers:
  - id: sandboxed-server
    runtime:
      type: docker
      image: mcp/my-server:latest
```

## Networking

### Bridge Network (Default)

```yaml
# docker-compose.yml
services:
  mcp-gateway:
    networks:
      - mcp-network

  mcp-server:
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
```

### Host Network

For accessing host services:

```bash
docker run --network host \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  ghcr.io/agentic/mcp-gateway:latest
```

## Health Checks

### Docker Health Check

Built into the image:
```bash
curl -f http://localhost:4444/health
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 4444
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health
    port: 4444
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Logging

### View Logs

```bash
# Docker
docker logs mcp-gateway

# Docker Compose
docker-compose logs -f mcp-gateway
```

### Log Levels

```yaml
environment:
  - RUST_LOG=debug  # trace, debug, info, warn, error
```

### Structured Logging

Logs are JSON-formatted for easy parsing:

```json
{"timestamp":"2024-01-15T10:30:00Z","level":"INFO","message":"Starting server","server_id":"postgres"}
```

## Security

### Non-Root User

The container runs as user `gateway` (UID 1000).

### Read-Only Config

Mount configs as read-only:
```bash
-v ./config.yaml:/app/config.yaml:ro
```

### API Key

Always set API key in production:
```yaml
environment:
  - MCP_GATEWAY_API_KEY=${MCP_GATEWAY_API_KEY}
```

### Network Isolation

Use internal networks for MCP servers:
```yaml
networks:
  frontend:
  backend:
    internal: true
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs mcp-gateway

# Run interactively
docker run -it --rm \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  ghcr.io/agentic/mcp-gateway:latest
```

### Permission Denied

Ensure config files are readable:
```bash
chmod 644 config.yaml catalog.yaml
```

### Hot Reload Not Working

Docker volumes may not propagate file events. Use manual reload:
```bash
curl -X POST http://localhost:4444/admin/reload
```
