---
id: runtime-abstraction
title: Runtime Abstraction
sidebar_position: 4
---

# Runtime Abstraction

The runtime layer provides a unified interface for connecting to MCP servers regardless of how they're deployed.

## Core Traits

### Runtime Trait

```rust
// gateway-core/src/runtime/mod.rs

#[async_trait]
pub trait Runtime: Send + Sync {
    /// Connect to the MCP server and return a connection handle
    async fn connect(&self) -> Result<Box<dyn BackendConnection>, GatewayError>;
}
```

The `Runtime` trait is implemented by each runtime type (local process, remote SSE, Docker, etc.).

### BackendConnection Trait

```rust
#[async_trait]
pub trait BackendConnection: Send + Sync {
    /// Send a message to the MCP server
    async fn send(&mut self, message: &McpMessage) -> Result<(), GatewayError>;

    /// Receive the next message from the MCP server
    async fn recv(&mut self) -> Result<Option<McpMessage>, GatewayError>;

    /// Close the connection gracefully
    async fn close(&mut self) -> Result<(), GatewayError>;
}
```

### McpMessage

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub error: Option<serde_json::Value>,
}

impl McpMessage {
    pub fn is_request(&self) -> bool {
        self.method.is_some() && self.id.is_some()
    }

    pub fn is_response(&self) -> bool {
        self.result.is_some() || self.error.is_some()
    }

    pub fn is_notification(&self) -> bool {
        self.method.is_some() && self.id.is_none()
    }
}
```

---

## Local Process Runtime

Spawns MCP servers as child processes with stdio communication.

### Implementation

```rust
// gateway-core/src/runtime/local_process.rs

pub struct LocalProcessRuntime {
    command: String,
    args: Vec<String>,
    working_dir: Option<PathBuf>,
    env: HashMap<String, String>,
}

#[async_trait]
impl Runtime for LocalProcessRuntime {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>, GatewayError> {
        let mut cmd = Command::new(&self.command);
        cmd.args(&self.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit());

        if let Some(dir) = &self.working_dir {
            cmd.current_dir(dir);
        }

        for (key, value) in &self.env {
            cmd.env(key, value);
        }

        let child = cmd.spawn()?;

        Ok(Box::new(LocalProcessConnection::new(child)))
    }
}
```

### Connection Implementation

```rust
pub struct LocalProcessConnection {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

#[async_trait]
impl BackendConnection for LocalProcessConnection {
    async fn send(&mut self, message: &McpMessage) -> Result<(), GatewayError> {
        let json = serde_json::to_string(message)?;
        self.stdin.write_all(json.as_bytes()).await?;
        self.stdin.write_all(b"\n").await?;
        self.stdin.flush().await?;
        Ok(())
    }

    async fn recv(&mut self) -> Result<Option<McpMessage>, GatewayError> {
        let mut line = String::new();
        let bytes = self.stdout.read_line(&mut line).await?;
        if bytes == 0 {
            return Ok(None);
        }
        let message = serde_json::from_str(&line)?;
        Ok(Some(message))
    }

    async fn close(&mut self) -> Result<(), GatewayError> {
        self.child.kill().await?;
        Ok(())
    }
}
```

---

## Remote SSE Runtime

Connects to HTTP-based MCP servers.

### Implementation

```rust
// gateway-core/src/runtime/remote_sse.rs

pub struct RemoteSseRuntime {
    url: String,
    headers: HashMap<String, String>,
    client: reqwest::Client,
}

#[async_trait]
impl Runtime for RemoteSseRuntime {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>, GatewayError> {
        // Verify server is reachable
        let mut request = self.client.get(&self.url);
        for (key, value) in &self.headers {
            request = request.header(key, value);
        }
        request.send().await?.error_for_status()?;

        Ok(Box::new(RemoteSseConnection::new(
            self.url.clone(),
            self.headers.clone(),
            self.client.clone(),
        )))
    }
}
```

### Connection Implementation

```rust
pub struct RemoteSseConnection {
    url: String,
    headers: HashMap<String, String>,
    client: reqwest::Client,
}

#[async_trait]
impl BackendConnection for RemoteSseConnection {
    async fn send(&mut self, message: &McpMessage) -> Result<(), GatewayError> {
        let mut request = self.client.post(&self.url);
        for (key, value) in &self.headers {
            request = request.header(key, value);
        }
        request
            .json(message)
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }

    async fn recv(&mut self) -> Result<Option<McpMessage>, GatewayError> {
        // For SSE, messages come via the same connection
        // Implementation depends on the specific SSE protocol
        todo!("SSE message receiving")
    }

    async fn close(&mut self) -> Result<(), GatewayError> {
        // HTTP connections are stateless
        Ok(())
    }
}
```

---

## Creating a Runtime from Config

```rust
// gateway-core/src/runtime/mod.rs

impl RuntimeConfig {
    pub fn create_runtime(&self) -> Result<Box<dyn Runtime>, GatewayError> {
        match self {
            RuntimeConfig::LocalProcess { command, args, working_dir } => {
                Ok(Box::new(LocalProcessRuntime::new(
                    command.clone(),
                    args.clone(),
                    working_dir.clone(),
                )))
            }
            RuntimeConfig::RemoteSse { url, headers } => {
                Ok(Box::new(RemoteSseRuntime::new(
                    url.clone(),
                    headers.clone(),
                )))
            }
            RuntimeConfig::Docker { .. } => {
                Err(GatewayError::UnsupportedRuntime("docker".to_string()))
            }
            // ... other runtime types
        }
    }
}
```

---

## Adding a New Runtime

To add a new runtime type:

### 1. Define Configuration

```rust
// In config.rs
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum RuntimeConfig {
    LocalProcess { ... },
    RemoteSse { ... },
    // Add your new runtime
    MyRuntime {
        #[serde(default)]
        option1: String,
        option2: Option<i32>,
    },
}
```

### 2. Implement Runtime Trait

```rust
// Create gateway-core/src/runtime/my_runtime.rs

pub struct MyRuntime {
    option1: String,
    option2: Option<i32>,
}

impl MyRuntime {
    pub fn new(option1: String, option2: Option<i32>) -> Self {
        Self { option1, option2 }
    }
}

#[async_trait]
impl Runtime for MyRuntime {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>, GatewayError> {
        // Your implementation
        Ok(Box::new(MyConnection::new()))
    }
}
```

### 3. Implement BackendConnection

```rust
pub struct MyConnection {
    // Connection state
}

#[async_trait]
impl BackendConnection for MyConnection {
    async fn send(&mut self, message: &McpMessage) -> Result<(), GatewayError> {
        // Send implementation
    }

    async fn recv(&mut self) -> Result<Option<McpMessage>, GatewayError> {
        // Receive implementation
    }

    async fn close(&mut self) -> Result<(), GatewayError> {
        // Cleanup implementation
    }
}
```

### 4. Update Module Exports

```rust
// In runtime/mod.rs
mod my_runtime;
pub use my_runtime::MyRuntime;

impl RuntimeConfig {
    pub fn create_runtime(&self) -> Result<Box<dyn Runtime>, GatewayError> {
        match self {
            // ... existing cases
            RuntimeConfig::MyRuntime { option1, option2 } => {
                Ok(Box::new(MyRuntime::new(option1.clone(), *option2)))
            }
        }
    }
}
```

### 5. Add Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_my_runtime_connect() {
        let runtime = MyRuntime::new("test".to_string(), Some(42));
        let connection = runtime.connect().await;
        assert!(connection.is_ok());
    }
}
```

---

## Runtime Selection Guidelines

| Use Case | Recommended Runtime |
|----------|---------------------|
| Local development | `local-process` |
| Testing | `local-process` |
| Cloud-hosted MCP service | `remote-sse` |
| Self-hosted remote server | `remote-sse` |
| Isolated execution | `docker` (v0.2) |
| Kubernetes deployment | `k8s-*` (v0.3) |
