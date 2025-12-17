---
id: middleware
title: Middleware
sidebar_position: 9
---

# Middleware

Open MCP Gateway uses Tower middleware for cross-cutting concerns like authentication, logging, and CORS.

## Middleware Stack

The HTTP server applies middleware in this order:

```rust
Router::new()
    .merge(api_routes)
    // Applied last (innermost)
    .layer(TraceLayer::new_for_http())
    // Applied second
    .layer(CorsLayer::permissive())
    // Applied first (outermost)
    .layer(auth_layer(config.api_key))
```

Request flow: Auth → CORS → Tracing → Handler → Tracing → CORS → Auth

---

## Authentication Middleware

The authentication middleware validates API keys on protected routes.

### Implementation

```rust
// gateway-http/src/middleware/auth.rs

use axum::{
    body::Body,
    http::{Request, StatusCode},
    response::Response,
};
use tower::{Layer, Service};

#[derive(Clone)]
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

#[derive(Clone)]
pub struct AuthMiddleware<S> {
    inner: S,
    api_key: String,
}

impl<S> Service<Request<Body>> for AuthMiddleware<S>
where
    S: Service<Request<Body>, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn call(&mut self, request: Request<Body>) -> Self::Future {
        let inner = self.inner.clone();
        let api_key = self.api_key.clone();

        Box::pin(async move {
            // Skip auth for health endpoint
            if request.uri().path() == "/health" {
                return inner.call(request).await;
            }

            // Check Authorization header
            let auth_header = request
                .headers()
                .get("Authorization")
                .and_then(|v| v.to_str().ok());

            // Check X-API-Key header
            let api_key_header = request
                .headers()
                .get("X-API-Key")
                .and_then(|v| v.to_str().ok());

            let provided_key = auth_header
                .and_then(|h| h.strip_prefix("Bearer "))
                .or(api_key_header);

            match provided_key {
                Some(key) if key == api_key => {
                    // Valid key, proceed
                    inner.call(request).await
                }
                Some(_) => {
                    // Invalid key
                    Ok(Response::builder()
                        .status(StatusCode::FORBIDDEN)
                        .body(Body::from(r#"{"error":"Forbidden"}"#))
                        .unwrap())
                }
                None => {
                    // No key provided
                    Ok(Response::builder()
                        .status(StatusCode::UNAUTHORIZED)
                        .body(Body::from(r#"{"error":"Unauthorized"}"#))
                        .unwrap())
                }
            }
        })
    }
}
```

### Usage

```rust
// Only add auth layer if api_key is configured
let app = if let Some(api_key) = config.api_key {
    router.layer(AuthLayer::new(api_key))
} else {
    router
};
```

---

## Tracing Middleware

Request tracing for observability.

### Configuration

```rust
use tower_http::trace::{TraceLayer, DefaultMakeSpan, DefaultOnResponse};
use tracing::Level;

let trace_layer = TraceLayer::new_for_http()
    .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
    .on_response(DefaultOnResponse::new().level(Level::INFO));

router.layer(trace_layer)
```

### Custom Tracing

```rust
use tower_http::trace::TraceLayer;

let trace_layer = TraceLayer::new_for_http()
    .make_span_with(|request: &Request<Body>| {
        tracing::info_span!(
            "http_request",
            method = %request.method(),
            uri = %request.uri(),
            version = ?request.version(),
        )
    })
    .on_request(|request: &Request<Body>, _span: &Span| {
        tracing::debug!(
            headers = ?request.headers(),
            "received request"
        );
    })
    .on_response(|response: &Response, latency: Duration, _span: &Span| {
        tracing::info!(
            status = response.status().as_u16(),
            latency_ms = latency.as_millis(),
            "sent response"
        );
    })
    .on_failure(|error: ServerErrorsFailureClass, latency: Duration, _span: &Span| {
        tracing::error!(
            error = ?error,
            latency_ms = latency.as_millis(),
            "request failed"
        );
    });
```

---

## CORS Middleware

Cross-Origin Resource Sharing configuration.

### Permissive (Development)

```rust
use tower_http::cors::CorsLayer;

router.layer(CorsLayer::permissive())
```

### Restrictive (Production)

```rust
use tower_http::cors::{CorsLayer, AllowOrigin, AllowMethods, AllowHeaders};
use http::Method;

let cors = CorsLayer::new()
    .allow_origin(AllowOrigin::list([
        "https://app.example.com".parse().unwrap(),
        "https://dashboard.example.com".parse().unwrap(),
    ]))
    .allow_methods([Method::GET, Method::POST])
    .allow_headers(AllowHeaders::list([
        "Content-Type".parse().unwrap(),
        "Authorization".parse().unwrap(),
        "X-API-Key".parse().unwrap(),
        "X-Server-ID".parse().unwrap(),
    ]))
    .max_age(Duration::from_secs(3600));

router.layer(cors)
```

---

## Custom Middleware

### Request Timing

```rust
use std::time::Instant;

#[derive(Clone)]
pub struct TimingLayer;

impl<S> Layer<S> for TimingLayer {
    type Service = TimingMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        TimingMiddleware { inner }
    }
}

#[derive(Clone)]
pub struct TimingMiddleware<S> {
    inner: S,
}

impl<S> Service<Request<Body>> for TimingMiddleware<S>
where
    S: Service<Request<Body>, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = BoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn call(&mut self, request: Request<Body>) -> Self::Future {
        let inner = self.inner.clone();
        let path = request.uri().path().to_string();

        Box::pin(async move {
            let start = Instant::now();
            let response = inner.call(request).await?;
            let duration = start.elapsed();

            tracing::info!(
                path = %path,
                duration_ms = duration.as_millis(),
                "request completed"
            );

            Ok(response)
        })
    }
}
```

### Request ID Injection

```rust
use uuid::Uuid;

#[derive(Clone)]
pub struct RequestIdLayer;

impl<S> Layer<S> for RequestIdLayer {
    type Service = RequestIdMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RequestIdMiddleware { inner }
    }
}

impl<S> Service<Request<Body>> for RequestIdMiddleware<S>
where
    S: Service<Request<Body>, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    fn call(&mut self, mut request: Request<Body>) -> Self::Future {
        let inner = self.inner.clone();

        // Check for existing request ID or generate new
        let request_id = request
            .headers()
            .get("X-Request-ID")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        // Add to request extensions for handler access
        request.extensions_mut().insert(RequestId(request_id.clone()));

        Box::pin(async move {
            let mut response = inner.call(request).await?;

            // Add to response headers
            response.headers_mut().insert(
                "X-Request-ID",
                request_id.parse().unwrap(),
            );

            Ok(response)
        })
    }
}

#[derive(Clone)]
pub struct RequestId(pub String);
```

### Rate Limiting

```rust
use governor::{Quota, RateLimiter};
use std::num::NonZeroU32;

#[derive(Clone)]
pub struct RateLimitLayer {
    limiter: Arc<RateLimiter<String, ...>>,
}

impl RateLimitLayer {
    pub fn new(requests_per_second: u32) -> Self {
        let quota = Quota::per_second(NonZeroU32::new(requests_per_second).unwrap());
        Self {
            limiter: Arc::new(RateLimiter::keyed(quota)),
        }
    }
}

impl<S> Service<Request<Body>> for RateLimitMiddleware<S>
where
    S: Service<Request<Body>, Response = Response> + Clone + Send + 'static,
{
    fn call(&mut self, request: Request<Body>) -> Self::Future {
        let inner = self.inner.clone();
        let limiter = self.limiter.clone();

        // Rate limit by API key or IP
        let key = extract_rate_limit_key(&request);

        Box::pin(async move {
            if limiter.check_key(&key).is_err() {
                return Ok(Response::builder()
                    .status(StatusCode::TOO_MANY_REQUESTS)
                    .body(Body::from(r#"{"error":"Rate limit exceeded"}"#))
                    .unwrap());
            }

            inner.call(request).await
        })
    }
}
```

---

## Middleware Composition

Combine multiple middleware layers:

```rust
use tower::ServiceBuilder;

let middleware_stack = ServiceBuilder::new()
    // Applied first (outermost)
    .layer(RequestIdLayer)
    .layer(TimingLayer)
    .layer(AuthLayer::new(api_key))
    .layer(CorsLayer::permissive())
    // Applied last (innermost)
    .layer(TraceLayer::new_for_http());

let app = Router::new()
    .merge(routes)
    .layer(middleware_stack);
```

---

## Best Practices

1. **Order Matters**: Apply middleware in the correct order
2. **Clone Efficiency**: Use `Arc` for shared state to minimize clones
3. **Async Safety**: Ensure middleware is `Send + Sync`
4. **Error Handling**: Handle errors gracefully, don't panic
5. **Performance**: Keep middleware lightweight to minimize latency
