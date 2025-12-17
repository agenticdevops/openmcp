---
id: custom-runtimes
title: Custom Runtimes
sidebar_position: 8
---

# Custom Runtimes

This guide shows how to implement a custom runtime for Open MCP Gateway.

## When to Create a Custom Runtime

Create a custom runtime when you need to:
- Connect to MCP servers using a proprietary protocol
- Integrate with specific infrastructure (cloud providers, orchestrators)
- Add custom connection handling or authentication
- Implement specialized lifecycle management

## Implementation Steps

### Step 1: Define Configuration

Add your runtime type to the `RuntimeConfig` enum:

```rust
// gateway-core/src/config.rs

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum RuntimeConfig {
    LocalProcess {
        command: String,
        #[serde(default)]
        args: Vec<String>,
        working_dir: Option<PathBuf>,
    },
    RemoteSse {
        url: String,
        #[serde(default)]
        headers: HashMap<String, String>,
    },

    // Add your new runtime
    MyCustomRuntime {
        /// Connection endpoint
        endpoint: String,

        /// Authentication token
        #[serde(default)]
        auth_token: Option<String>,

        /// Connection timeout in seconds
        #[serde(default = "default_timeout")]
        timeout_seconds: u64,

        /// Custom options
        #[serde(default)]
        options: HashMap<String, String>,
    },
}

fn default_timeout() -> u64 {
    30
}
```

### Step 2: Create Runtime Module

Create a new file for your runtime:

```rust
// gateway-core/src/runtime/my_custom.rs

use async_trait::async_trait;
use std::collections::HashMap;
use std::time::Duration;

use crate::error::GatewayError;
use super::{Runtime, BackendConnection, McpMessage};

/// Custom runtime implementation
pub struct MyCustomRuntime {
    endpoint: String,
    auth_token: Option<String>,
    timeout: Duration,
    options: HashMap<String, String>,
}

impl MyCustomRuntime {
    pub fn new(
        endpoint: String,
        auth_token: Option<String>,
        timeout_seconds: u64,
        options: HashMap<String, String>,
    ) -> Self {
        Self {
            endpoint,
            auth_token,
            timeout: Duration::from_secs(timeout_seconds),
            options,
        }
    }
}

#[async_trait]
impl Runtime for MyCustomRuntime {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>, GatewayError> {
        tracing::debug!(
            endpoint = %self.endpoint,
            "Connecting to custom runtime"
        );

        // Implement your connection logic here
        // This example shows a simple TCP connection

        let stream = tokio::time::timeout(
            self.timeout,
            tokio::net::TcpStream::connect(&self.endpoint),
        )
        .await
        .map_err(|_| GatewayError::RuntimeError(
            anyhow::anyhow!("Connection timeout")
        ))?
        .map_err(|e| GatewayError::RuntimeError(e.into()))?;

        // Perform authentication if configured
        if let Some(token) = &self.auth_token {
            // Send auth handshake
            // ...
        }

        Ok(Box::new(MyCustomConnection::new(stream, self.timeout)))
    }
}
```

### Step 3: Implement BackendConnection

```rust
// gateway-core/src/runtime/my_custom.rs (continued)

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader, BufWriter};
use tokio::net::TcpStream;

pub struct MyCustomConnection {
    reader: BufReader<tokio::net::tcp::OwnedReadHalf>,
    writer: BufWriter<tokio::net::tcp::OwnedWriteHalf>,
    timeout: Duration,
}

impl MyCustomConnection {
    pub fn new(stream: TcpStream, timeout: Duration) -> Self {
        let (read, write) = stream.into_split();
        Self {
            reader: BufReader::new(read),
            writer: BufWriter::new(write),
            timeout,
        }
    }
}

#[async_trait]
impl BackendConnection for MyCustomConnection {
    async fn send(&mut self, message: &McpMessage) -> Result<(), GatewayError> {
        let json = serde_json::to_string(message)
            .map_err(|e| GatewayError::RuntimeError(e.into()))?;

        tokio::time::timeout(self.timeout, async {
            self.writer.write_all(json.as_bytes()).await?;
            self.writer.write_all(b"\n").await?;
            self.writer.flush().await?;
            Ok::<_, std::io::Error>(())
        })
        .await
        .map_err(|_| GatewayError::RuntimeError(anyhow::anyhow!("Send timeout")))?
        .map_err(|e| GatewayError::RuntimeError(e.into()))?;

        tracing::trace!(method = ?message.method, "Sent message");
        Ok(())
    }

    async fn recv(&mut self) -> Result<Option<McpMessage>, GatewayError> {
        let mut line = String::new();

        let result = tokio::time::timeout(
            self.timeout,
            self.reader.read_line(&mut line),
        )
        .await
        .map_err(|_| GatewayError::RuntimeError(anyhow::anyhow!("Receive timeout")))?
        .map_err(|e| GatewayError::RuntimeError(e.into()))?;

        if result == 0 {
            return Ok(None);
        }

        let message: McpMessage = serde_json::from_str(&line)
            .map_err(|e| GatewayError::RuntimeError(e.into()))?;

        tracing::trace!(id = ?message.id, "Received message");
        Ok(Some(message))
    }

    async fn close(&mut self) -> Result<(), GatewayError> {
        // Perform graceful shutdown
        self.writer.shutdown().await
            .map_err(|e| GatewayError::RuntimeError(e.into()))?;

        tracing::debug!("Connection closed");
        Ok(())
    }
}
```

### Step 4: Register Runtime

Update the module exports and factory:

```rust
// gateway-core/src/runtime/mod.rs

mod local_process;
mod remote_sse;
mod my_custom;  // Add this

pub use local_process::LocalProcessRuntime;
pub use remote_sse::RemoteSseRuntime;
pub use my_custom::MyCustomRuntime;  // Add this

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

            // Add your runtime
            RuntimeConfig::MyCustomRuntime {
                endpoint,
                auth_token,
                timeout_seconds,
                options,
            } => {
                Ok(Box::new(MyCustomRuntime::new(
                    endpoint.clone(),
                    auth_token.clone(),
                    *timeout_seconds,
                    options.clone(),
                )))
            }
        }
    }

    pub fn type_name(&self) -> &str {
        match self {
            RuntimeConfig::LocalProcess { .. } => "local-process",
            RuntimeConfig::RemoteSse { .. } => "remote-sse",
            RuntimeConfig::MyCustomRuntime { .. } => "my-custom-runtime",
        }
    }
}
```

### Step 5: Add Tests

```rust
// gateway-core/src/runtime/my_custom.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_creation() {
        let runtime = MyCustomRuntime::new(
            "localhost:9999".to_string(),
            Some("test-token".to_string()),
            30,
            HashMap::new(),
        );
        assert_eq!(runtime.endpoint, "localhost:9999");
    }

    #[tokio::test]
    async fn test_connection_timeout() {
        let runtime = MyCustomRuntime::new(
            "192.0.2.1:9999".to_string(),  // Non-routable IP
            None,
            1,  // 1 second timeout
            HashMap::new(),
        );

        let result = runtime.connect().await;
        assert!(result.is_err());
    }

    // Add more tests for your specific runtime logic
}
```

### Step 6: Update Documentation

Add documentation for your runtime:

```rust
/// Custom runtime for connecting to proprietary MCP servers.
///
/// # Configuration
///
/// ```yaml
/// runtime:
///   type: my-custom-runtime
///   endpoint: "mcp.example.com:9999"
///   auth_token: "${AUTH_TOKEN}"
///   timeout_seconds: 60
///   options:
///     key: value
/// ```
///
/// # Features
///
/// - TCP-based communication
/// - Optional token authentication
/// - Configurable timeouts
pub struct MyCustomRuntime { ... }
```

## Example: AWS Lambda Runtime

Here's a more complex example connecting to MCP servers running as AWS Lambda functions:

```rust
// gateway-core/src/runtime/lambda.rs

use aws_sdk_lambda::Client as LambdaClient;

pub struct LambdaRuntime {
    function_name: String,
    client: LambdaClient,
}

#[async_trait]
impl Runtime for LambdaRuntime {
    async fn connect(&self) -> Result<Box<dyn BackendConnection>, GatewayError> {
        Ok(Box::new(LambdaConnection::new(
            self.client.clone(),
            self.function_name.clone(),
        )))
    }
}

pub struct LambdaConnection {
    client: LambdaClient,
    function_name: String,
}

#[async_trait]
impl BackendConnection for LambdaConnection {
    async fn send(&mut self, message: &McpMessage) -> Result<(), GatewayError> {
        // Lambda is request/response, so we store the request
        // and invoke on recv()
        todo!()
    }

    async fn recv(&mut self) -> Result<Option<McpMessage>, GatewayError> {
        let response = self.client
            .invoke()
            .function_name(&self.function_name)
            .payload(/* stored message */)
            .send()
            .await?;

        // Parse response
        todo!()
    }

    async fn close(&mut self) -> Result<(), GatewayError> {
        // Lambda connections are stateless
        Ok(())
    }
}
```

## Best Practices

1. **Handle Timeouts**: Always implement timeouts for network operations
2. **Log Appropriately**: Use tracing for debug/trace level logging
3. **Clean Errors**: Convert errors to `GatewayError` with context
4. **Test Thoroughly**: Include unit and integration tests
5. **Document Config**: Document all configuration options
6. **Handle Reconnection**: Consider connection health and reconnection
7. **Resource Cleanup**: Implement proper cleanup in `close()`
