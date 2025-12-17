---
id: contributing
title: Contributing
sidebar_position: 10
---

# Contributing

Thank you for your interest in contributing to Open MCP Gateway! This guide will help you get started.

## Getting Started

### Prerequisites

- Rust 1.75+ (install via [rustup](https://rustup.rs/))
- Git
- A GitHub account

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/mcp-gateway.git
cd mcp-gateway

# Add upstream remote
git remote add upstream https://github.com/agentic/mcp-gateway.git
```

### Build and Test

```bash
# Build all crates
cargo build

# Run tests
cargo test

# Run with example config
cargo run --bin gateway-http -- --config examples/config.yaml
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make Changes

Follow the code style guidelines below.

### 3. Test Your Changes

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with logging
RUST_LOG=debug cargo test
```

### 4. Format and Lint

```bash
# Format code
cargo fmt

# Run clippy
cargo clippy -- -D warnings

# Both (recommended before commit)
cargo fmt && cargo clippy -- -D warnings
```

### 5. Commit

Use conventional commit messages:

```bash
git commit -m "feat: add Docker runtime support"
git commit -m "fix: handle connection timeout properly"
git commit -m "docs: update configuration guide"
git commit -m "refactor: simplify server manager logic"
git commit -m "test: add registry filtering tests"
```

Prefixes:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Build, CI, dependencies

### 6. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a Pull Request on GitHub.

## Code Style

### Rust Guidelines

```rust
// Use descriptive names
fn start_server(server_id: &str) -> Result<()>;  // Good
fn start(id: &str) -> Result<()>;                 // Less clear

// Document public APIs
/// Starts the specified server.
///
/// # Arguments
/// * `server_id` - The unique identifier of the server
///
/// # Errors
/// Returns an error if the server is not found or fails to start.
pub async fn start_server(&self, server_id: &str) -> Result<()>;

// Handle errors explicitly
let server = self.registry
    .get(server_id)
    .ok_or_else(|| GatewayError::ServerNotFound(server_id.to_string()))?;

// Use structured logging
tracing::info!(server_id = %server_id, "Starting server");
tracing::error!(error = ?e, "Failed to start server");
```

### File Organization

```rust
// Imports grouped and sorted
use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use tokio::sync::RwLock;

use crate::config::ServerDefinition;
use crate::error::GatewayError;

// Public items first, then private
pub struct ServerManager { ... }

impl ServerManager {
    pub fn new() -> Self { ... }
    pub async fn start(&self) -> Result<()> { ... }

    async fn internal_method(&self) { ... }
}
```

### Error Handling

```rust
// Define specific error types
#[derive(Error, Debug)]
pub enum GatewayError {
    #[error("Server not found: {0}")]
    ServerNotFound(String),

    #[error("Runtime error: {0}")]
    RuntimeError(#[source] anyhow::Error),
}

// Use ? for propagation
async fn example() -> Result<(), GatewayError> {
    let config = load_config().map_err(GatewayError::ConfigError)?;
    Ok(())
}
```

## Project Structure

When adding new features, follow this structure:

```
gateway-core/src/
├── lib.rs              # Add new module exports
├── new_module.rs       # New module file
└── new_module/         # Or directory for complex modules
    ├── mod.rs
    └── submodule.rs
```

## Adding a New Runtime

1. Create runtime file in `gateway-core/src/runtime/`:

```rust
// gateway-core/src/runtime/my_runtime.rs
use super::{BackendConnection, Runtime};

pub struct MyRuntime {
    // ...
}

#[async_trait]
impl Runtime for MyRuntime {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>> {
        // Implementation
    }
}
```

2. Add to `RuntimeConfig` enum in `config.rs`
3. Update `mod.rs` to export
4. Add tests
5. Update documentation

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_lookup() {
        let registry = ServerRegistry::new(servers);
        assert!(registry.get("postgres").is_some());
    }

    #[tokio::test]
    async fn test_async_function() {
        let result = async_function().await;
        assert!(result.is_ok());
    }
}
```

### Integration Tests

Create in `tests/` directory:

```rust
// tests/integration_test.rs
#[tokio::test]
async fn test_full_workflow() {
    // Setup
    // Execute
    // Assert
}
```

## Documentation

- Update relevant docs when changing behavior
- Add doc comments to public APIs
- Include examples in documentation

```rust
/// Creates a new server manager.
///
/// # Examples
///
/// ```
/// let manager = ServerManager::new(registry);
/// manager.start_server("postgres").await?;
/// ```
pub fn new(registry: Arc<ServerRegistry>) -> Self {
    // ...
}
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] Code is formatted (`cargo fmt`)
- [ ] Clippy passes (`cargo clippy`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention

### PR Description

Include:
- What the change does
- Why it's needed
- How to test it
- Any breaking changes

### Review Process

1. CI runs automatically
2. Maintainer reviews code
3. Address feedback
4. Squash and merge

## Getting Help

- [GitHub Issues](https://github.com/agentic/mcp-gateway/issues) - Bug reports, feature requests
- [GitHub Discussions](https://github.com/agentic/mcp-gateway/discussions) - Questions, ideas
- [Discord](https://discord.gg/mcp-gateway) - Real-time chat

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
