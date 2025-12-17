---
id: kubernetes
title: Kubernetes Deployment
sidebar_position: 2
---

# Kubernetes Deployment

Deploy Open MCP Gateway on Kubernetes for production workloads.

## Quick Start

### 1. Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-gateway
```

### 2. Create ConfigMaps

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-gateway-config
  namespace: mcp-gateway
data:
  config.yaml: |
    listen_addr: "0.0.0.0:4444"
    catalog_path: "/config/catalog.yaml"
    log_level: "info"

  catalog.yaml: |
    servers:
      - id: echo
        display_name: Echo Server
        runtime:
          type: remote-sse
          url: http://mcp-echo:8080/mcp
```

### 3. Create Secret

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-gateway-secrets
  namespace: mcp-gateway
type: Opaque
stringData:
  api-key: "your-secure-api-key"
```

### 4. Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
  labels:
    app: mcp-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-gateway
  template:
    metadata:
      labels:
        app: mcp-gateway
    spec:
      containers:
        - name: gateway
          image: ghcr.io/agentic/mcp-gateway:latest
          ports:
            - containerPort: 4444
          env:
            - name: RUST_LOG
              value: "info"
            - name: MCP_GATEWAY_API_KEY
              valueFrom:
                secretKeyRef:
                  name: mcp-gateway-secrets
                  key: api-key
          volumeMounts:
            - name: config
              mountPath: /config
              readOnly: true
          livenessProbe:
            httpGet:
              path: /health
              port: 4444
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 4444
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
      volumes:
        - name: config
          configMap:
            name: mcp-gateway-config
```

### 5. Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
spec:
  selector:
    app: mcp-gateway
  ports:
    - port: 4444
      targetPort: 4444
  type: ClusterIP
```

### 6. Create Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: mcp-gateway.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mcp-gateway
                port:
                  number: 4444
```

### Apply Resources

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

## Helm Chart

A Helm chart is planned for future releases. For now, use the manifests above or create your own chart.

```yaml
# values.yaml (example structure)
replicaCount: 2

image:
  repository: ghcr.io/agentic/mcp-gateway
  tag: latest
  pullPolicy: IfNotPresent

config:
  listenAddr: "0.0.0.0:4444"
  logLevel: info

catalog:
  servers: []

secrets:
  apiKey: ""

resources:
  requests:
    memory: "64Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "500m"
```

## Production Configuration

### High Availability

```yaml
# deployment.yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: mcp-gateway
                topologyKey: kubernetes.io/hostname
```

### Horizontal Pod Autoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Pod Disruption Budget

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: mcp-gateway
```

## Configuration Management

### Hot Reload with ConfigMap

Update the ConfigMap and trigger reload:

```bash
# Update ConfigMap
kubectl create configmap mcp-gateway-config \
  --from-file=config.yaml \
  --from-file=catalog.yaml \
  -n mcp-gateway \
  --dry-run=client -o yaml | kubectl apply -f -

# Trigger reload (via API)
kubectl exec -n mcp-gateway deployment/mcp-gateway -- \
  curl -X POST http://localhost:4444/admin/reload
```

### Using Kustomize

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: mcp-gateway

resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml

configMapGenerator:
  - name: mcp-gateway-config
    files:
      - config.yaml
      - catalog.yaml

secretGenerator:
  - name: mcp-gateway-secrets
    literals:
      - api-key=your-api-key
```

## MCP Servers as Kubernetes Services

### Deploy MCP Server

```yaml
# mcp-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-postgres
  namespace: mcp-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mcp-postgres
  template:
    metadata:
      labels:
        app: mcp-postgres
    spec:
      containers:
        - name: server
          image: mcp/postgres:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: url
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-postgres
  namespace: mcp-gateway
spec:
  selector:
    app: mcp-postgres
  ports:
    - port: 8080
```

### Reference in Catalog

```yaml
# catalog.yaml
servers:
  - id: postgres
    display_name: PostgreSQL
    runtime:
      type: remote-sse
      url: http://mcp-postgres:8080/mcp
```

## Monitoring

### ServiceMonitor (Prometheus Operator)

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
spec:
  selector:
    matchLabels:
      app: mcp-gateway
  endpoints:
    - port: http
      path: /stats
      interval: 30s
```

### Logging with Fluentd

Logs are JSON-formatted and can be collected by Fluentd/Fluent Bit:

```yaml
# fluent-bit configmap
[INPUT]
    Name              tail
    Path              /var/log/containers/mcp-gateway*.log
    Parser            docker
    Tag               mcp.gateway

[OUTPUT]
    Name              es
    Match             mcp.*
    Host              elasticsearch
    Port              9200
    Index             mcp-gateway
```

## Security

### Network Policy

```yaml
# networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
spec:
  podSelector:
    matchLabels:
      app: mcp-gateway
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 4444
  egress:
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/component: mcp-server
      ports:
        - port: 8080
```

### Service Account

```yaml
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
rules: []  # No special permissions needed
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: mcp-gateway
  namespace: mcp-gateway
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: mcp-gateway
subjects:
  - kind: ServiceAccount
    name: mcp-gateway
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n mcp-gateway
kubectl describe pod -n mcp-gateway mcp-gateway-xxx
```

### View Logs

```bash
kubectl logs -n mcp-gateway -l app=mcp-gateway -f
```

### Exec into Pod

```bash
kubectl exec -it -n mcp-gateway deployment/mcp-gateway -- /bin/bash
```

### Test Connectivity

```bash
kubectl run -it --rm debug --image=curlimages/curl -- \
  curl http://mcp-gateway.mcp-gateway:4444/health
```
