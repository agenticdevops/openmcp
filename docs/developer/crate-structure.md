---
id: crate-structure
title: Crate Structure
sidebar_position: 3
---

# Crate Structure

Open MCP Gateway is organized as a Rust workspace with three crates.

## Workspace Layout

```
mcp-gateway/
├── Cargo.toml          # Workspace manifest
├── gateway-core/       # Core library
├── gateway-http/       # HTTP server binary
└── gateway-stdio/      # Stdio wrapper binary
```

## Crate Dependency Graph

```
┌─────────────────┐     ┌─────────────────┐
│  gateway-http   │     │  gateway-stdio  │
│    (binary)     │     │    (binary)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
            ┌────────────────┐
            │  gateway-core  │
            │   (library)    │
            └────────────────┘
```

---

## gateway-core

The shared library containing all core abstractions.

### Cargo.toml

```toml
[package]
name = "gateway-core"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.40", features = ["full"] }
async-trait = "0.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
serde_yaml = "0.9"
thiserror = "1.0"
anyhow = "1.0"
tracing = "0.1"
reqwest = { version = "0.11", features = ["json", "stream"] }
notify = "6.1"
```

### Module Structure

```
gateway-core/src/
├── lib.rs              # Public API exports
├── config.rs           # Configuration types
├── error.rs            # Error definitions
├── registry.rs         # Server registry
├── manager.rs          # Lifecycle manager
├── catalog_watcher.rs  # Hot reload
└── runtime/
    ├── mod.rs          # Runtime trait
    ├── local_process.rs
    └── remote_sse.rs
```

### Public API

```rust
// lib.rs
pub mod config;
pub mod error;
pub mod registry;
pub mod manager;
pub mod catalog_watcher;
pub mod runtime;

// Re-exports for convenience
pub use config::{Config, Catalog, ServerDefinition, RuntimeConfig};
pub use error::GatewayError;
pub use registry::ServerRegistry;
pub use manager::ServerManager;
pub use catalog_watcher::CatalogWatcher;
pub use runtime::{Runtime, BackendConnection, McpMessage};
```

---

## gateway-http

The HTTP server binary using Axum.

### Cargo.toml

```toml
[package]
name = "gateway-http"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "gateway-http"
path = "src/main.rs"

[dependencies]
gateway-core = { path = "../gateway-core" }
tokio = { version = "1.40", features = ["full"] }
axum = "0.7"
hyper = { version = "1.4", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.5", features = ["trace", "cors"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
clap = { version = "4.5", features = ["derive"] }
```

### Module Structure

```
gateway-http/src/
├── main.rs     # Entry point, CLI, router setup
├── routes.rs   # HTTP handlers
└── state.rs    # Application state
```

### Entry Point

```rust
// main.rs (simplified)
#[tokio::main]
async fn main() -> Result<()> {
    // Parse CLI args
    let args = Args::parse();

    // Initialize logging
    tracing_subscriber::init();

    // Load configuration
    let config = Config::load(&args.config)?;
    let catalog = Catalog::load(&config.catalog_path)?;

    // Create app state
    let state = AppState::new(catalog);

    // Build router
    let app = Router::new()
        .route("/health", get(routes::health))
        .route("/servers", get(routes::list_servers))
        // ... more routes
        .with_state(state);

    // Start server
    axum::serve(listener, app).await?;
}
```

---

## gateway-stdio

The stdio wrapper for desktop clients.

### Cargo.toml

```toml
[package]
name = "gateway-stdio"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "gateway-stdio"
path = "src/main.rs"

[dependencies]
gateway-core = { path = "../gateway-core" }
tokio = { version = "1.40", features = ["full", "io-std"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
clap = { version = "4.5", features = ["derive"] }
```

### Module Structure

```
gateway-stdio/src/
└── main.rs     # Complete stdio proxy implementation
```

### Entry Point

```rust
// main.rs (simplified)
#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Load catalog
    let catalog = Catalog::load(&args.catalog)?;
    let registry = ServerRegistry::new(catalog);

    // Get server runtime
    let server = registry.get(&args.server)?;
    let runtime = server.create_runtime()?;

    // Connect to backend
    let mut connection = runtime.connect().await?;

    // Proxy stdin -> backend -> stdout
    let stdin = tokio::io::stdin();
    let stdout = tokio::io::stdout();

    loop {
        let line = read_line(&stdin).await?;
        let message: McpMessage = serde_json::from_str(&line)?;

        connection.send(&message).await?;

        if let Some(response) = connection.recv().await? {
            write_line(&stdout, &response).await?;
        }
    }
}
```

---

## Building Individual Crates

```bash
# Build just the core library
cargo build -p gateway-core

# Build just the HTTP server
cargo build -p gateway-http

# Build just the stdio wrapper
cargo build -p gateway-stdio

# Build all (from workspace root)
cargo build

# Build release versions
cargo build --release
```

## Testing

```bash
# Test all crates
cargo test

# Test specific crate
cargo test -p gateway-core

# Test with logging
RUST_LOG=debug cargo test
```

## Adding a New Crate

To add a new crate to the workspace:

1. Create directory and Cargo.toml:
   ```bash
   mkdir gateway-new
   cd gateway-new
   cargo init
   ```

2. Add to workspace Cargo.toml:
   ```toml
   [workspace]
   members = [
       "gateway-core",
       "gateway-http",
       "gateway-stdio",
       "gateway-new",  # Add here
   ]
   ```

3. Add gateway-core dependency if needed:
   ```toml
   [dependencies]
   gateway-core = { path = "../gateway-core" }
   ```
