---
id: faq
title: FAQ
sidebar_position: 51
---

# Frequently Asked Questions

## General

### What is Open MCP Gateway?

Open MCP Gateway is a Rust-native, vendor-neutral gateway server that enables AI clients to connect to multiple MCP (Model Context Protocol) servers through a single, unified interface. It handles server lifecycle, configuration, and communication.

### What is MCP?

MCP (Model Context Protocol) is an open protocol from Anthropic that standardizes how AI applications connect to external data sources, tools, and services. Learn more at [modelcontextprotocol.io](https://modelcontextprotocol.io).

### Why do I need a gateway?

Without a gateway:
- Each client connects to each MCP server separately
- Servers run continuously, wasting resources
- Configuration is scattered across clients
- No centralized monitoring or logging

With a gateway:
- Single connection point for all servers
- Auto-start on demand, auto-stop when idle
- Centralized configuration with hot reload
- Unified logging and statistics

### Is it free to use?

Yes, Open MCP Gateway is open source under the Apache-2.0 license. You can use it freely for personal and commercial purposes.

---

## Features

### Does it support Docker?

Docker runtime support is planned for v0.2.0. Currently, you can:
- Run the gateway itself in Docker
- Use `remote-sse` to connect to MCP servers running in separate containers

### Does it support Kubernetes?

Kubernetes runtime support (k8s-job, k8s-service) is planned for v0.3.0. You can deploy the gateway on Kubernetes today using the manifests in our documentation.

### Can I use it with Claude Desktop?

Yes! Use the `gateway-stdio` binary to connect Claude Desktop to MCP servers through the gateway. See [Claude Desktop Setup](/docs/usage/claude-desktop).

### Does it support authentication?

Yes, the gateway supports API key authentication. See [Authentication](/docs/configuration/authentication).

### Can I add my own runtime type?

Yes, the runtime layer is extensible. Implement the `Runtime` trait and add your runtime type. See [Custom Runtimes](/docs/developer/custom-runtimes).

---

## Configuration

### How do I reload configuration without restart?

The gateway supports hot reload. When you save changes to `catalog.yaml`, they're automatically detected and applied. You can also trigger a manual reload:

```bash
curl -X POST http://localhost:4444/admin/reload
```

### Can I use environment variables in config?

Yes, use the `${VAR}` syntax:

```yaml
api_key: "${MCP_GATEWAY_API_KEY}"
```

### What happens to running servers when I reload?

- Unchanged servers: Continue running
- Modified servers: Continue with old config until restart
- Removed servers: Gracefully stopped
- New servers: Available immediately

---

## Troubleshooting

### Why isn't my server starting?

Common causes:
1. Command not found (check PATH or use absolute path)
2. Missing environment variables
3. Working directory doesn't exist
4. Permission issues

Enable debug logging:
```bash
RUST_LOG=debug gateway-http --config config.yaml
```

### Why am I getting 401 errors?

If `api_key` is configured, all requests (except `/health`) require authentication:

```bash
curl -H "Authorization: Bearer your-key" http://localhost:4444/servers
```

### Hot reload isn't working in Docker

Docker volumes may not propagate file events. Use manual reload:

```bash
curl -X POST http://localhost:4444/admin/reload
```

### My server keeps stopping

Check the `idle_timeout_seconds` setting. Default is 5 minutes. Servers stop automatically after this period of inactivity.

---

## Performance

### How many servers can it handle?

The gateway is designed to handle hundreds of server definitions. Actual limits depend on:
- Memory available (each server uses ~1-5MB when running)
- Connection limits to backend servers
- Request volume

### What's the overhead?

The gateway adds minimal overhead:
- ~5MB base memory
- Milliseconds of latency for request routing
- Efficient async I/O via Tokio

### Can I run multiple gateway instances?

Yes, for high availability. Each instance maintains its own connections. For stateless scaling, use `remote-sse` runtime to connect to shared MCP server instances.

---

## Comparison

### How is this different from Docker MCP Gateway?

| Feature | Docker MCP Gateway | Open MCP Gateway |
|---------|-------------------|------------------|
| Runtimes | Docker only | Process, SSE, Docker*, K8s* |
| Language | Varies | Rust |
| Stdio support | Limited | First-class |
| Hot reload | No | Yes |

*Planned for future versions

### How is this different from running MCP servers directly?

| Aspect | Direct | With Gateway |
|--------|--------|--------------|
| Configuration | Per-client | Centralized |
| Lifecycle | Manual | Automatic |
| Resource usage | Always running | On-demand |
| Monitoring | DIY | Built-in stats |

---

## Contributing

### How can I contribute?

See our [Contributing Guide](/docs/developer/contributing). We welcome:
- Bug fixes
- Documentation improvements
- New runtime implementations
- Feature suggestions

### Where do I report bugs?

Open an issue on [GitHub](https://github.com/agentic/mcp-gateway/issues).

### Is there a community chat?

Yes! Join our [Discord server](https://discord.gg/mcp-gateway) for real-time discussion.
