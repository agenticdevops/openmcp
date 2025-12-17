---
id: authentication
title: Authentication
sidebar_position: 4
---

# Authentication

Open MCP Gateway supports optional API key authentication to secure access to the gateway endpoints.

## Enabling Authentication

Set the `api_key` in your gateway configuration:

```yaml
# config.yaml
listen_addr: "0.0.0.0:4444"
catalog_path: "catalog.yaml"
api_key: "${MCP_GATEWAY_API_KEY}"
```

Then set the environment variable:

```bash
export MCP_GATEWAY_API_KEY="your-secret-api-key"
gateway-http --config config.yaml
```

## Making Authenticated Requests

When authentication is enabled, include the API key in requests using one of these methods:

### Bearer Token (Recommended)

```bash
curl -H "Authorization: Bearer your-secret-api-key" \
  http://localhost:4444/servers
```

### X-API-Key Header

```bash
curl -H "X-API-Key: your-secret-api-key" \
  http://localhost:4444/servers
```

## Protected Endpoints

When authentication is enabled, these endpoints require the API key:

| Endpoint | Protected |
|----------|-----------|
| `GET /health` | No |
| `GET /servers` | Yes |
| `GET /servers/:id` | Yes |
| `POST /servers/:id/start` | Yes |
| `POST /servers/:id/stop` | Yes |
| `POST /mcp` | Yes |
| `POST /rpc` | Yes |
| `GET /stats` | Yes |
| `POST /admin/reload` | Yes |

The `/health` endpoint remains unprotected to support load balancer health checks.

## Error Responses

**Missing API key:**
```json
{
  "error": "Unauthorized",
  "message": "API key required"
}
```
HTTP Status: 401

**Invalid API key:**
```json
{
  "error": "Forbidden",
  "message": "Invalid API key"
}
```
HTTP Status: 403

## Security Best Practices

### 1. Use Environment Variables

Never hardcode API keys in configuration files:

```yaml
# Good - from environment
api_key: "${MCP_GATEWAY_API_KEY}"

# Bad - hardcoded
api_key: "my-secret-key"
```

### 2. Use Strong Keys

Generate a strong random key:

```bash
# Generate a 32-character random key
openssl rand -base64 32
```

### 3. Rotate Keys Regularly

Update the API key periodically:

1. Generate a new key
2. Update the environment variable
3. Restart the gateway
4. Update all clients

### 4. Use HTTPS in Production

Always use HTTPS to protect the API key in transit:

```bash
# Behind a reverse proxy (nginx, traefik)
# The proxy handles TLS termination
```

### 5. Limit Network Access

Combine authentication with network-level security:

```yaml
# Listen only on internal interface
listen_addr: "10.0.0.1:4444"
```

## Client Configuration Examples

### curl

```bash
export MCP_API_KEY="your-api-key"

curl -H "Authorization: Bearer $MCP_API_KEY" \
  http://localhost:4444/servers
```

### JavaScript/TypeScript

```typescript
const API_KEY = process.env.MCP_GATEWAY_API_KEY;

const response = await fetch('http://localhost:4444/servers', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
  },
});
```

### Python

```python
import os
import requests

api_key = os.environ['MCP_GATEWAY_API_KEY']

response = requests.get(
    'http://localhost:4444/servers',
    headers={'Authorization': f'Bearer {api_key}'}
)
```

## Multi-Tenant Authentication (v0.3)

:::info Coming in v0.3
Multi-tenant API keys tied to namespaces are planned for version 0.3.0.
:::

Future versions will support:
- Per-tenant API keys
- Namespace-scoped access
- Role-based permissions
- Key management API

```yaml
# Planned configuration (v0.3)
tenants:
  - id: tenant-a
    api_key: "${TENANT_A_API_KEY}"
    namespaces: [production]
  - id: tenant-b
    api_key: "${TENANT_B_API_KEY}"
    namespaces: [staging, development]
```
