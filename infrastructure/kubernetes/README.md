# CDX Notification Service - Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the CDX Notification Service to a production environment.

## Prerequisites

- Kubernetes cluster (v1.21+)
- NGINX Ingress Controller
- cert-manager for SSL certificates
- Prometheus Operator (optional, for monitoring)
- Helm (optional, for package management)

## Files Overview

### Core Deployment Files

- `namespace.yaml` - Namespace, ResourceQuota, and LimitRange
- `configmap.yaml` - Configuration and secrets
- `deployment.yaml` - Main application deployment
- `service.yaml` - Service definitions
- `ingress.yaml` - Ingress and NetworkPolicy
- `hpa.yaml` - Horizontal Pod Autoscaler and Pod Disruption Budget

### Configuration Files

- `kustomization.yaml` - Kustomize configuration for environment management
- `monitoring.yaml` - ServiceMonitor and PrometheusRule for monitoring

## Deployment Instructions

### 1. Create Namespace and Resources

```bash
kubectl apply -f namespace.yaml
```

### 2. Deploy Configuration

```bash
kubectl apply -f configmap.yaml
```

### 3. Deploy Application

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

### 4. Deploy Monitoring (Optional)

```bash
kubectl apply -f monitoring.yaml
```

### 5. Using Kustomize (Recommended)

```bash
kubectl apply -k .
```

## Environment Variables

### Required Secrets

Update the following secrets in `configmap.yaml`:

- `MONGODB_PASSWORD` - MongoDB password
- `REDIS_PASSWORD` - Redis password
- `RABBITMQ_PASSWORD` - RabbitMQ password
- `NOVU_API_KEY` - Novu API key
- `JWT_SECRET` - JWT signing secret
- `ENCRYPTION_KEY` - Data encryption key

### Configuration

Key configuration values in ConfigMap:

- `NODE_ENV` - Environment (production)
- `LOG_LEVEL` - Logging level (info)
- `API_PREFIX` - API prefix (api/v1)
- Database, cache, and message broker URLs

## Scaling

The deployment includes:

- **Horizontal Pod Autoscaler**: Scales based on CPU (70%), memory (80%), and HTTP requests (100 req/s)
- **Pod Disruption Budget**: Ensures at least 1 pod is always available
- **Resource Limits**: CPU and memory limits per pod

## Security

- **NetworkPolicy**: Restricts network traffic to required services only
- **TLS/SSL**: Automatic SSL certificate management with Let's Encrypt
- **CORS**: Configured for specific origins
- **Rate Limiting**: 1000 requests per minute per IP

## Monitoring

- **Health Checks**: Readiness and liveness probes
- **Metrics**: Prometheus metrics endpoint on port 9090
- **Alerts**: Pre-configured alerts for service health, performance, and resource usage
- **Tracing**: Jaeger integration for distributed tracing

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n cdx-production -l app=cdx-notification-service
```

### View Logs

```bash
kubectl logs -n cdx-production -l app=cdx-notification-service -f
```

### Check Service

```bash
kubectl get svc -n cdx-production cdx-notification-service
```

### Check Ingress

```bash
kubectl get ingress -n cdx-production
```

### Port Forward for Testing

```bash
kubectl port-forward -n cdx-production svc/cdx-notification-service 3000:80
```

## Customization

### Environment-Specific Deployments

Use Kustomize overlays for different environments:

```bash
# Development
kubectl apply -k overlays/development/

# Staging
kubectl apply -k overlays/staging/

# Production
kubectl apply -k overlays/production/
```

### Resource Adjustments

Modify resource requests/limits in `deployment.yaml`:

```yaml
resources:
  requests:
    memory: '256Mi'
    cpu: '250m'
  limits:
    memory: '512Mi'
    cpu: '500m'
```

## Maintenance

### Rolling Updates

```bash
kubectl rollout restart deployment/cdx-notification-service -n cdx-production
```

### Scaling

```bash
kubectl scale deployment cdx-notification-service --replicas=5 -n cdx-production
```

### Configuration Updates

```bash
kubectl apply -f configmap.yaml
kubectl rollout restart deployment/cdx-notification-service -n cdx-production
```
