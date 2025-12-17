---
id: api-endpoints
title: API Endpoints Implementation
sidebar_position: 6
---

# API Endpoints Implementation

This document describes the implementation details of the HTTP API endpoints.

## Router Setup

```rust
// gateway-http/src/main.rs

pub fn create_router(state: AppState) -> Router {
    let api_routes = Router::new()
        // Health & Status
        .route("/health", get(routes::health))
        .route("/stats", get(routes::stats))

        // Server Management
        .route("/servers", get(routes::list_servers))
        .route("/servers/:id", get(routes::get_server))
        .route("/servers/:id/start", post(routes::start_server))
        .route("/servers/:id/stop", post(routes::stop_server))

        // MCP Communication
        .route("/mcp", post(routes::mcp_request))
        .route("/rpc", post(routes::rpc_request))

        // Admin
        .route("/admin/reload", post(routes::reload_catalog));

    // Apply middleware
    Router::new()
        .merge(api_routes)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .layer(auth_layer(state.config.api_key.clone()))
        .with_state(state)
}
```

---

## Application State

```rust
// gateway-http/src/state.rs

#[derive(Clone)]
pub struct AppState {
    pub manager: Arc<ServerManager>,
    pub watcher: Arc<CatalogWatcher>,
    pub config: Arc<Config>,
    pub start_time: Instant,
}

impl AppState {
    pub fn new(config: Config, catalog: Catalog) -> Self {
        let registry = Arc::new(ServerRegistry::new(catalog.servers));
        let manager = Arc::new(ServerManager::new(
            registry.clone(),
            ManagerConfig::from(&config),
        ));
        let watcher = Arc::new(CatalogWatcher::new(
            config.catalog_path.clone(),
            manager.clone(),
        ));

        Self {
            manager,
            watcher,
            config: Arc::new(config),
            start_time: Instant::now(),
        }
    }
}
```

---

## Handler Implementations

### Health Check

```rust
// gateway-http/src/routes.rs

pub async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "ok"
    }))
}
```

### List Servers

```rust
pub async fn list_servers(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<impl IntoResponse, AppError> {
    let registry = state.manager.registry().await;
    let stats = state.manager.get_stats().await;

    let servers: Vec<ServerInfo> = registry
        .all()
        .filter(|s| {
            // Filter by tag if specified
            params.tag.as_ref().map_or(true, |tag| s.tags.contains(tag))
        })
        .map(|server| {
            let server_stats = stats.servers.get(&server.id);
            ServerInfo {
                id: server.id.clone(),
                display_name: server.display_name.clone(),
                description: server.description.clone(),
                status: server_stats
                    .map(|s| s.status.clone())
                    .unwrap_or(ServerStatus::Stopped),
                tags: server.tags.clone(),
                runtime_type: server.runtime.type_name(),
                started_at: server_stats.and_then(|s| s.started_at),
                last_activity: server_stats.map(|s| s.last_activity),
                request_count: server_stats.map(|s| s.request_count).unwrap_or(0),
            }
        })
        .collect();

    Ok(Json(servers))
}

#[derive(Deserialize)]
pub struct ListParams {
    tag: Option<String>,
}

#[derive(Serialize)]
pub struct ServerInfo {
    id: String,
    display_name: String,
    description: Option<String>,
    status: ServerStatus,
    tags: Vec<String>,
    runtime_type: String,
    started_at: Option<DateTime<Utc>>,
    last_activity: Option<DateTime<Utc>>,
    request_count: u64,
}
```

### Get Server

```rust
pub async fn get_server(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let registry = state.manager.registry().await;

    let server = registry
        .get(&id)
        .ok_or(AppError::NotFound(format!("Server '{}' not found", id)))?;

    let stats = state.manager.get_stats().await;
    let server_stats = stats.servers.get(&id);

    Ok(Json(ServerDetail {
        id: server.id.clone(),
        display_name: server.display_name.clone(),
        description: server.description.clone(),
        status: server_stats
            .map(|s| s.status.clone())
            .unwrap_or(ServerStatus::Stopped),
        runtime: RuntimeInfo::from(&server.runtime),
        env: server.env.clone(),
        tags: server.tags.clone(),
        started_at: server_stats.and_then(|s| s.started_at),
        last_activity: server_stats.map(|s| s.last_activity),
        request_count: server_stats.map(|s| s.request_count).unwrap_or(0),
        uptime_seconds: server_stats
            .and_then(|s| s.uptime)
            .map(|d| d.as_secs()),
    }))
}
```

### Start Server

```rust
pub async fn start_server(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    // Check if server exists
    let registry = state.manager.registry().await;
    if !registry.contains(&id) {
        return Err(AppError::NotFound(format!("Server '{}' not found", id)));
    }

    // Check current status
    let status = state.manager.get_status(&id).await?;
    if status == ServerStatus::Running {
        return Ok(Json(json!({
            "id": id,
            "status": "running",
            "message": "Server already running"
        })));
    }

    // Start the server
    state.manager.start_server(&id).await?;

    Ok(Json(json!({
        "id": id,
        "status": "running",
        "message": "Server started successfully"
    })))
}
```

### Stop Server

```rust
pub async fn stop_server(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let status = state.manager.get_status(&id).await?;

    if status == ServerStatus::Stopped {
        return Ok(Json(json!({
            "id": id,
            "status": "stopped",
            "message": "Server already stopped"
        })));
    }

    state.manager.stop_server(&id).await?;

    Ok(Json(json!({
        "id": id,
        "status": "stopped",
        "message": "Server stopped successfully"
    })))
}
```

### MCP Request

```rust
pub async fn mcp_request(
    State(state): State<AppState>,
    Json(request): Json<McpRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Extract server ID and message
    let server_id = request.server_id.clone();
    let message = McpMessage {
        jsonrpc: request.jsonrpc,
        id: request.id,
        method: request.method,
        params: request.params,
        result: None,
        error: None,
    };

    // Get connection (auto-starts if needed)
    let mut connection = state.manager.get_connection(&server_id).await?;

    // Send request
    connection.send(&message).await?;

    // Receive response
    let response = connection.recv().await?
        .ok_or(AppError::Internal("No response from server".to_string()))?;

    Ok(Json(response))
}

#[derive(Deserialize)]
pub struct McpRequest {
    server_id: String,
    jsonrpc: String,
    id: Option<serde_json::Value>,
    method: Option<String>,
    params: Option<serde_json::Value>,
}
```

### Raw RPC Request

```rust
pub async fn rpc_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(message): Json<McpMessage>,
) -> Result<impl IntoResponse, AppError> {
    // Get server ID from header
    let server_id = headers
        .get("X-Server-ID")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::BadRequest("X-Server-ID header required".to_string()))?
        .to_string();

    // Get connection
    let mut connection = state.manager.get_connection(&server_id).await?;

    // Send and receive
    connection.send(&message).await?;
    let response = connection.recv().await?
        .ok_or(AppError::Internal("No response from server".to_string()))?;

    Ok(Json(response))
}
```

### Statistics

```rust
pub async fn stats(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let manager_stats = state.manager.get_stats().await;

    Ok(Json(json!({
        "uptime_seconds": state.start_time.elapsed().as_secs(),
        "total_servers": manager_stats.total_servers,
        "active_servers": manager_stats.active_servers,
        "last_reload": state.watcher.last_reload().await,
        "servers": manager_stats.servers.iter().map(|(id, s)| {
            (id.clone(), json!({
                "status": s.status,
                "request_count": s.request_count,
                "error_count": s.error_count,
                "uptime_seconds": s.uptime.map(|d| d.as_secs()),
            }))
        }).collect::<HashMap<_, _>>()
    })))
}
```

### Reload Catalog

```rust
pub async fn reload_catalog(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let result = state.watcher.reload().await?;

    Ok(Json(json!({
        "status": "ok",
        "message": "Catalog reloaded",
        "servers_loaded": result.total,
        "servers_added": result.added,
        "servers_removed": result.removed
    })))
}
```

---

## Error Handling

```rust
// gateway-http/src/routes.rs

pub enum AppError {
    NotFound(String),
    BadRequest(String),
    Unauthorized(String),
    Internal(String),
    BadGateway(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::BadGateway(msg) => (StatusCode::BAD_GATEWAY, msg),
        };

        let body = Json(json!({
            "error": status.canonical_reason().unwrap_or("Error"),
            "message": message
        }));

        (status, body).into_response()
    }
}

impl From<GatewayError> for AppError {
    fn from(e: GatewayError) -> Self {
        match e {
            GatewayError::ServerNotFound(id) => {
                AppError::NotFound(format!("Server '{}' not found", id))
            }
            GatewayError::RuntimeError(e) => {
                AppError::BadGateway(e.to_string())
            }
            GatewayError::ConfigError(e) => {
                AppError::Internal(e)
            }
            _ => AppError::Internal(e.to_string()),
        }
    }
}
```

---

## Authentication Middleware

```rust
// gateway-http/src/auth.rs

pub fn auth_layer(api_key: Option<String>) -> Option<AuthLayer> {
    api_key.map(|key| AuthLayer::new(key))
}

pub struct AuthLayer {
    api_key: String,
}

impl AuthLayer {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

impl<S> Layer<S> for AuthLayer {
    type Service = AuthMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        AuthMiddleware {
            inner,
            api_key: self.api_key.clone(),
        }
    }
}

impl<S, B> Service<Request<B>> for AuthMiddleware<S> {
    // ... implementation that checks Authorization or X-API-Key headers
    // Skips auth for /health endpoint
}
```
