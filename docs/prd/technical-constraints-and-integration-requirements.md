# Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**:

- TypeScript/JavaScript (NestJS framework)

**Frameworks**:

- NestJS (backend framework)
- RabbitMQ (message broker)
- Novu (notification infrastructure - self-hosted)

**Database**:

- MongoDB 6.0+ (Document Database)
- Mongoose ODM 8.0+ (Object Document Mapper)

**Infrastructure**:

- Docker/Kubernetes (container orchestration)
- RabbitMQ (message queue)
- Auth Service (internal authentication/authorization)

**External Dependencies**:

- Novu Self-hosted API
- Firebase Cloud Messaging (FCM) - for Android push
- Apple Push Notification Service (APNs) - for iOS push
- Expo Push Notifications - for React Native apps
- SMTP Server - for email notifications
- Redis Cluster - for caching, session management, and queue persistence
- Tedis Client - for TypeScript Redis operations
- Prometheus - for metrics collection
- Grafana - for monitoring dashboards
- Jaeger - for distributed tracing
- MinIO - for file storage and attachments
- RabbitMQ - for user event synchronization

### Integration Approach

**Database Integration Strategy**:

- Use MongoDB 6.0+ with Mongoose ODM 8.0+ for consistency with existing microservices
- Collection design:
  - `users` collection: store user profile information synced from Auth Service
  - `device_tokens` collection: store FCM/APNS/Expo device tokens for push notifications
  - `announcements` collection: store core notification content and metadata
  - `user_notifications` collection: user's personal notification inbox
  - `categories` collection: logical grouping for targeted notifications with hierarchical structure
  - `category_members` collection: many-to-many relationship between users and categories
- Implement database migrations with Mongoose migration scripts
- Support MongoDB connection pooling and replica set configuration
- Use Redis for queue metrics, backup storage, and caching:
  - `notification:queue:metrics` - real-time queue performance metrics (7-day TTL)
  - `notification:queue:backup` - queue state persistence for zero data loss (24-hour TTL)
  - `unread_count:{userId}` - cached unread notification counts (5-minute TTL)
  - `circuit_breaker:novu` - circuit breaker state persistence

**API Integration Strategy**:

- **Auth Service Integration**:
  - JWT token validation middleware
  - API calls to query users by role
  - API calls to validate permissions
  - Implement caching layer (Redis) for role data with TTL
  - Circuit breaker pattern for Auth Service calls
- **Novu Integration**:
  - Novu REST API client with circuit breaker
  - Subscriber management (sync users with Novu)
  - Workflow triggers for different notification types
  - Template management with versioning
  - Event tracking and delivery status
  - Webhook support for delivery events
  - Batch processing for high-volume notifications
- **RabbitMQ Integration**:
  - Consumer pattern for notification events
  - Exchange: `notifications.exchange` (topic exchange)
  - Routing keys: `notification.{service}.{type}` (e.g., `notification.payment.success`)
  - Priority queues for different notification priorities
  - Dead letter queue for failed messages
  - Message acknowledgment and retry logic
  - Message deduplication support
- **Priority Queue System**:
  - 5 parallel workers for different priority levels
  - URGENT: Immediate processing (1 worker)
  - HIGH: High priority processing (2 workers)
  - NORMAL: Standard processing (2 workers)
  - LOW: Batch processing (1 worker)
  - Batch size: 10 notifications per worker cycle
  - Retry mechanism: 3 attempts with exponential backoff (1s → 2s → 4s)
- **Circuit Breaker Integration**:
  - Automatic failure detection and recovery
  - Fallback mechanisms for external service failures
  - Health check integration with monitoring systems
  - 10 consecutive failure threshold with 30-second auto-reset
- **User Event Synchronization**:
  - RabbitMQ event listeners for user lifecycle events
  - Automatic Novu subscriber creation/update/deletion
  - Device token cleanup on user deletion
  - GDPR compliance with data anonymization
  - Early ACK strategy for 10x faster processing
  - Novu Subscriber Queue with 3 concurrent workers
- **Redis Integration**:
  - Tedis client for TypeScript Redis operations
  - Queue state persistence with automatic backup
  - Real-time metrics storage and retrieval
  - Cache invalidation strategies for performance

**Frontend Integration Strategy**:

- RESTful API endpoints for mobile/web apps
- WebSocket support for real-time in-app notifications (optional)
- API versioning: `/api/v1/...`
- Swagger/OpenAPI documentation
- CORS configuration for web apps
- Real-time delivery status updates via WebSocket
- A/B testing API for notification content variations
- Analytics API for notification performance metrics

**Category Management Integration**:

- Category CRUD operations with hierarchical structure
- Bulk member management (up to 1000 users per request)
- Category-based notification targeting
- Member count tracking and automatic updates
- Category analytics and engagement metrics
- Integration with user management systems

**Novu Subscriber Queue Integration**:

- Early ACK strategy for RabbitMQ events (110ms vs 700-1200ms)
- 3 concurrent workers for Novu API operations
- 5 retry attempts with exponential backoff
- Circuit breaker protection for Novu API
- Redis persistence for zero data loss
- Real-time queue monitoring and metrics
- ServicesModule for centralized service management

**Testing Integration Strategy**:

- Unit tests with Jest
- Integration tests with Test Containers (RabbitMQ, MongoDB)
- E2E tests for critical flows
- Mocking Novu API for tests
- Test coverage reporting with Istanbul
- Performance testing for priority queue system
- Load testing for batch processing capabilities
- Circuit breaker testing with simulated failures
- A/B testing validation tests
- MongoDB in-memory testing with mongodb-memory-server

### Code Organization and Standards

**File Structure Approach** (Following cdx-qlnd & cdx-phananh pattern):

```
notification-service/
├── src/
│   ├── main.ts                           # Application entry point
│   ├── app.module.ts                     # Root application module
│   │
│   ├── common/                           # Shared utilities
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── api-response.decorator.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── all-exceptions.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── timeout.interceptor.ts
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts
│   │   │   └── parse-cuid.pipe.ts
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── api-response.dto.ts
│   │   ├── enums/
│   │   │   ├── notification-type.enum.ts
│   │   │   ├── notification-channel.enum.ts
│   │   │   └── notification-priority.enum.ts
│   │   └── utils/
│   │       ├── cuid.util.ts
│   │       └── date.util.ts
│   │
│   ├── config/                           # Configuration module
│   │   ├── config.module.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── rabbitmq.config.ts
│   │   ├── novu.config.ts
│   │   └── app.config.ts
│   │
│   ├── infrastructure/                   # Infrastructure layer
│   │   ├── database/
│   │   │   ├── mongoose.service.ts
│   │   │   ├── mongoose.module.ts
│   │   │   └── schemas/
│   │   │       ├── user.schema.ts
│   │   │       ├── device-token.schema.ts
│   │   │       ├── announcement.schema.ts
│   │   │       ├── user-notification.schema.ts
│   │   │       ├── category.schema.ts
│   │   │       └── category-member.schema.ts
│   │   ├── cache/
│   │   │   ├── redis.service.ts
│   │   │   └── redis.module.ts
│   │   └── messaging/
│   │       ├── rabbitmq.service.ts
│   │       ├── rabbitmq.module.ts
│   │       └── event-publisher.service.ts
│   │
│   ├── modules/
│   │   ├── notification/                 # Notification Module
│   │   │   ├── notification.module.ts
│   │   │   │
│   │   │   ├── notification/             # Notification Subdomain
│   │   │   │   ├── notification.module.ts
│   │   │   │   ├── application/          # Application layer (CQRS)
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── send-notification.command.ts
│   │   │   │   │   │   ├── send-notification.handler.ts
│   │   │   │   │   │   ├── retry-notification.command.ts
│   │   │   │   │   │   └── mark-as-read.command.ts
│   │   │   │   │   ├── queries/
│   │   │   │   │   │   ├── get-notification.query.ts
│   │   │   │   │   │   ├── list-notifications.query.ts
│   │   │   │   │   │   └── get-notification-history.query.ts
│   │   │   │   │   └── events/
│   │   │   │   │       ├── notification-sent.event.ts
│   │   │   │   │       ├── notification-failed.event.ts
│   │   │   │   │       └── notification-read.event.ts
│   │   │   │   ├── domain/               # Domain layer (DDD)
│   │   │   │   │   ├── notification.aggregate.ts
│   │   │   │   │   ├── notification.repository.ts
│   │   │   │   │   ├── notification.factory.ts
│   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   ├── notification-type.vo.ts
│   │   │   │   │   │   ├── notification-channel.vo.ts
│   │   │   │   │   │   └── notification-priority.vo.ts
│   │   │   │   │   └── policies/
│   │   │   │   │       └── retry-policy.ts
│   │   │   │   ├── infrastructure/       # Infrastructure implementations
│   │   │   │   │   ├── notification.repository.impl.ts
│   │   │   │   │   └── notification.mapper.ts
│   │   │   │   └── interface/            # Presentation layer
│   │   │   │       ├── notification.controller.ts
│   │   │   │       └── dto/
│   │   │   │           ├── send-notification.dto.ts
│   │   │   │           └── notification-response.dto.ts
│   │   │   │
│   │   │   ├── device-token/             # Device Token Subdomain
│   │   │   │   ├── device-token.module.ts
│   │   │   │   ├── application/
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── register-token.command.ts
│   │   │   │   │   │   ├── update-token.command.ts
│   │   │   │   │   │   └── delete-token.command.ts
│   │   │   │   │   └── queries/
│   │   │   │   │       └── get-user-tokens.query.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── device-token.entity.ts
│   │   │   │   │   └── device-token.repository.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── device-token.repository.impl.ts
│   │   │   │   └── interface/
│   │   │   │       └── device-token.controller.ts
│   │   │   │
│   │   │   ├── preferences/              # User Preferences Subdomain
│   │   │   │   ├── preferences.module.ts
│   │   │   │   ├── application/
│   │   │   │   ├── domain/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── interface/
│   │   │   │
│   │   │   ├── categories/              # Categories & Targeting
│   │   │   │   ├── categories.module.ts
│   │   │   │   ├── application/
│   │   │   │   ├── domain/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── interface/
│   │   │   │
│   │   │   ├── templates/                # Notification Templates
│   │   │   │   ├── templates.module.ts
│   │   │   │   ├── application/
│   │   │   │   ├── domain/
│   │   │   │   ├── infrastructure/
│   │   │   │   └── interface/
│   │   │   │
│   │   │   ├── admin/                    # Admin APIs
│   │   │   │   ├── admin.module.ts
│   │   │   │   └── interface/
│   │   │   │       └── admin.controller.ts
│   │   │   │
│   │   │   └── integration/              # External integrations
│   │   │       ├── novu/
│   │   │       │   ├── novu.client.ts
│   │   │       │   ├── novu.module.ts
│   │   │       │   └── novu-event.handler.ts
│   │   │       ├── auth-service/
│   │   │       │   ├── auth-service.client.ts
│   │   │       │   └── auth.module.ts
│   │   │       └── rabbitmq/
│   │   │           ├── notification-event.consumer.ts
│   │   │           └── rabbitmq-consumer.module.ts
│   │   │
│   │   └── health/                       # Health check module
│   │       ├── health.controller.ts
│   │       └── health.module.ts
│   │
│   └── workers/                          # Background workers
│       └── retry-worker.ts               # Retry failed notifications
│
├── scripts/                              # Database Scripts
│   ├── migrations/                       # MongoDB migrations
│   │   ├── 001-initial-setup.js
│   │   └── 002-default-categories.js
│   └── seed/                             # Database seeding
│       ├── seed-users.js
│       └── seed-announcements.js
│
├── test/                                 # Test files
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── factories/
│       ├── notification.factory.ts
│       ├── device-token.factory.ts
│       ├── user.factory.ts
│       └── announcement.factory.ts
│
├── infrastructure/                       # Infrastructure as Code
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── .env.example
│   └── coolify/
│       └── coolify.json
│
├── docs/                                 # Documentation
│   ├── architecture.md
│   ├── prd.md
│   └── api/
│       └── openapi.yml
│
├── Dockerfile
├── .env.example
├── package.json
├── bun.lockb
├── tsconfig.json
├── nest-cli.json
├── create-all-indexes.js              # MongoDB index creation script
└── README.md
```

**Module Structure Pattern** (Following DDD + CQRS):

```
subdomain/
├── subdomain.module.ts          # NestJS module
├── application/                 # Application layer (CQRS)
│   ├── commands/                # Write operations
│   ├── queries/                 # Read operations
│   └── events/                  # Event handlers
├── domain/                      # Domain layer (DDD)
│   ├── *.aggregate.ts           # Aggregates
│   ├── *.entity.ts              # Entities
│   ├── *.repository.ts          # Repository interfaces
│   ├── value-objects/           # Value objects
│   └── policies/                # Business rules
├── infrastructure/              # Infrastructure layer
│   ├── *.repository.impl.ts     # Repository implementations
│   └── *.mapper.ts              # Data mappers
└── interface/                   # Presentation layer
    ├── *.controller.ts          # REST controllers
    └── dto/                     # Data transfer objects
```

**Naming Conventions**:

- NestJS standard conventions (modules, controllers, services)
- PascalCase for classes
- camelCase for methods and variables
- kebab-case for file names
- UPPER_SNAKE_CASE for constants and environment variables

**Coding Standards**:

- ESLint + Prettier configuration
- TypeScript strict mode
- Dependency injection pattern (NestJS standard)
- DTOs for validation (class-validator, class-transformer)
- Exception filters for error handling
- Interceptors for logging and transformation

**Documentation Standards**:

- JSDoc comments for public APIs
- README.md with setup instructions
- API documentation with Swagger decorators
- Architecture Decision Records (ADRs) for major decisions

### Deployment and Operations

**Build Process Integration**:

- Dockerfile multi-stage build
- npm scripts for build, test, lint
- CI/CD pipeline (GitHub Actions, GitLab CI, or Jenkins)
- Automated testing in CI
- Code quality checks (SonarQube optional)

**Deployment Strategy**:

- Kubernetes deployment with rolling updates
- ConfigMaps for configuration
- Secrets for sensitive data (API keys, DB credentials)
- Horizontal Pod Autoscaling based on CPU/memory
- Health checks: `/health` and `/ready` endpoints
- Blue-green deployment support

**Monitoring and Logging**:

- Structured logging with Winston or Pino
- Log levels: error, warn, info, debug
- Request/response logging with correlation IDs
- Prometheus metrics endpoint
- Custom metrics:
  - `notifications_sent_total` (counter)
  - `notifications_failed_total` (counter)
  - `notification_delivery_duration_seconds` (histogram)
  - `push_tokens_active` (gauge)
- Grafana dashboards for visualization
- Error tracking with Sentry (optional)

**Configuration Management**:

- Environment variables for configuration
- `.env` files for local development
- Kubernetes ConfigMaps/Secrets for production
- Configuration validation with class-validator
- Support multiple environments (dev, staging, production)

### Risk Assessment and Mitigation

**Technical Risks**:

- **Risk**: Novu self-hosted downtime → **Mitigation**: Implement queue system, retry failed notifications when Novu recovers
- **Risk**: RabbitMQ message loss → **Mitigation**: Persistent messages, dead letter queues, monitoring
- **Risk**: Database bottleneck → **Mitigation**: Database indexing, connection pooling, caching layer
- **Risk**: Push token invalidation → **Mitigation**: Auto-cleanup mechanism, graceful error handling

**Integration Risks**:

- **Risk**: Auth Service unavailable → **Mitigation**: Cached role data with TTL, graceful degradation
- **Risk**: Breaking changes in RabbitMQ schema → **Mitigation**: Schema validation, versioned events
- **Risk**: Novu API rate limiting → **Mitigation**: Rate limiting on our side, batch processing

**Deployment Risks**:

- **Risk**: Database migration failures → **Mitigation**: Backup before migration, rollback plan, test migrations
- **Risk**: Configuration errors → **Mitigation**: Configuration validation, staged rollouts
- **Risk**: Resource exhaustion → **Mitigation**: Resource limits, monitoring, auto-scaling

**Mitigation Strategies**:

- Comprehensive testing (unit, integration, e2e)
- Gradual rollout with feature flags
- Rollback plan for deployment
- Circuit breaker pattern for external services
- Health checks and readiness probes
- Regular backup and disaster recovery plan

---
