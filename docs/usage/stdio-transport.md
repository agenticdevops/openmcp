---
id: stdio-transport
title: Stdio Transport
sidebar_position: 2
---

# Stdio Transport

The stdio transport (`gateway-stdio`) enables desktop applications like Claude Desktop and Cline to connect to MCP servers through the gateway.

## How It Works

```
Desktop App ←→ gateway-stdio ←→ MCP Server
   (stdio)        (proxy)        (runtime)
```

The stdio wrapper:
1. Reads JSON-RPC messages from stdin
2. Forwards them to the specified MCP server
3. Returns responses to stdout

## Usage

### Basic Usage

```bash
gateway-stdio --server postgres --catalog catalog.yaml
```

### With Gateway HTTP Backend

```bash
gateway-stdio --server postgres --gateway http://localhost:4444
```

### Command Line Options

```
gateway-stdio [OPTIONS]

Options:
  -s, --server <ID>       Server ID from catalog (required)
  -c, --catalog <PATH>    Path to catalog file
  -g, --gateway <URL>     Gateway HTTP URL (alternative to catalog)
  --log-level <LEVEL>     Logging level [default: warn]
  -h, --help              Print help
  -V, --version           Print version
```

## Configuration Examples

### Direct to Local Server

Use when running a single local MCP server:

```bash
# catalog.yaml defines the server
gateway-stdio --server postgres --catalog catalog.yaml
```

### Through HTTP Gateway

Use when the HTTP gateway is already running:

```bash
# Connect to running gateway
gateway-stdio --server postgres --gateway http://localhost:4444
```

### Multiple Servers via Catalog

```yaml
# catalog.yaml
servers:
  - id: postgres
    runtime:
      type: local-process
      command: postgres-mcp

  - id: github
    runtime:
      type: local-process
      command: github-mcp
```

```bash
# Connect to postgres
gateway-stdio --server postgres --catalog catalog.yaml

# Or connect to github
gateway-stdio --server github --catalog catalog.yaml
```

## Desktop Application Integration

### Claude Desktop

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "postgres": {
      "command": "/path/to/gateway-stdio",
      "args": [
        "--server", "postgres",
        "--catalog", "/path/to/catalog.yaml"
      ]
    },
    "github": {
      "command": "/path/to/gateway-stdio",
      "args": [
        "--server", "github",
        "--catalog", "/path/to/catalog.yaml"
      ]
    }
  }
}
```

### Cline (VS Code Extension)

In your Cline settings:

```json
{
  "cline.mcpServers": {
    "postgres": {
      "command": "gateway-stdio",
      "args": ["--server", "postgres", "--catalog", "catalog.yaml"]
    }
  }
}
```

### Continue.dev

In your Continue configuration:

```json
{
  "mcpServers": [
    {
      "name": "postgres",
      "command": "gateway-stdio",
      "args": ["--server", "postgres", "--catalog", "catalog.yaml"]
    }
  ]
}
```

## Message Flow

### Incoming (stdin)

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

### Outgoing (stdout)

```json
{"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

### Logging (stderr)

Logs are written to stderr to avoid interfering with the JSON-RPC protocol:

```
2024-01-15T10:30:00Z INFO Starting gateway-stdio for server: postgres
2024-01-15T10:30:01Z DEBUG Received request: tools/list
```

## Error Handling

### Server Not Found

If the specified server doesn't exist in the catalog:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32001,
    "message": "Server 'unknown' not found in catalog"
  }
}
```

### Connection Failure

If the server fails to start:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32002,
    "message": "Failed to connect to server: process exited"
  }
}
```

### Invalid JSON

If malformed JSON is received:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32700,
    "message": "Parse error: invalid JSON"
  }
}
```

## Advantages of Stdio Transport

| Feature | Direct Connection | Via Gateway |
|---------|-------------------|-------------|
| Central config | ❌ Per-app config | ✅ One catalog |
| Hot reload | ❌ Restart app | ✅ Automatic |
| Lifecycle mgmt | ❌ Manual | ✅ Automatic |
| Multiple clients | ❌ Separate processes | ✅ Shared servers |
| Logging | ❌ Per-server | ✅ Centralized |

## Troubleshooting

### Debug Mode

Enable debug logging:

```bash
gateway-stdio --server postgres --catalog catalog.yaml --log-level debug
```

### Test Manually

Send a test message via stdin:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  gateway-stdio --server postgres --catalog catalog.yaml
```

### Check Server Availability

First verify the server works via HTTP:

```bash
curl http://localhost:4444/servers/postgres
```
