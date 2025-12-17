---
id: lifecycle-management
title: Lifecycle Management
sidebar_position: 5
---

# Lifecycle Management

The Server Manager handles the complete lifecycle of MCP servers including auto-start, connection pooling, health monitoring, and idle shutdown.

## Server States

```
         ┌──────────┐
         │ Stopped  │◄────────────────────┐
         └────┬─────┘                     │
              │ start request             │ idle timeout
              ▼                           │ or stop request
         ┌──────────┐                     │
         │ Starting │                     │
         └────┬─────┘                     │
              │ connected                 │
              ▼                           │
         ┌──────────┐      health fail    │
         │ Running  │─────────────────►───┤
         └────┬─────┘                     │
              │                           │
              │ stop request              │
              ▼                           │
         ┌────────────┐                   │
         │ShuttingDown├───────────────────┘
         └────────────┘
```

### State Definitions

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum ServerStatus {
    /// Server is not running
    Stopped,
    /// Server is starting up
    Starting,
    /// Server is running and healthy
    Running,
    /// Server failed health check
    Unhealthy,
    /// Server is shutting down
    ShuttingDown,
}
```

---

## Server Manager

The `ServerManager` is the core component managing all server lifecycles.

### Structure

```rust
pub struct ServerManager {
    /// Server definitions from catalog
    registry: Arc<RwLock<Arc<ServerRegistry>>>,

    /// Active connections per server
    connections: RwLock<HashMap<String, ConnectionPool>>,

    /// Current status of each server
    status: RwLock<HashMap<String, ServerState>>,

    /// Configuration
    config: ManagerConfig,
}

#[derive(Debug)]
struct ServerState {
    status: ServerStatus,
    started_at: Option<Instant>,
    last_activity: Instant,
    request_count: u64,
    error_count: u64,
}

#[derive(Debug)]
pub struct ManagerConfig {
    pub idle_timeout: Duration,
    pub health_check_interval: Duration,
    pub max_connections_per_server: usize,
    pub request_timeout: Duration,
}
```

---

## Auto-Start on Demand

When a request arrives for a stopped server, it's automatically started.

```rust
impl ServerManager {
    pub async fn get_connection(
        &self,
        server_id: &str,
    ) -> Result<PooledConnection, GatewayError> {
        // Get current status
        let status = self.get_status(server_id).await?;

        // Auto-start if needed
        if status == ServerStatus::Stopped {
            self.start_server(server_id).await?;
        }

        // Wait for server to be ready
        self.wait_for_ready(server_id).await?;

        // Get connection from pool
        let connection = self.connections
            .read().await
            .get(server_id)
            .ok_or(GatewayError::ServerNotFound(server_id.to_string()))?
            .get().await?;

        // Update activity timestamp
        self.touch(server_id).await;

        Ok(connection)
    }
}
```

---

## Connection Pooling

Connections are pooled per server to reduce connection overhead.

```rust
pub struct ConnectionPool {
    connections: Vec<Box<dyn BackendConnection>>,
    available: VecDeque<usize>,
    max_size: usize,
    runtime: Arc<dyn Runtime>,
}

impl ConnectionPool {
    pub async fn get(&mut self) -> Result<PooledConnection, GatewayError> {
        // Try to get an existing connection
        if let Some(idx) = self.available.pop_front() {
            return Ok(PooledConnection::new(idx, &mut self.connections[idx]));
        }

        // Create new connection if under limit
        if self.connections.len() < self.max_size {
            let conn = self.runtime.connect().await?;
            let idx = self.connections.len();
            self.connections.push(conn);
            return Ok(PooledConnection::new(idx, &mut self.connections[idx]));
        }

        // Wait for a connection to become available
        // (implementation uses tokio::sync::Semaphore)
        todo!("Wait for available connection")
    }

    pub fn release(&mut self, idx: usize) {
        self.available.push_back(idx);
    }
}
```

---

## Idle Timeout

A background task monitors server activity and shuts down idle servers.

```rust
impl ServerManager {
    pub async fn start_idle_checker(&self) {
        let manager = self.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));

            loop {
                interval.tick().await;
                manager.check_idle_servers().await;
            }
        });
    }

    async fn check_idle_servers(&self) {
        let now = Instant::now();
        let status = self.status.read().await;

        for (server_id, state) in status.iter() {
            if state.status == ServerStatus::Running {
                let idle_duration = now - state.last_activity;

                if idle_duration > self.config.idle_timeout {
                    tracing::info!(
                        server_id = %server_id,
                        idle_seconds = idle_duration.as_secs(),
                        "Stopping idle server"
                    );

                    // Schedule stop (don't block the checker)
                    let manager = self.clone();
                    let id = server_id.clone();
                    tokio::spawn(async move {
                        if let Err(e) = manager.stop_server(&id).await {
                            tracing::error!(error = ?e, "Failed to stop idle server");
                        }
                    });
                }
            }
        }
    }

    async fn touch(&self, server_id: &str) {
        let mut status = self.status.write().await;
        if let Some(state) = status.get_mut(server_id) {
            state.last_activity = Instant::now();
            state.request_count += 1;
        }
    }
}
```

---

## Health Monitoring

Periodic health checks detect unhealthy servers.

```rust
impl ServerManager {
    pub async fn start_health_checker(&self) {
        let manager = self.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(
                manager.config.health_check_interval
            );

            loop {
                interval.tick().await;
                manager.check_server_health().await;
            }
        });
    }

    async fn check_server_health(&self) {
        let status = self.status.read().await;

        for (server_id, state) in status.iter() {
            if state.status == ServerStatus::Running {
                let healthy = self.ping_server(server_id).await;

                if !healthy {
                    tracing::warn!(
                        server_id = %server_id,
                        "Server health check failed"
                    );

                    // Mark as unhealthy
                    drop(status);
                    let mut status = self.status.write().await;
                    if let Some(state) = status.get_mut(server_id) {
                        state.status = ServerStatus::Unhealthy;
                    }
                }
            }
        }
    }

    async fn ping_server(&self, server_id: &str) -> bool {
        // For local process: check if process is still running
        // For remote: send health check request
        match self.connections.read().await.get(server_id) {
            Some(pool) => pool.is_healthy().await,
            None => false,
        }
    }
}
```

---

## Graceful Shutdown

Servers are shut down gracefully to complete in-flight requests.

```rust
impl ServerManager {
    pub async fn stop_server(&self, server_id: &str) -> Result<(), GatewayError> {
        // Update status
        {
            let mut status = self.status.write().await;
            if let Some(state) = status.get_mut(server_id) {
                state.status = ServerStatus::ShuttingDown;
            }
        }

        // Close all connections
        {
            let mut connections = self.connections.write().await;
            if let Some(pool) = connections.remove(server_id) {
                pool.close_all().await?;
            }
        }

        // Update final status
        {
            let mut status = self.status.write().await;
            if let Some(state) = status.get_mut(server_id) {
                state.status = ServerStatus::Stopped;
                state.started_at = None;
            }
        }

        tracing::info!(server_id = %server_id, "Server stopped");
        Ok(())
    }

    pub async fn shutdown_all(&self) -> Result<(), GatewayError> {
        let server_ids: Vec<String> = {
            self.status.read().await.keys().cloned().collect()
        };

        for server_id in server_ids {
            self.stop_server(&server_id).await?;
        }

        Ok(())
    }
}
```

---

## Registry Updates (Hot Reload)

When the catalog is reloaded, the manager handles registry swaps.

```rust
impl ServerManager {
    pub async fn update_registry(&self, new_registry: Arc<ServerRegistry>) {
        let old_registry = {
            let mut registry = self.registry.write().await;
            std::mem::replace(&mut *registry, new_registry.clone())
        };

        // Find removed servers
        let old_ids: HashSet<_> = old_registry.ids().collect();
        let new_ids: HashSet<_> = new_registry.ids().collect();
        let removed: Vec<_> = old_ids.difference(&new_ids).collect();

        // Stop removed servers
        for server_id in removed {
            if let Err(e) = self.stop_server(server_id).await {
                tracing::error!(
                    server_id = %server_id,
                    error = ?e,
                    "Failed to stop removed server"
                );
            }
        }

        let added = new_ids.difference(&old_ids).count();
        tracing::info!(
            added = added,
            removed = removed.len(),
            total = new_ids.len(),
            "Registry updated"
        );
    }
}
```

---

## Metrics

The manager exposes metrics for monitoring.

```rust
impl ServerManager {
    pub async fn get_stats(&self) -> ManagerStats {
        let status = self.status.read().await;

        let mut stats = ManagerStats::default();

        for (server_id, state) in status.iter() {
            stats.servers.insert(server_id.clone(), ServerStats {
                status: state.status.clone(),
                started_at: state.started_at,
                request_count: state.request_count,
                error_count: state.error_count,
                uptime: state.started_at.map(|t| t.elapsed()),
            });

            if state.status == ServerStatus::Running {
                stats.active_servers += 1;
            }
        }

        stats.total_servers = status.len();
        stats
    }
}

#[derive(Debug, Serialize)]
pub struct ManagerStats {
    pub total_servers: usize,
    pub active_servers: usize,
    pub servers: HashMap<String, ServerStats>,
}

#[derive(Debug, Serialize)]
pub struct ServerStats {
    pub status: ServerStatus,
    pub started_at: Option<Instant>,
    pub request_count: u64,
    pub error_count: u64,
    pub uptime: Option<Duration>,
}
```
