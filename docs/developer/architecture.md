---
id: architecture
title: Architecture
sidebar_position: 2
---

# Architecture

This document describes the high-level architecture of Open MCP Gateway.

## System Overview

```
                    ┌─────────────────────────────────────────────────┐
                    │              Open MCP Gateway                    │
┌─────────┐        │  ┌─────────────────────────────────────────────┐│        ┌─────────────┐
│ Claude  │◀──────▶│  │           HTTP Transport (Axum)             ││        │  Local MCP  │
│ Desktop │ stdio  │  │  GET /servers  POST /mcp  POST /admin/...   ││   ┌───▶│   Server    │
└─────────┘        │  └───────────────────┬─────────────────────────┘│   │    └─────────────┘
                   │                      │                           │   │
┌─────────┐        │  ┌───────────────────▼─────────────────────────┐│   │    ┌─────────────┐
│  Web    │◀──────▶│  │            Server Manager                   ││───┼───▶│ Remote SSE  │
│  App    │  HTTP  │  │  • Auto-start  • Pooling  • Idle timeout   ││   │    │   Server    │
└─────────┘        │  └───────────────────┬─────────────────────────┘│   │    └─────────────┘
                   │                      │                           │   │
┌─────────┐        │  ┌───────────────────▼─────────────────────────┐│   │    ┌─────────────┐
│  Cline  │◀──────▶│  │            Runtime Layer                    ││───┴───▶│   Docker    │
│Extension│ stdio  │  │  LocalProcess | RemoteSSE | Docker | K8s   ││        │  Container  │
└─────────┘        │  └─────────────────────────────────────────────┘│        └─────────────┘
                    │                                                  │
                    │  ┌─────────────────────────────────────────────┐│
                    │  │            Server Registry                   ││
                    │  │  catalog.yaml → HashMap<String, Server>     ││
                    │  └─────────────────────────────────────────────┘│
                    │                      ▲                           │
                    │  ┌───────────────────┴─────────────────────────┐│
                    │  │           Catalog Watcher                    ││
                    │  │  File watch → Debounce → Atomic swap        ││
                    │  └─────────────────────────────────────────────┘│
                    └─────────────────────────────────────────────────┘
```

## Component Details

### HTTP Transport Layer

**File:** `gateway-http/src/main.rs`, `gateway-http/src/routes.rs`

The HTTP layer uses Axum to provide:

```rust
let app = Router::new()
    .route("/health", get(health))
    .route("/servers", get(list_servers))
    .route("/servers/:id", get(get_server))
    .route("/servers/:id/start", post(start_server))
    .route("/servers/:id/stop", post(stop_server))
    .route("/mcp", post(mcp_request))
    .route("/rpc", post(rpc_request))
    .route("/stats", get(stats))
    .route("/admin/reload", post(reload_catalog))
    .layer(auth_layer)
    .layer(TraceLayer::new_for_http());
```

Features:
- RESTful endpoints for server management
- JSON-RPC endpoint for MCP communication
- Optional API key authentication
- Request tracing and logging

### Stdio Transport Layer

**File:** `gateway-stdio/src/main.rs`

The stdio wrapper:

```rust
loop {
    // Read JSON-RPC from stdin
    let message = read_line_from_stdin()?;

    // Forward to MCP server
    let response = backend.send(message).await?;

    // Write response to stdout
    write_line_to_stdout(response)?;
}
```

Used by:
- Claude Desktop
- Cline VS Code extension
- Continue.dev
- Any stdin/stdout MCP client

### Server Manager

**File:** `gateway-core/src/manager.rs`

Responsibilities:

```rust
pub struct ServerManager {
    registry: Arc<ServerRegistry>,
    connections: RwLock<HashMap<String, ConnectionPool>>,
    status: RwLock<HashMap<String, ServerStatus>>,
}

impl ServerManager {
    // Auto-start server if not running
    pub async fn get_connection(&self, server_id: &str) -> Result<Connection>;

    // Explicit lifecycle control
    pub async fn start_server(&self, server_id: &str) -> Result<()>;
    pub async fn stop_server(&self, server_id: &str) -> Result<()>;

    // Background tasks
    async fn idle_timeout_checker(&self);
    async fn health_checker(&self);
}
```

States:
```
Stopped → Starting → Running → ShuttingDown → Stopped
                 ↓
            Unhealthy
```

### Runtime Layer

**File:** `gateway-core/src/runtime/`

The runtime abstraction:

```rust
#[async_trait]
pub trait Runtime: Send + Sync {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>>;
}

pub enum RuntimeConfig {
    LocalProcess { command, args, working_dir },
    RemoteSse { url, headers },
    Docker { image, volumes, ... },      // v0.2
    K8sJob { namespace, image, ... },    // v0.3
    K8sService { namespace, service },   // v0.3
}
```

Each runtime implements `connect()` to establish an `BackendConnection`.

### Server Registry

**File:** `gateway-core/src/registry.rs`

Immutable server catalog:

```rust
pub struct ServerRegistry {
    servers: HashMap<String, ServerDefinition>,
}

impl ServerRegistry {
    pub fn get(&self, id: &str) -> Option<&ServerDefinition>;
    pub fn all(&self) -> impl Iterator<Item = &ServerDefinition>;
    pub fn by_tag(&self, tag: &str) -> Vec<&ServerDefinition>;
}
```

Thread-safe via `Arc<ServerRegistry>`. Replaced atomically on reload.

### Catalog Watcher

**File:** `gateway-core/src/catalog_watcher.rs`

Hot reload implementation:

```rust
pub struct CatalogWatcher {
    catalog_path: PathBuf,
    registry: Arc<RwLock<Arc<ServerRegistry>>>,
    debounce_tx: mpsc::Sender<()>,
}

impl CatalogWatcher {
    pub async fn start(&self) -> Result<()> {
        let watcher = notify::recommended_watcher(|event| {
            // Trigger debounced reload
            self.debounce_tx.send(()).await;
        })?;

        watcher.watch(&self.catalog_path, RecursiveMode::NonRecursive)?;
    }

    async fn reload(&self) -> Result<()> {
        let new_registry = load_catalog(&self.catalog_path)?;
        let mut registry = self.registry.write().await;
        *registry = Arc::new(new_registry);
    }
}
```

## Data Flow

### MCP Request Flow

```
1. Client sends HTTP POST /mcp
   {"server_id": "postgres", "method": "tools/list", ...}

2. Auth middleware validates API key (if configured)

3. Route handler extracts server_id and message

4. ServerManager.get_connection("postgres")
   - If stopped: Start server via runtime
   - Get connection from pool

5. Connection.send(message)
   - LocalProcess: Write to stdin
   - RemoteSSE: HTTP POST

6. Connection.recv()
   - LocalProcess: Read from stdout
   - RemoteSSE: Read HTTP response

7. Return response to client
   {"result": {"tools": [...]}}

8. Update last_activity timestamp

9. (Background) Check idle timeout
   - If idle > timeout: Stop server
```

### Catalog Reload Flow

```
1. User edits catalog.yaml

2. File watcher detects change

3. Debounce timer starts (500ms)

4. If more changes: Reset timer

5. After debounce: Parse YAML

6. Validate all server definitions

7. If valid:
   - Create new ServerRegistry
   - Atomic swap: registry = new_registry
   - Log: "Loaded N servers"

8. If invalid:
   - Log error
   - Keep previous registry
```

## Thread Model

```
Main Thread
    │
    ├── HTTP Server (Tokio runtime)
    │   ├── Accept connections
    │   └── Handle requests (spawn per request)
    │
    ├── Catalog Watcher
    │   ├── File watch events
    │   └── Debounce timer
    │
    ├── Idle Timeout Checker
    │   └── Periodic scan of server activity
    │
    └── Health Checker
        └── Periodic health checks
```

All components use Tokio's async runtime for non-blocking I/O.

## Error Handling Strategy

```rust
// Gateway-level errors (gateway-core/src/error.rs)
#[derive(Error, Debug)]
pub enum GatewayError {
    #[error("Server not found: {0}")]
    ServerNotFound(String),

    #[error("Runtime error: {0}")]
    RuntimeError(#[from] RuntimeError),

    #[error("Configuration error: {0}")]
    ConfigError(String),
}

// Errors are converted to HTTP responses (gateway-http/src/routes.rs)
impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        match self {
            GatewayError::ServerNotFound(_) => StatusCode::NOT_FOUND,
            GatewayError::RuntimeError(_) => StatusCode::BAD_GATEWAY,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
```
