---
id: troubleshooting
title: Troubleshooting
sidebar_position: 50
---

# Troubleshooting

Common issues and their solutions.

## Gateway Issues

### Gateway Won't Start

**Symptoms:**
- Gateway exits immediately
- Error message on startup

**Solutions:**

1. **Check configuration syntax:**
   ```bash
   gateway-http --config config.yaml --validate
   ```

2. **Enable debug logging:**
   ```bash
   RUST_LOG=debug gateway-http --config config.yaml
   ```

3. **Check file paths:**
   - Ensure `config.yaml` exists
   - Ensure `catalog_path` in config is correct
   - Use absolute paths if relative paths fail

4. **Check port availability:**
   ```bash
   lsof -i :4444
   # If port is in use, change listen_addr or stop the other process
   ```

### Hot Reload Not Working

**Symptoms:**
- Catalog changes not detected
- `/admin/reload` returns error

**Solutions:**

1. **Check file permissions:**
   ```bash
   ls -la catalog.yaml
   # Ensure file is readable
   ```

2. **Docker volume issues:**
   ```bash
   # Docker may not propagate file events
   # Use manual reload instead
   curl -X POST http://localhost:4444/admin/reload
   ```

3. **Check logs for errors:**
   ```
   WARN catalog_watcher: Failed to parse catalog: ...
   ```

4. **Validate catalog syntax:**
   ```bash
   # Use a YAML linter
   yamllint catalog.yaml
   ```

---

## Server Issues

### Server Won't Start

**Symptoms:**
- POST `/servers/:id/start` returns error
- Server status stuck in "starting"

**Solutions:**

1. **Check server configuration:**
   ```bash
   curl http://localhost:4444/servers/my-server | jq
   ```

2. **For local-process runtime:**
   ```bash
   # Verify command exists
   which my-mcp-command

   # Test command directly
   my-mcp-command --help
   ```

3. **Check environment variables:**
   ```yaml
   # Ensure env vars are set
   env:
     MY_VAR: "${MY_VAR}"  # Is MY_VAR actually set?
   ```

4. **Check working directory:**
   ```yaml
   runtime:
     type: local-process
     command: ./my-server
     working_dir: /path/to/dir  # Does this exist?
   ```

### Server Keeps Stopping

**Symptoms:**
- Server stops unexpectedly
- Server status goes to "unhealthy"

**Solutions:**

1. **Check idle timeout:**
   ```yaml
   # config.yaml
   idle_timeout_seconds: 300  # 5 minutes default
   ```

2. **Check server logs:**
   ```bash
   # Enable debug logging
   RUST_LOG=debug gateway-http --config config.yaml
   ```

3. **Check server process:**
   ```bash
   # For local-process, check if process is crashing
   ps aux | grep mcp
   ```

### Remote SSE Server Not Connecting

**Symptoms:**
- 502 Bad Gateway errors
- Connection timeout

**Solutions:**

1. **Verify URL is accessible:**
   ```bash
   curl -v https://mcp.example.com/api
   ```

2. **Check headers:**
   ```yaml
   runtime:
     type: remote-sse
     url: https://mcp.example.com/api
     headers:
       Authorization: "Bearer ${TOKEN}"  # Is TOKEN set?
   ```

3. **Check network connectivity:**
   ```bash
   # From gateway host/container
   curl -v https://mcp.example.com/api
   ```

---

## Client Issues

### Claude Desktop Not Connecting

**Symptoms:**
- Server not appearing in Claude
- Claude shows MCP error

**Solutions:**

1. **Verify config file location:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Check JSON syntax:**
   ```bash
   # Validate JSON
   python -m json.tool < claude_desktop_config.json
   ```

3. **Use absolute paths:**
   ```json
   {
     "mcpServers": {
       "gateway": {
         "command": "/usr/local/bin/gateway-stdio",
         "args": ["--server", "postgres", "--catalog", "/Users/me/catalog.yaml"]
       }
     }
   }
   ```

4. **Test manually:**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
     gateway-stdio --server postgres --catalog catalog.yaml
   ```

5. **Restart Claude Desktop completely**

### API Key Authentication Failing

**Symptoms:**
- 401 Unauthorized errors
- 403 Forbidden errors

**Solutions:**

1. **Check header format:**
   ```bash
   # Correct formats
   curl -H "Authorization: Bearer your-key" http://localhost:4444/servers
   curl -H "X-API-Key: your-key" http://localhost:4444/servers
   ```

2. **Verify API key matches:**
   ```bash
   # Check what key is configured
   cat config.yaml | grep api_key
   ```

3. **Check environment variable:**
   ```bash
   echo $MCP_GATEWAY_API_KEY
   ```

---

## Performance Issues

### Slow Response Times

**Solutions:**

1. **Check server health:**
   ```bash
   curl http://localhost:4444/stats | jq '.servers'
   ```

2. **Increase timeout:**
   ```yaml
   request_timeout_seconds: 60
   ```

3. **Check backend server:**
   - Is the MCP server itself slow?
   - Network latency to remote servers?

4. **Enable debug logging to trace:**
   ```bash
   RUST_LOG=debug gateway-http --config config.yaml
   ```

### High Memory Usage

**Solutions:**

1. **Check connection pool size:**
   ```yaml
   max_connections_per_server: 10  # Reduce if too high
   ```

2. **Reduce idle timeout:**
   ```yaml
   idle_timeout_seconds: 60  # Stop idle servers sooner
   ```

3. **Monitor server count:**
   ```bash
   curl http://localhost:4444/stats | jq '.active_servers'
   ```

---

## Debug Mode

Enable comprehensive debug logging:

```bash
# All components
RUST_LOG=debug gateway-http --config config.yaml

# Specific components
RUST_LOG=gateway_core=debug,gateway_http=info gateway-http --config config.yaml

# Trace level (very verbose)
RUST_LOG=trace gateway-http --config config.yaml
```

## Getting Help

If you're still stuck:

1. **Check existing issues:** [GitHub Issues](https://github.com/agentic/mcp-gateway/issues)
2. **Ask the community:** [GitHub Discussions](https://github.com/agentic/mcp-gateway/discussions)
3. **Join Discord:** [Discord Server](https://discord.gg/mcp-gateway)

When reporting issues, include:
- Gateway version (`gateway-http --version`)
- Configuration files (redact secrets)
- Full error messages
- Steps to reproduce
