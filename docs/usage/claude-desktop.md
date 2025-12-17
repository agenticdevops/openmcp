---
id: claude-desktop
title: Claude Desktop Setup
sidebar_position: 3
---

# Claude Desktop Setup

This guide shows how to connect Claude Desktop to MCP servers through Open MCP Gateway.

## Why Use the Gateway with Claude Desktop?

| Without Gateway | With Gateway |
|-----------------|--------------|
| Configure each MCP server separately | Single gateway configuration |
| Servers run all the time | Auto-start on demand, auto-stop when idle |
| No hot reload | Update servers without restarting Claude |
| Scattered logs | Centralized logging |
| No shared state | Servers shared across Claude and other apps |

## Quick Setup

### Step 1: Create Your Catalog

Create a `catalog.yaml` with your MCP servers:

```yaml
servers:
  - id: filesystem
    display_name: File System
    runtime:
      type: local-process
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/workspace"]

  - id: postgres
    display_name: PostgreSQL
    runtime:
      type: local-process
      command: postgres-mcp
      args: ["--connection-string", "postgresql://localhost/mydb"]
    env:
      PGPASSWORD: "${PGPASSWORD}"

  - id: github
    display_name: GitHub
    runtime:
      type: local-process
      command: npx
      args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_TOKEN: "${GITHUB_TOKEN}"
```

### Step 2: Configure Claude Desktop

Find your Claude Desktop configuration file:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Edit the file to add gateway entries:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "/path/to/gateway-stdio",
      "args": [
        "--server", "filesystem",
        "--catalog", "/path/to/catalog.yaml"
      ]
    },
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
      ],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Restart Claude Desktop to load the new configuration.

## Alternative: HTTP Gateway Mode

If you prefer running the HTTP gateway as a background service:

### Start the HTTP Gateway

```bash
# Start gateway in background
gateway-http --config config.yaml &
```

### Configure Claude Desktop

```json
{
  "mcpServers": {
    "postgres": {
      "command": "/path/to/gateway-stdio",
      "args": [
        "--server", "postgres",
        "--gateway", "http://localhost:4444"
      ]
    }
  }
}
```

This approach:
- Shares servers across multiple apps
- Enables HTTP API access
- Provides centralized stats and monitoring
- Allows hot reload via `/admin/reload`

## Environment Variables

### Method 1: In Claude Desktop Config

```json
{
  "mcpServers": {
    "postgres": {
      "command": "/path/to/gateway-stdio",
      "args": ["--server", "postgres", "--catalog", "/path/to/catalog.yaml"],
      "env": {
        "PGPASSWORD": "your-password",
        "DATABASE_URL": "postgresql://localhost/mydb"
      }
    }
  }
}
```

### Method 2: In Catalog (Recommended)

```yaml
# catalog.yaml
servers:
  - id: postgres
    runtime:
      type: local-process
      command: postgres-mcp
    env:
      PGPASSWORD: "${PGPASSWORD}"  # From system environment
```

Then set the environment variable before starting Claude Desktop:

```bash
export PGPASSWORD="your-password"
open -a "Claude"
```

Or add to your shell profile (`~/.zshrc`, `~/.bashrc`):

```bash
export PGPASSWORD="your-password"
export GITHUB_TOKEN="your-token"
```

## Complete Example

### Catalog File

```yaml
# ~/mcp/catalog.yaml
servers:
  - id: filesystem
    display_name: Workspace Files
    runtime:
      type: local-process
      command: npx
      args:
        - "-y"
        - "@modelcontextprotocol/server-filesystem"
        - "/Users/me/workspace"

  - id: memory
    display_name: Knowledge Graph
    runtime:
      type: local-process
      command: npx
      args:
        - "-y"
        - "@modelcontextprotocol/server-memory"

  - id: brave-search
    display_name: Web Search
    runtime:
      type: local-process
      command: npx
      args:
        - "-y"
        - "@modelcontextprotocol/server-brave-search"
    env:
      BRAVE_API_KEY: "${BRAVE_API_KEY}"
```

### Claude Desktop Config

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "/usr/local/bin/gateway-stdio",
      "args": ["--server", "filesystem", "--catalog", "/Users/me/mcp/catalog.yaml"]
    },
    "memory": {
      "command": "/usr/local/bin/gateway-stdio",
      "args": ["--server", "memory", "--catalog", "/Users/me/mcp/catalog.yaml"]
    },
    "brave-search": {
      "command": "/usr/local/bin/gateway-stdio",
      "args": ["--server", "brave-search", "--catalog", "/Users/me/mcp/catalog.yaml"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Troubleshooting

### Server Not Appearing in Claude

1. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Look for MCP-related errors

2. Test the gateway manually:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
     gateway-stdio --server postgres --catalog catalog.yaml
   ```

3. Verify paths are absolute in the config

### Server Errors

1. Enable debug logging:
   ```json
   {
     "args": ["--server", "postgres", "--catalog", "catalog.yaml", "--log-level", "debug"]
   }
   ```

2. Check stderr output in Claude logs

### Environment Variables Not Working

1. Ensure variables are exported in your shell profile
2. Restart Claude Desktop completely (quit and reopen)
3. Try setting variables directly in Claude Desktop config

## Tips

1. **Use absolute paths** everywhere in the config
2. **Test manually first** before adding to Claude Desktop
3. **Keep catalog simple** - add servers one at a time
4. **Check logs** when things don't work
5. **Restart Claude** after config changes
