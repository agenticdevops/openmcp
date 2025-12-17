---
id: introduction
title: Introduction
sidebar_position: 1
slug: /
---

# Open MCP Gateway

**Open MCP Gateway** is a Rust-native, vendor-neutral gateway server that enables AI clients to connect to multiple MCP (Model Context Protocol) servers through a single, unified interface.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open protocol that standardizes how AI applications connect to external data sources, tools, and services. MCP servers expose capabilities that AI models can use to interact with databases, APIs, file systems, and more.

## The Problem

As MCP adoption grows, managing multiple MCP servers becomes challenging:

- **Connection Overhead**: Each client must maintain separate connections to each MCP server
- **Lifecycle Management**: Manually starting, stopping, and monitoring servers
- **Configuration Sprawl**: Different configs for each server across different clients
- **Resource Waste**: Servers running 24/7 even when not in use
- **Scaling Complexity**: Deploying to containers or Kubernetes requires custom solutions

## The Solution

Open MCP Gateway acts as a **single entry point** for all your MCP servers:

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Claude     │     │                 │     │ PostgreSQL   │
│  Desktop    │────▶│                 │────▶│ MCP Server   │
└─────────────┘     │                 │     └──────────────┘
                    │   Open MCP      │
┌─────────────┐     │    Gateway      │     ┌──────────────┐
│  Your App   │────▶│                 │────▶│ GitHub MCP   │
│  (HTTP)     │     │                 │     │ Server       │
└─────────────┘     │                 │     └──────────────┘
                    │                 │
┌─────────────┐     │                 │     ┌──────────────┐
│  Cline      │────▶│                 │────▶│ Custom MCP   │
│  Extension  │     │                 │     │ Server       │
└─────────────┘     └─────────────────┘     └──────────────┘
```

## Key Features

### 🚀 Auto-Managed Lifecycle
Servers start automatically when needed and shut down after configurable idle periods. No manual process management required.

### 🔄 Hot Reload Configuration
Update your server catalog without restarting the gateway. Perfect for CI/CD pipelines and dynamic environments.

### 🔌 Multiple Runtime Backends
- **Local Process**: Run MCP servers as child processes
- **Remote SSE**: Connect to existing HTTP/SSE servers
- **Docker**: Run servers in containers (v0.2)
- **Kubernetes**: Deploy as Jobs or Services (v0.3)

### 🌐 Dual Transport Support
- **HTTP/SSE**: RESTful API for web and cloud applications
- **Stdio**: Native support for Claude Desktop, Cline, and other desktop clients

### ⚡ Rust Performance
Built with Rust for memory safety, minimal overhead, and high concurrency. Ideal for production deployments.

## Quick Example

Define your servers in a YAML catalog:

```yaml
servers:
  - id: postgres
    display_name: PostgreSQL Server
    runtime:
      type: local-process
      command: postgres-mcp
      args: ["--transport=stdio"]

  - id: github
    display_name: GitHub API
    runtime:
      type: remote-sse
      url: https://mcp.example.com/github
```

Start the gateway:

```bash
./gateway-http --config config.yaml
```

Connect from any client:

```bash
curl -X POST http://localhost:4444/mcp \
  -H "Content-Type: application/json" \
  -d '{"server_id": "postgres", "method": "tools/list"}'
```

## Next Steps

- [Why MCP Gateway?](/docs/why-mcp-gateway) - Understand the value proposition
- [Getting Started](/docs/getting-started) - Install and run your first gateway
- [Configuration Guide](/docs/configuration) - Learn the configuration options
- [Architecture](/docs/developer/architecture) - Understand how it works
