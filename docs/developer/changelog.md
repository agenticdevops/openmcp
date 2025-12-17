---
id: changelog
title: Changelog
sidebar_position: 11
---

# Changelog

All notable changes to Open MCP Gateway are documented here.

This project follows [Semantic Versioning](https://semver.org/).

---

## [0.1.0] - 2025-12-XX

### Added

- **Core Gateway**
  - Initial release of Open MCP Gateway
  - HTTP server with Axum (gateway-http)
  - Stdio wrapper for desktop clients (gateway-stdio)
  - Core library with shared abstractions (gateway-core)

- **Server Management**
  - Auto-managed server lifecycle
  - On-demand server startup
  - Configurable idle timeout with automatic shutdown
  - Server health monitoring
  - Connection pooling per server

- **Runtime Support**
  - Local process runtime (stdio communication)
  - Remote SSE runtime (HTTP/SSE)

- **Configuration**
  - YAML-based gateway configuration
  - YAML-based server catalog
  - Environment variable substitution
  - Hot reload without restart

- **HTTP API**
  - Health check endpoint (`GET /health`)
  - Server listing (`GET /servers`)
  - Server details (`GET /servers/:id`)
  - Manual start/stop (`POST /servers/:id/start`, `/stop`)
  - MCP JSON-RPC (`POST /mcp`)
  - Raw RPC with header routing (`POST /rpc`)
  - Gateway statistics (`GET /stats`)
  - Manual catalog reload (`POST /admin/reload`)

- **Authentication**
  - Optional API key authentication
  - Bearer token support
  - X-API-Key header support

- **Observability**
  - Structured logging with tracing
  - Request tracing
  - Server metrics (request count, uptime)

- **Desktop Integration**
  - Claude Desktop compatibility
  - Cline VS Code extension support
  - Continue.dev support

---

## [Unreleased]

### Planned for 0.2.0

- Docker runtime support
- Podman runtime support
- Prometheus metrics endpoint
- Enhanced authentication options
- Env-file based secrets

### Planned for 0.3.0

- Kubernetes Job runtime
- Kubernetes Service runtime
- Multi-tenant support
- Namespace isolation
- Tenant-specific API keys

---

## Upgrade Guide

### From 0.0.x to 0.1.0

This is the initial release. No upgrade path needed.

---

## Versioning Policy

Open MCP Gateway uses [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Incompatible API changes
- **MINOR** (0.X.0): New functionality, backwards compatible
- **PATCH** (0.0.X): Bug fixes, backwards compatible

### Pre-1.0 Notice

While the version is below 1.0.0:
- Minor versions may include breaking changes
- Patch versions are always backwards compatible
- The API is subject to change based on feedback

---

## Release Process

1. Update version in Cargo.toml files
2. Update CHANGELOG.md
3. Create git tag: `git tag v0.1.0`
4. Push tag: `git push origin v0.1.0`
5. GitHub Actions builds and publishes release
6. Docker images published to GHCR
