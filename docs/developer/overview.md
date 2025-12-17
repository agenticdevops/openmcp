---
id: overview
title: Developer Overview
sidebar_position: 1
---

# Developer Overview

This section covers the internal architecture of Open MCP Gateway, how to extend it, and how to contribute.

## Project Structure

```
mcp-gateway/
├── Cargo.toml              # Workspace configuration
├── Cargo.lock              # Dependency lockfile
├── rust-toolchain.toml     # Rust version (1.75)
├── Dockerfile              # Production Docker build
├── LICENSE                 # Apache-2.0
├── README.md               # Project overview
│
├── gateway-core/           # Core library crate
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs          # Module exports
│       ├── config.rs       # Configuration types
│       ├── error.rs        # Error types
│       ├── registry.rs     # Server registry
│       ├── manager.rs      # Lifecycle manager
│       ├── catalog_watcher.rs  # Hot reload
│       └── runtime/
│           ├── mod.rs      # Runtime trait
│           ├── local_process.rs
│           └── remote_sse.rs
│
├── gateway-http/           # HTTP server binary
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs         # Entry point, router
│       ├── routes.rs       # HTTP handlers
│       └── state.rs        # Application state
│
├── gateway-stdio/          # Stdio wrapper binary
│   ├── Cargo.toml
│   └── src/
│       └── main.rs         # Stdio proxy
│
└── examples/               # Example configurations
    ├── config.yaml
    ├── catalog.yaml
    └── simple-catalog.yaml
```

## Crate Architecture

```
┌─────────────────────────────────────────┐
│           Applications                   │
├──────────────────┬──────────────────────┤
│   gateway-http   │   gateway-stdio      │
│   (HTTP server)  │   (Desktop wrapper)  │
├──────────────────┴──────────────────────┤
│              gateway-core                │
│  (Config, Registry, Manager, Runtimes)   │
└─────────────────────────────────────────┘
```

### gateway-core

The shared library containing:
- **Configuration**: YAML parsing, validation
- **Registry**: Server lookup and filtering
- **Manager**: Lifecycle, pooling, health checks
- **Runtimes**: Process spawning, HTTP connections

### gateway-http

The HTTP API server:
- Axum-based REST API
- JSON-RPC endpoint for MCP
- Admin endpoints
- Authentication middleware

### gateway-stdio

Desktop application wrapper:
- Reads JSON-RPC from stdin
- Forwards to MCP servers
- Returns responses to stdout
- Compatible with Claude Desktop, Cline

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Async Runtime | Tokio 1.40 | Process, network, timers |
| HTTP Server | Axum 0.7 | REST API |
| HTTP Client | Reqwest 0.11 | Remote SSE connections |
| Serialization | Serde + YAML/JSON | Configuration, messages |
| Logging | Tracing | Structured logging |
| Errors | Thiserror + Anyhow | Error handling |
| File Watch | Notify 6.1 | Hot reload |
| CLI | Clap 4.5 | Argument parsing |

## Key Abstractions

### Runtime Trait

```rust
#[async_trait]
pub trait Runtime: Send + Sync {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>>;
}

#[async_trait]
pub trait BackendConnection: Send + Sync {
    async fn send(&mut self, message: &McpMessage) -> Result<()>;
    async fn recv(&mut self) -> Result<Option<McpMessage>>;
    async fn close(&mut self) -> Result<()>;
}
```

### Server Manager

Handles:
- Auto-start on demand
- Connection pooling
- Idle timeout shutdown
- Health monitoring
- Status tracking

### Catalog Watcher

Features:
- File system monitoring
- Debounced reloads
- Atomic registry swaps
- Manual reload trigger

## Development Workflow

### Prerequisites

- Rust 1.75+
- Git

### Build

```bash
# Debug build
cargo build

# Release build
cargo build --release

# Run tests
cargo test

# Run with logging
RUST_LOG=debug cargo run --bin gateway-http -- --config examples/config.yaml
```

### Code Style

```bash
# Format code
cargo fmt

# Lint
cargo clippy

# Check before commit
cargo fmt && cargo clippy && cargo test
```

## Documentation Sections

| Section | Content |
|---------|---------|
| [Architecture](/docs/developer/architecture) | System design and data flow |
| [Crate Structure](/docs/developer/crate-structure) | Module organization |
| [Runtime Abstraction](/docs/developer/runtime-abstraction) | How runtimes work |
| [Lifecycle Management](/docs/developer/lifecycle-management) | Server lifecycle |
| [API Reference](/docs/developer/api-reference) | Complete API docs |
| [Custom Runtimes](/docs/developer/custom-runtimes) | Adding new runtimes |
| [Contributing](/docs/developer/contributing) | How to contribute |
