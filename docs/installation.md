---
id: installation
title: Installation
sidebar_position: 4
---

# Installation

Open MCP Gateway can be installed in several ways depending on your use case.

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| **OS** | Linux, macOS, Windows | Linux, macOS |
| **Memory** | 32 MB | 128 MB |
| **Disk** | 50 MB | 100 MB |
| **Rust** | 1.75+ | Latest stable |
| **Docker** | 20.10+ | Latest |

## Installation Methods

### From Source (Recommended)

Building from source gives you the latest features and full control.

```bash
# Clone the repository
git clone https://github.com/agentic/mcp-gateway.git
cd mcp-gateway

# Build release binaries
cargo build --release

# Optionally install to PATH
cargo install --path gateway-http
cargo install --path gateway-stdio
```

The binaries will be available at:
- `target/release/gateway-http` - HTTP server
- `target/release/gateway-stdio` - Stdio wrapper

### Pre-built Binaries

Download pre-built binaries from [GitHub Releases](https://github.com/agentic/mcp-gateway/releases).

**Linux (amd64):**
```bash
curl -LO https://github.com/agentic/mcp-gateway/releases/latest/download/gateway-http-linux-amd64
chmod +x gateway-http-linux-amd64
sudo mv gateway-http-linux-amd64 /usr/local/bin/gateway-http
```

**macOS (Apple Silicon):**
```bash
curl -LO https://github.com/agentic/mcp-gateway/releases/latest/download/gateway-http-darwin-arm64
chmod +x gateway-http-darwin-arm64
sudo mv gateway-http-darwin-arm64 /usr/local/bin/gateway-http
```

**macOS (Intel):**
```bash
curl -LO https://github.com/agentic/mcp-gateway/releases/latest/download/gateway-http-darwin-amd64
chmod +x gateway-http-darwin-amd64
sudo mv gateway-http-darwin-amd64 /usr/local/bin/gateway-http
```

### Docker

The official Docker image is available on GitHub Container Registry.

```bash
# Pull the latest image
docker pull ghcr.io/agentic/mcp-gateway:latest

# Or a specific version
docker pull ghcr.io/agentic/mcp-gateway:v0.1.0
```

**Run with Docker:**
```bash
docker run -d \
  --name mcp-gateway \
  -p 4444:4444 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -v $(pwd)/catalog.yaml:/app/catalog.yaml \
  ghcr.io/agentic/mcp-gateway:latest
```

**Build locally:**
```bash
docker build -t mcp-gateway .
```

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-gateway:
    image: ghcr.io/agentic/mcp-gateway:latest
    ports:
      - "4444:4444"
    volumes:
      - ./config.yaml:/app/config.yaml:ro
      - ./catalog.yaml:/app/catalog.yaml:ro
    environment:
      - RUST_LOG=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4444/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:
```bash
docker-compose up -d
```

## Verify Installation

After installation, verify the gateway is working:

```bash
# Check version
gateway-http --version

# Start with minimal config
echo 'listen_addr: "0.0.0.0:4444"' > config.yaml
echo 'servers: []' > catalog.yaml
gateway-http --config config.yaml

# In another terminal, check health
curl http://localhost:4444/health
```

## Development Setup

For contributing or development:

```bash
# Clone with full history
git clone https://github.com/agentic/mcp-gateway.git
cd mcp-gateway

# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Use the project's toolchain
rustup show  # Reads rust-toolchain.toml

# Build debug version (faster compilation)
cargo build

# Run tests
cargo test

# Run with logging
RUST_LOG=debug cargo run --bin gateway-http -- --config examples/config.yaml
```

## Next Steps

- [Quick Start](/docs/quick-start) - First gateway in 5 minutes
- [Configuration](/docs/configuration) - Configure the gateway
- [Docker Deployment](/docs/deployment/docker) - Production Docker setup
