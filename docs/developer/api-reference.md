---
id: api-reference
title: API Reference
sidebar_position: 5
---

# API Reference

Complete HTTP API reference for Open MCP Gateway.

## Base URL

```
http://localhost:4444
```

## Authentication

When `api_key` is configured, include in requests:

```http
Authorization: Bearer <api-key>
# or
X-API-Key: <api-key>
```

---

## Health & Status

### GET /health

Health check endpoint. Always unprotected.

**Response:** `200 OK`
```json
{
  "status": "ok"
}
```

---

### GET /stats

Gateway statistics and metrics.

**Response:** `200 OK`
```json
{
  "uptime_seconds": 86400,
  "total_requests": 15000,
  "active_servers": 3,
  "total_servers": 5,
  "last_reload": "2024-01-15T10:30:00Z",
  "servers": {
    "postgres": {
      "status": "running",
      "request_count": 5000,
      "uptime_seconds": 3600,
      "last_activity": "2024-01-15T11:29:55Z"
    },
    "github": {
      "status": "stopped",
      "request_count": 10000
    }
  }
}
```

---

## Server Management

### GET /servers

List all configured servers.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `tag` | string | Filter by tag |

**Response:** `200 OK`
```json
[
  {
    "id": "postgres",
    "display_name": "PostgreSQL Tools",
    "description": "Database query and schema tools",
    "status": "running",
    "tags": ["database", "production"],
    "runtime_type": "local-process",
    "started_at": "2024-01-15T10:30:00Z",
    "last_activity": "2024-01-15T11:29:55Z",
    "request_count": 42,
    "uptime_seconds": 3595
  },
  {
    "id": "github",
    "display_name": "GitHub API",
    "status": "stopped",
    "tags": ["vcs"],
    "runtime_type": "remote-sse",
    "request_count": 100
  }
]
```

**Example with filter:**
```bash
curl "http://localhost:4444/servers?tag=database"
```

---

### GET /servers/:id

Get details for a specific server.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Server ID |

**Response:** `200 OK`
```json
{
  "id": "postgres",
  "display_name": "PostgreSQL Tools",
  "description": "Database query and schema tools",
  "status": "running",
  "runtime": {
    "type": "local-process",
    "command": "postgres-mcp",
    "args": ["--transport", "stdio"]
  },
  "env": {
    "PGHOST": "localhost"
  },
  "tags": ["database", "production"],
  "started_at": "2024-01-15T10:30:00Z",
  "last_activity": "2024-01-15T11:29:55Z",
  "request_count": 42,
  "uptime_seconds": 3595,
  "connection_count": 2
}
```

**Error Response:** `404 Not Found`
```json
{
  "error": "Not Found",
  "message": "Server 'unknown' not found"
}
```

---

### POST /servers/:id/start

Start a stopped server.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Server ID |

**Response:** `200 OK`
```json
{
  "id": "postgres",
  "status": "running",
  "message": "Server started successfully"
}
```

**Already Running:** `200 OK`
```json
{
  "id": "postgres",
  "status": "running",
  "message": "Server already running"
}
```

**Error:** `502 Bad Gateway`
```json
{
  "error": "Bad Gateway",
  "message": "Failed to start server: process exited with code 1"
}
```

---

### POST /servers/:id/stop

Stop a running server.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Server ID |

**Response:** `200 OK`
```json
{
  "id": "postgres",
  "status": "stopped",
  "message": "Server stopped successfully"
}
```

**Already Stopped:** `200 OK`
```json
{
  "id": "postgres",
  "status": "stopped",
  "message": "Server already stopped"
}
```

---

## MCP Communication

### POST /mcp

Send an MCP JSON-RPC request.

**Request Body:**
```json
{
  "server_id": "postgres",
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `server_id` | string | Yes | Target server ID |
| `jsonrpc` | string | Yes | Must be "2.0" |
| `id` | number/string | Yes | Request ID |
| `method` | string | Yes | MCP method name |
| `params` | object | No | Method parameters |

**Response:** `200 OK`
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "query",
        "description": "Execute a SQL query",
        "inputSchema": {
          "type": "object",
          "properties": {
            "sql": { "type": "string" }
          },
          "required": ["sql"]
        }
      }
    ]
  }
}
```

**Error Response:**
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

---

### POST /rpc

Alternative MCP endpoint with server ID in header.

**Headers:**
```http
Content-Type: application/json
X-Server-ID: postgres
```

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:** Same as `/mcp`

---

## Admin

### POST /admin/reload

Trigger a manual catalog reload.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "message": "Catalog reloaded",
  "servers_loaded": 5,
  "servers_added": 1,
  "servers_removed": 0
}
```

**Error:** `500 Internal Server Error`
```json
{
  "error": "Internal Server Error",
  "message": "Failed to reload catalog: parse error at line 5"
}
```

---

## Common MCP Methods

Standard MCP methods to use with `/mcp`:

| Method | Description |
|--------|-------------|
| `initialize` | Initialize MCP session |
| `tools/list` | List available tools |
| `tools/call` | Call a tool |
| `resources/list` | List available resources |
| `resources/read` | Read a resource |
| `resources/templates/list` | List resource templates |
| `prompts/list` | List available prompts |
| `prompts/get` | Get a prompt |
| `logging/setLevel` | Set logging level |

### Example: tools/call

```bash
curl -X POST http://localhost:4444/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "server_id": "postgres",
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "query",
      "arguments": {
        "sql": "SELECT COUNT(*) FROM users"
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "count\n-----\n42"
      }
    ]
  }
}
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid JSON, missing fields) |
| 401 | Unauthorized (missing API key) |
| 403 | Forbidden (invalid API key) |
| 404 | Not Found (server doesn't exist) |
| 500 | Internal Server Error |
| 502 | Bad Gateway (backend server error) |
| 504 | Gateway Timeout |

### JSON-RPC Error Codes

| Code | Meaning |
|------|---------|
| -32700 | Parse error |
| -32600 | Invalid request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32000 to -32099 | Server error (MCP-specific) |

---

## Rate Limiting

Currently no built-in rate limiting. Implement at reverse proxy level if needed.

## Pagination

List endpoints currently return all items. Pagination planned for v0.3.
