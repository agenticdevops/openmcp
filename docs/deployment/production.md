---
id: production
title: Production Guide
sidebar_position: 3
---

# Production Guide

Best practices for deploying Open MCP Gateway in production environments.

## Pre-Deployment Checklist

- [ ] API key authentication enabled
- [ ] HTTPS/TLS configured (via reverse proxy)
- [ ] Log level set to `warn` or `info`
- [ ] Health checks configured
- [ ] Resource limits set
- [ ] Backup strategy for configuration
- [ ] Monitoring and alerting configured
- [ ] Runbook documented

## Security

### Enable Authentication

Always require API key in production:

```yaml
# config.yaml
api_key: "${MCP_GATEWAY_API_KEY}"
```

```bash
# Set via environment
export MCP_GATEWAY_API_KEY=$(openssl rand -base64 32)
```

### Use HTTPS

Deploy behind a reverse proxy that handles TLS:

**Nginx:**
```nginx
server {
    listen 443 ssl http2;
    server_name mcp-gateway.example.com;

    ssl_certificate /etc/letsencrypt/live/mcp-gateway.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp-gateway.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4444;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Traefik:**
```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "443:443"

  mcp-gateway:
    image: ghcr.io/agentic/mcp-gateway:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp-gateway.rule=Host(`mcp-gateway.example.com`)"
      - "traefik.http.routers.mcp-gateway.tls.certresolver=letsencrypt"
```

### Network Security

Bind to localhost if behind a proxy:

```yaml
# config.yaml
listen_addr: "127.0.0.1:4444"
```

Or use firewall rules:
```bash
# Allow only from load balancer
ufw allow from 10.0.0.0/8 to any port 4444
ufw deny 4444
```

### Secret Management

**HashiCorp Vault:**
```bash
# Fetch secrets from Vault
export MCP_GATEWAY_API_KEY=$(vault kv get -field=api_key secret/mcp-gateway)
export DATABASE_URL=$(vault kv get -field=url secret/database)
```

**AWS Secrets Manager:**
```bash
export MCP_GATEWAY_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id mcp-gateway/api-key \
  --query SecretString --output text)
```

## Performance

### Resource Sizing

**Small (< 100 req/min):**
```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "100m"
  limits:
    memory: "128Mi"
    cpu: "250m"
```

**Medium (100-1000 req/min):**
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "1000m"
```

**Large (> 1000 req/min):**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "2000m"
```

### Connection Tuning

```yaml
# config.yaml
max_connections_per_server: 50
request_timeout_seconds: 60
idle_timeout_seconds: 600
```

### Horizontal Scaling

Deploy multiple gateway instances behind a load balancer:

```yaml
# kubernetes deployment
spec:
  replicas: 3
```

Note: Each gateway maintains its own server connections. Consider using `remote-sse` runtime for stateless scaling.

## Reliability

### Health Checks

Configure health checks for your orchestrator:

```yaml
# Kubernetes
livenessProbe:
  httpGet:
    path: /health
    port: 4444
  initialDelaySeconds: 10
  periodSeconds: 30
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 4444
  initialDelaySeconds: 5
  periodSeconds: 10
```

### Graceful Shutdown

The gateway handles SIGTERM gracefully:
1. Stops accepting new connections
2. Completes in-flight requests
3. Shuts down running servers
4. Exits

Configure shutdown timeout in orchestrator:
```yaml
# Kubernetes
spec:
  terminationGracePeriodSeconds: 60
```

### Restart Policy

Always restart on failure:

```yaml
# Docker Compose
restart: unless-stopped

# Kubernetes
spec:
  restartPolicy: Always
```

## Monitoring

### Metrics Endpoint

The `/stats` endpoint provides metrics:

```bash
curl http://localhost:4444/stats | jq
```

### Prometheus Integration

Scrape the stats endpoint:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mcp-gateway'
    static_configs:
      - targets: ['mcp-gateway:4444']
    metrics_path: /stats
```

### Alerting Rules

```yaml
# prometheus rules
groups:
  - name: mcp-gateway
    rules:
      - alert: GatewayDown
        expr: up{job="mcp-gateway"} == 0
        for: 1m
        annotations:
          summary: "MCP Gateway is down"

      - alert: HighErrorRate
        expr: rate(mcp_errors_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate on MCP Gateway"
```

### Logging

Set appropriate log level:

```yaml
# config.yaml
log_level: "warn"  # Production: warn or info
```

Log aggregation setup:

```bash
# Fluentd / Fluent Bit
# Logs are JSON-formatted for easy parsing
```

## Backup & Recovery

### Configuration Backup

Store configs in version control:

```bash
# Git repository structure
mcp-gateway/
├── config.yaml
├── catalog.yaml
└── environments/
    ├── production/
    │   ├── config.yaml
    │   └── catalog.yaml
    └── staging/
        ├── config.yaml
        └── catalog.yaml
```

### Disaster Recovery

1. **Configuration**: Restore from Git
2. **Secrets**: Restore from secret manager
3. **State**: Gateway is stateless - just redeploy

## Maintenance

### Rolling Updates

Update without downtime:

```bash
# Kubernetes
kubectl set image deployment/mcp-gateway \
  gateway=ghcr.io/agentic/mcp-gateway:v0.2.0

# Docker Compose
docker-compose pull
docker-compose up -d
```

### Catalog Updates

Use hot reload for catalog changes:

```bash
# Update catalog file
vim catalog.yaml

# Gateway auto-reloads, or trigger manually:
curl -X POST http://localhost:4444/admin/reload
```

### Version Upgrades

1. Read the changelog for breaking changes
2. Test in staging environment
3. Update configuration if needed
4. Rolling deploy to production
5. Verify with smoke tests

## Troubleshooting

### Common Issues

**Gateway won't start:**
```bash
# Check config syntax
gateway-http --config config.yaml --validate

# Check logs
RUST_LOG=debug gateway-http --config config.yaml
```

**Servers not connecting:**
```bash
# Check server status
curl http://localhost:4444/servers | jq

# Test specific server
curl -X POST http://localhost:4444/servers/postgres/start
```

**High latency:**
```bash
# Check stats
curl http://localhost:4444/stats | jq '.servers'

# Increase timeouts or connection pool
```

### Debug Mode

Temporarily enable debug logging:

```bash
RUST_LOG=debug gateway-http --config config.yaml
```

Or update running instance:
```bash
# If supported by your deployment
kubectl set env deployment/mcp-gateway RUST_LOG=debug
```
