---
id: roadmap
title: Roadmap
sidebar_position: 100
---

# Roadmap

Open MCP Gateway follows [Semantic Versioning](https://semver.org/). This document outlines the planned features for each version.

## Version History

### v0.1.0 - MVP (Current)

**Released:** December 2025

The initial release establishing core functionality:

✅ **Core Features**
- Single-tenant gateway
- YAML-based server catalog
- Auto-managed server lifecycle
- Hot reload without restart

✅ **Runtimes**
- Local process runtime (stdio)
- Remote SSE runtime (HTTP)

✅ **Transports**
- HTTP/REST API (gateway-http)
- Stdio wrapper (gateway-stdio)

✅ **Operations**
- Structured logging with tracing
- Health check endpoints
- Basic error handling

---

## Upcoming Releases

### v0.2.0 - Container Support

**Target:** Q1 2025

Container runtime and enhanced security:

🚧 **Container Runtimes**
- Docker runtime
- Podman runtime
- Container lifecycle management
- Volume mounting
- Network configuration

🚧 **Security**
- Env-file-based secrets injection
- Bearer token authentication
- Secure credential handling

🚧 **Observability**
- Prometheus metrics endpoint
- Grafana dashboard templates
- Request/response timing metrics
- Error rate tracking

🚧 **Operations**
- Graceful degradation
- Circuit breaker pattern
- Retry policies

---

### v0.3.0 - Kubernetes & Multi-Tenant

**Target:** Q2 2025

Enterprise-ready features:

📋 **Kubernetes Runtimes**
- k8s-job runtime (ephemeral workloads)
- k8s-service runtime (long-running servers)
- ServiceAccount configuration
- Resource limits and requests
- Namespace isolation

📋 **Multi-Tenancy**
- Tenant isolation via namespaces
- Per-tenant catalogs
- Tenant-specific API keys
- Resource quotas per tenant

📋 **Scalability**
- Horizontal pod autoscaling
- Load balancing across gateways
- Shared state via Redis/etcd

📋 **Operations**
- Audit logging
- Rate limiting
- Request prioritization

---

### v0.4.0 - Advanced Features

**Target:** Q3 2025

Enhanced capabilities:

📋 **Server Discovery**
- Automatic server registration
- Service mesh integration
- DNS-based discovery

📋 **Caching**
- Response caching
- Cache invalidation
- Distributed cache support

📋 **Transformations**
- Request/response middleware
- Protocol translation
- Message filtering

📋 **UI**
- Web-based dashboard
- Server management UI
- Real-time monitoring

---

## Feature Requests

Want a feature not on the roadmap?

1. Check [existing issues](https://github.com/agentic/mcp-gateway/issues)
2. Open a [feature request](https://github.com/agentic/mcp-gateway/issues/new?template=feature_request.md)
3. Join the discussion on [Discord](https://discord.gg/mcp-gateway)

## Contributing

Help us build the roadmap faster:

- [Contributing Guide](/docs/developer/contributing)
- [Good First Issues](https://github.com/agentic/mcp-gateway/labels/good%20first%20issue)
- [Help Wanted](https://github.com/agentic/mcp-gateway/labels/help%20wanted)

## Version Support

| Version | Status | Support Until |
|---------|--------|---------------|
| v0.1.x | Current | v0.3.0 release |
| v0.2.x | Planned | v0.4.0 release |
| v0.3.x | Planned | v0.5.0 release |

We support the current version and one previous version with security updates.
