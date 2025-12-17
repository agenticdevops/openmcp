---
id: hot-reload
title: Hot Reload
sidebar_position: 4
---

# Hot Reload

Open MCP Gateway supports hot reload of the server catalog without restarting the gateway.

## How It Works

```
catalog.yaml modified
        ↓
File watcher detects change
        ↓
500ms debounce (handles rapid saves)
        ↓
Parse and validate new catalog
        ↓
Atomic registry swap
        ↓
New servers available immediately
```

## Automatic Reload

Hot reload is enabled by default. When you save changes to `catalog.yaml`:

1. The file watcher detects the modification
2. After a 500ms debounce period, the new catalog is loaded
3. The server registry is atomically updated
4. Changes are immediately available

**Example log output:**
```
INFO catalog_watcher: Catalog file changed, scheduling reload...
INFO catalog_watcher: Reloading catalog from: /path/to/catalog.yaml
INFO catalog_watcher: Loaded 5 servers (added: 1, removed: 0, modified: 1, unchanged: 3)
```

## Manual Reload

Trigger a reload via the admin API:

```bash
curl -X POST http://localhost:4444/admin/reload
```

**Response:**
```json
{
  "status": "ok",
  "message": "Catalog reloaded",
  "servers_loaded": 5
}
```

This is useful when:
- File watcher is not detecting changes
- You want to force a reload
- Automated deployment scripts need to trigger reload

## What Happens During Reload

### New Servers

- Immediately available in the registry
- Start on first request (on-demand)
- No impact on existing servers

### Modified Servers

- Configuration change detected by ID
- Running servers continue with old config
- New config takes effect on next restart
- Use stop/start to apply changes to running servers

```bash
# Apply changes to a modified running server
curl -X POST http://localhost:4444/servers/postgres/stop
curl -X POST http://localhost:4444/servers/postgres/start
```

### Removed Servers

- Gracefully stopped if running
- Removed from registry
- Existing connections completed before shutdown
- Subsequent requests return "not found"

### Unchanged Servers

- No impact whatsoever
- Running servers continue running
- Connections maintained

## Debouncing

The file watcher uses a 500ms debounce to handle:

- Multiple rapid saves (IDE auto-save)
- Partial writes during file sync
- Network file system delays

During the debounce period:
- Additional changes reset the timer
- Only the final state is loaded
- No intermediate states are applied

## Error Handling

### Invalid YAML

If the new catalog has syntax errors:

```
ERROR catalog_watcher: Failed to parse catalog: expected ':' at line 5
WARN catalog_watcher: Keeping previous catalog due to parse error
```

The existing configuration continues to work.

### Missing Required Fields

```
ERROR catalog_watcher: Server at index 2 missing required field: runtime
WARN catalog_watcher: Keeping previous catalog due to validation error
```

### Unknown Runtime Type

```
ERROR catalog_watcher: Server 'my-server' has unknown runtime type: unknown
WARN catalog_watcher: Keeping previous catalog due to validation error
```

## Best Practices

### 1. Validate Before Deploy

```bash
# Validate catalog syntax
gateway-http --config config.yaml --validate

# Or use a YAML linter
yamllint catalog.yaml
```

### 2. Use Version Control

```bash
# Track changes to catalog
git add catalog.yaml
git commit -m "Add new postgres server"
git push
```

### 3. Staged Rollouts

```yaml
# catalog.yaml - add one server at a time
servers:
  - id: existing-server
    # ... existing config

  # New server - add and save
  - id: new-server
    runtime:
      type: local-process
      command: new-mcp
```

### 4. Monitor Reload Events

Watch the gateway logs during changes:

```bash
# Terminal 1: Watch logs
RUST_LOG=info gateway-http --config config.yaml

# Terminal 2: Edit catalog
vim catalog.yaml
```

### 5. Automate with CI/CD

```yaml
# .github/workflows/deploy-catalog.yml
- name: Update catalog
  run: |
    scp catalog.yaml server:/etc/mcp-gateway/
    curl -X POST http://server:4444/admin/reload
```

## Monitoring Reload Status

### Gateway Stats

Check when the last reload occurred:

```bash
curl http://localhost:4444/stats | jq '.last_reload'
```

### Server Count

Verify expected number of servers:

```bash
curl http://localhost:4444/servers | jq 'length'
```

### Specific Server

Check if a specific server was loaded:

```bash
curl http://localhost:4444/servers/new-server
```

## Disabling Hot Reload

If you need to disable automatic hot reload:

```yaml
# config.yaml
catalog_path: "catalog.yaml"
hot_reload: false  # Disable file watching
```

With hot reload disabled:
- Changes require gateway restart
- Manual reload via API still works
- File watcher is not started

## Troubleshooting

### Changes Not Detected

1. Check file permissions
2. Ensure catalog path is correct
3. Try manual reload: `POST /admin/reload`
4. Check for file system event limitations (NFS, Docker volumes)

### Reload Failing Silently

Enable debug logging:

```bash
RUST_LOG=debug gateway-http --config config.yaml
```

### Container/Docker Issues

If using Docker with mounted volumes:

```yaml
# docker-compose.yml
volumes:
  - ./catalog.yaml:/app/catalog.yaml:ro

# Note: Some Docker setups don't propagate file events
# Use manual reload via API in these cases
```
