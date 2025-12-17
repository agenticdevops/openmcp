---
id: http-transport
title: HTTP Transport
sidebar_position: 1
---

# HTTP Transport

The HTTP transport (`gateway-http`) provides a RESTful API for interacting with MCP servers.

## Starting the HTTP Gateway

```bash
gateway-http --config config.yaml
```

Default listening address: `0.0.0.0:4444`

## API Endpoints

### Health Check

```http
GET /health
```

Returns the gateway health status. Always returns 200 if the server is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

### List Servers

```http
GET /servers
```

Returns all configured MCP servers with their current status.

**Response:**
```json
[
  {
    "id": "postgres",
    "display_name": "PostgreSQL Tools",
    "description": "Database query and schema tools",
    "status": "running",
    "tags": ["database", "production"],
    "started_at": "2024-01-15T10:30:00Z",
    "request_count": 42
  },
  {
    "id": "github",
    "display_name": "GitHub API",
    "status": "stopped",
    "tags": ["vcs"]
  }
]
```

**Filter by tag:**
```http
GET /servers?tag=database
```

---

### Get Server Details

```http
GET /servers/:id
```

Returns detailed information about a specific server.

**Response:**
```json
{
  "id": "postgres",
  "display_name": "PostgreSQL Tools",
  "description": "Database query and schema tools",
  "status": "running",
  "runtime": {
    "type": "local-process",
    "command": "postgres-mcp"
  },
  "tags": ["database", "production"],
  "started_at": "2024-01-15T10:30:00Z",
  "last_activity": "2024-01-15T11:45:30Z",
  "request_count": 42,
  "uptime_seconds": 4530
}
```

**Error (server not found):**
```json
{
  "error": "Not Found",
  "message": "Server 'unknown' not found"
}
```

---

### Start Server

```http
POST /servers/:id/start
```

Manually starts a server. Servers are also auto-started on first request.

**Response:**
```json
{
  "id": "postgres",
  "status": "running",
  "message": "Server started successfully"
}
```

**Already running:**
```json
{
  "id": "postgres",
  "status": "running",
  "message": "Server already running"
}
```

---

### Stop Server

```http
POST /servers/:id/stop
```

Manually stops a running server.

**Response:**
```json
{
  "id": "postgres",
  "status": "stopped",
  "message": "Server stopped successfully"
}
```

---

### MCP Request (Preferred)

```http
POST /mcp
Content-Type: application/json
```

Send an MCP JSON-RPC request to a server.

**Request:**
```json
{
  "server_id": "postgres",
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "query",
        "description": "Execute a SQL query"
      }
    ]
  }
}
```

**With parameters:**
```json
{
  "server_id": "postgres",
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "query",
    "arguments": {
      "sql": "SELECT * FROM users LIMIT 10"
    }
  }
}
```

---

### Raw RPC Request

```http
POST /rpc
Content-Type: application/json
X-Server-ID: postgres
```

Alternative endpoint where server ID is in the header.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

---

### Gateway Statistics

```http
GET /stats
```

Returns gateway-wide statistics.

**Response:**
```json
{
  "uptime_seconds": 86400,
  "total_requests": 1500,
  "active_servers": 3,
  "servers": {
    "postgres": {
      "status": "running",
      "request_count": 500,
      "uptime_seconds": 3600
    },
    "github": {
      "status": "stopped",
      "request_count": 1000
    }
  }
}
```

---

### Admin: Reload Catalog

```http
POST /admin/reload
```

Trigger a manual catalog reload.

**Response:**
```json
{
  "status": "ok",
  "message": "Catalog reloaded",
  "servers_loaded": 5
}
```

---

## Common MCP Methods

These are standard MCP methods you can call via `/mcp`:

| Method | Description |
|--------|-------------|
| `initialize` | Initialize the MCP session |
| `tools/list` | List available tools |
| `tools/call` | Call a specific tool |
| `resources/list` | List available resources |
| `resources/read` | Read a specific resource |
| `prompts/list` | List available prompts |
| `prompts/get` | Get a specific prompt |

### Example: List Tools

```bash
curl -X POST http://localhost:4444/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": "postgres",
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Example: Call a Tool

```bash
curl -X POST http://localhost:4444/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": "postgres",
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "query",
      "arguments": {
        "sql": "SELECT COUNT(*) FROM users"
      }
    }
  }'
```

## Error Handling

### Server Errors

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Server error: connection failed"
  }
}
```

### Gateway Errors

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad request (invalid JSON, missing fields) |
| 401 | Unauthorized (missing API key) |
| 403 | Forbidden (invalid API key) |
| 404 | Server not found |
| 500 | Internal gateway error |
| 502 | Backend server error |
| 504 | Backend timeout |

## CORS

CORS is enabled by default. Configure allowed origins in the gateway config:

```yaml
cors_enabled: true
cors_origins:
  - "http://localhost:3000"
  - "https://app.example.com"
```
