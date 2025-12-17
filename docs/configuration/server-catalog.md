---
id: server-catalog
title: Server Catalog
sidebar_position: 2
---

# Server Catalog

The server catalog (`catalog.yaml`) defines all MCP servers available through the gateway.

## Structure

```yaml
servers:
  - id: server-id
    display_name: Human Readable Name
    description: Optional description
    runtime:
      type: runtime-type
      # ... runtime-specific options
    env:
      KEY: value
    tags:
      - category
      - subcategory
```

## Server Definition Fields

### id (required)

**Type:** String

Unique identifier for the server. Used in API calls and internal references.

- Must be unique across all servers
- Should be URL-safe (lowercase, hyphens, no spaces)
- Cannot be changed without breaking client references

```yaml
id: postgres-mcp
id: github-api
id: my-custom-server
```

### display_name (optional)

**Type:** String
**Default:** Same as `id`

Human-readable name shown in UI and listings.

```yaml
display_name: PostgreSQL Database Tools
display_name: GitHub API Integration
```

### description (optional)

**Type:** String
**Default:** Empty

Detailed description of the server's purpose and capabilities.

```yaml
description: |
  Provides SQL query execution and schema introspection
  for PostgreSQL databases. Supports read and write operations.
```

### runtime (required)

**Type:** Object

Defines how to start and connect to the MCP server. See [Runtimes](/docs/configuration/runtimes) for full details.

```yaml
# Local process
runtime:
  type: local-process
  command: postgres-mcp
  args: ["--transport", "stdio"]

# Remote SSE
runtime:
  type: remote-sse
  url: https://mcp.example.com/server
```

### env (optional)

**Type:** Object (key-value pairs)
**Default:** Empty

Environment variables passed to the server process. Supports variable substitution.

```yaml
env:
  DATABASE_URL: postgresql://localhost/mydb
  API_KEY: "${EXTERNAL_API_KEY}"
  DEBUG: "true"
```

**Notes:**
- Only applies to `local-process` and `docker` runtimes
- Variables are resolved at catalog load time
- Use `${VAR}` syntax for environment substitution

### tags (optional)

**Type:** Array of Strings
**Default:** Empty

Categories for organizing and filtering servers.

```yaml
tags:
  - database
  - production
  - read-only
```

**Usage:**
```bash
# Filter servers by tag
curl "http://localhost:4444/servers?tag=database"
```

## Complete Example

```yaml
servers:
  # PostgreSQL database server
  - id: postgres
    display_name: PostgreSQL Database
    description: Query and manage PostgreSQL databases
    runtime:
      type: local-process
      command: postgres-mcp
      args:
        - "--transport=stdio"
        - "--host=${DB_HOST}"
      working_dir: /opt/mcp
    env:
      PGPASSWORD: "${PGPASSWORD}"
      PGSSLMODE: require
    tags:
      - database
      - production

  # GitHub integration
  - id: github
    display_name: GitHub API
    description: Access GitHub repositories, issues, and PRs
    runtime:
      type: remote-sse
      url: https://mcp.github.example.com/v1
      headers:
        Authorization: "Bearer ${GITHUB_TOKEN}"
    tags:
      - vcs
      - external

  # File system access (sandboxed)
  - id: filesystem
    display_name: File System
    description: Read and write files in the workspace
    runtime:
      type: local-process
      command: filesystem-mcp
      args:
        - "--root=/workspace"
        - "--read-only=false"
    tags:
      - files
      - local

  # Monitoring server (always running)
  - id: monitoring
    display_name: System Monitoring
    description: System metrics and health checks
    runtime:
      type: remote-sse
      url: http://monitoring-mcp:8080/mcp
    tags:
      - monitoring
      - internal
```

## Hot Reload

The catalog supports hot reload - changes are applied without restart:

1. Edit `catalog.yaml`
2. Save the file
3. Gateway detects changes (500ms debounce)
4. New catalog is validated
5. Registry is atomically updated

**What happens to running servers:**
- Unchanged servers: Continue running
- Modified servers: Continue running with old config until restart
- Removed servers: Gracefully stopped
- New servers: Available immediately

**Reload logs:**
```
INFO catalog_watcher: Catalog changed, reloading...
INFO catalog_watcher: Loaded 5 servers (added: 1, removed: 0, modified: 1)
```

**Manual reload:**
```bash
curl -X POST http://localhost:4444/admin/reload
```

## Validation Rules

The gateway validates catalogs on load:

| Rule | Error |
|------|-------|
| Duplicate `id` | `Duplicate server ID: <id>` |
| Missing `id` | `Server at index <n> missing required field: id` |
| Missing `runtime` | `Server '<id>' missing required field: runtime` |
| Unknown runtime type | `Server '<id>' has unknown runtime type: <type>` |
| Invalid YAML | Standard YAML parse error |

## Organization Patterns

### By Environment

```yaml
servers:
  # Development servers
  - id: dev-postgres
    tags: [database, development]
    runtime:
      type: local-process
      command: postgres-mcp
    env:
      DATABASE_URL: postgresql://localhost/dev

  # Production servers
  - id: prod-postgres
    tags: [database, production]
    runtime:
      type: remote-sse
      url: https://prod-mcp.internal/postgres
```

### By Capability

```yaml
servers:
  # Read-only servers
  - id: db-reader
    tags: [database, read-only]
    # ...

  # Write-capable servers
  - id: db-writer
    tags: [database, read-write]
    # ...
```

### By Team

```yaml
servers:
  - id: team-a-tools
    tags: [team-a]
    # ...

  - id: team-b-tools
    tags: [team-b]
    # ...
```
