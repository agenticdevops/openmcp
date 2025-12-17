---
id: mcp-protocol
title: MCP Protocol Reference
sidebar_position: 7
---

# MCP Protocol Reference

The Model Context Protocol (MCP) is a JSON-RPC 2.0 based protocol for communication between AI clients and tool servers.

## Protocol Overview

MCP uses JSON-RPC 2.0 for all messages:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}

// Error
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid request"
  }
}
```

## Message Types

### Requests

Requests have an `id` and a `method`:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "method/name",
  "params": { ... }
}
```

### Responses

Responses contain either `result` or `error`:

```json
// Success
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": { ... }
}

// Error
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "error": {
    "code": -32000,
    "message": "Error description",
    "data": { ... }  // Optional
  }
}
```

### Notifications

Notifications have no `id` (no response expected):

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/event",
  "params": { ... }
}
```

---

## Standard Methods

### Initialize

Initialize the MCP session:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "1.0",
    "clientInfo": {
      "name": "My Client",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": true,
      "resources": true
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "1.0",
    "serverInfo": {
      "name": "MCP Server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": { "supported": true },
      "resources": { "supported": true }
    }
  }
}
```

### tools/list

List available tools:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// Response
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
            "sql": {
              "type": "string",
              "description": "The SQL query to execute"
            }
          },
          "required": ["sql"]
        }
      }
    ]
  }
}
```

### tools/call

Call a specific tool:

```json
// Request
{
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

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "id | name | email\n1 | Alice | alice@example.com\n..."
      }
    ]
  }
}
```

### resources/list

List available resources:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list"
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///workspace/README.md",
        "name": "README.md",
        "mimeType": "text/markdown"
      }
    ]
  }
}
```

### resources/read

Read a specific resource:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "file:///workspace/README.md"
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": [
      {
        "uri": "file:///workspace/README.md",
        "mimeType": "text/markdown",
        "text": "# My Project\n\nThis is the README..."
      }
    ]
  }
}
```

### prompts/list

List available prompts:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list"
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "explain-code",
        "description": "Explain a piece of code",
        "arguments": [
          {
            "name": "code",
            "description": "The code to explain",
            "required": true
          }
        ]
      }
    ]
  }
}
```

### prompts/get

Get a specific prompt:

```json
// Request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "explain-code",
    "arguments": {
      "code": "function foo() { return 42; }"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please explain this code:\n\n```\nfunction foo() { return 42; }\n```"
        }
      }
    ]
  }
}
```

---

## Error Codes

### Standard JSON-RPC Errors

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid request | Not valid JSON-RPC |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Internal server error |

### MCP-Specific Errors

| Code | Message | Description |
|------|---------|-------------|
| -32000 | Server error | Generic server error |
| -32001 | Resource not found | Resource doesn't exist |
| -32002 | Tool not found | Tool doesn't exist |
| -32003 | Permission denied | Access denied |

---

## Gateway-Specific Handling

### Request Wrapping

The gateway wraps MCP requests with server routing:

```json
// Client sends to gateway
{
  "server_id": "postgres",
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// Gateway forwards to server
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### Response Passthrough

Responses are passed through unchanged:

```json
// Server responds
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}

// Gateway returns same response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

### Error Handling

The gateway may add its own errors:

```json
// Server not found
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32001,
    "message": "Server 'unknown' not found"
  }
}

// Connection failed
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Failed to connect to server"
  }
}
```

---

## Implementation Notes

### Message Parsing

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct McpMessage {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<McpError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}
```

### ID Handling

The `id` field can be a string, number, or null:

```rust
// Handle various ID types
match &message.id {
    Some(Value::Number(n)) => println!("Numeric ID: {}", n),
    Some(Value::String(s)) => println!("String ID: {}", s),
    Some(Value::Null) => println!("Null ID"),
    None => println!("No ID (notification)"),
    _ => println!("Invalid ID type"),
}
```

### Content Types

MCP supports multiple content types in responses:

```json
{
  "content": [
    { "type": "text", "text": "Plain text content" },
    { "type": "image", "data": "base64...", "mimeType": "image/png" },
    { "type": "resource", "uri": "file:///path/to/file" }
  ]
}
```

---

## Further Reading

- [MCP Specification](https://modelcontextprotocol.io/spec)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
