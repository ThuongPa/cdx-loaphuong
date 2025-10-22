# Source Tree

Based on NestJS architecture with Fastify, DDD + CQRS patterns, and component organization defined above, I will create detailed project folder structure for Notification Service.

```
notification-service/
├── src/
│   ├── main.ts                           # Application entry point
│   ├── app.module.ts                     # Root application module
│   │
│   ├── common/                           # Shared utilities and cross-cutting concerns
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   ├── api-response.decorator.ts
│   │   │   └── admin-only.decorator.ts
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   ├── all-exceptions.filter.ts
│   │   │   └── validation-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── admin.guard.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   └── cache.interceptor.ts
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts
│   │   │   ├── parse-cuid.pipe.ts
│   │   │   └── parse-int.pipe.ts
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   ├── api-response.dto.ts
│   │   │   └── base.dto.ts
│   │   ├── enums/
│   │   │   ├── notification-type.enum.ts
│   │   │   ├── notification-channel.enum.ts
│   │   │   ├── notification-priority.enum.ts
│   │   │   ├── notification-status.enum.ts
│   │   │   └── user-role.enum.ts
│   │   ├── utils/
│   │   │   ├── cuid.util.ts
│   │   │   ├── date.util.ts
│   │   │   ├── hash.util.ts
│   │   │   └── validation.util.ts
│   │   └── constants/
│   │       ├── app.constants.ts
│   │       ├── error.constants.ts
│   │       └── cache.constants.ts
│   │
│   ├── config/                           # Configuration module
│   │   ├── config.module.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── rabbitmq.config.ts
│   │   ├── novu.config.ts
│   │   ├── auth.config.ts
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
│   │   │       ├── category-member.schema.ts
│   │   │       ├── user-preferences.schema.ts
│   │   │       └── notification-template.schema.ts
│   │   ├── cache/
│   │   │   ├── redis.service.ts
│   │   │   ├── redis.module.ts
│   │   │   └── cache-key.service.ts
│   │   ├── messaging/
│   │   │   ├── rabbitmq.service.ts
│   │   │   ├── rabbitmq.module.ts
│   │   │   ├── event-publisher.service.ts
│   │   │   └── message-serializer.service.ts
│   │   └── external/
│   │       ├── novu/
│   │       │   ├── novu.client.ts
│   │       │   ├── novu.module.ts
│   │       │   └── novu-event.handler.ts
│   │       ├── auth-service/
│   │       │   ├── auth-service.client.ts
│   │       │   ├── auth-service.module.ts
│   │       │   └── auth-validation.service.ts
│   │       └── circuit-breaker/
│   │           ├── circuit-breaker.service.ts
│   │           ├── circuit-breaker.module.ts
│   │           └── health-check.service.ts
│   │
│   ├── modules/
│   │   ├── notification/                 # Main Notification Module
│   │   │   ├── notification.module.ts
│   │   │   │
│   │   │   ├── notification/             # Notification Subdomain
│   │   │   │   ├── notification.module.ts
│   │   │   │   ├── application/          # Application layer (CQRS)
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── send-notification.command.ts
│   │   │   │   │   │   ├── send-notification.handler.ts
│   │   │   │   │   │   ├── retry-notification.command.ts
│   │   │   │   │   │   ├── retry-notification.handler.ts
│   │   │   │   │   │   ├── mark-as-read.command.ts
│   │   │   │   │   │   ├── mark-as-read.handler.ts
│   │   │   │   │   │   ├── mark-all-read.command.ts
│   │   │   │   │   │   └── mark-all-read.handler.ts
│   │   │   │   │   ├── queries/
│   │   │   │   │   │   ├── get-notification.query.ts
│   │   │   │   │   │   ├── get-notification.handler.ts
│   │   │   │   │   │   ├── list-notifications.query.ts
│   │   │   │   │   │   ├── list-notifications.handler.ts
│   │   │   │   │   │   ├── get-notification-history.query.ts
│   │   │   │   │   │   ├── get-notification-history.handler.ts
│   │   │   │   │   │   ├── get-unread-count.query.ts
│   │   │   │   │   │   └── get-unread-count.handler.ts
│   │   │   │   │   └── events/
│   │   │   │   │       ├── notification-sent.event.ts
│   │   │   │   │       ├── notification-sent.handler.ts
│   │   │   │   │       ├── notification-failed.event.ts
│   │   │   │   │       ├── notification-failed.handler.ts
│   │   │   │   │       ├── notification-read.event.ts
│   │   │   │   │       └── notification-read.handler.ts
│   │   │   │   ├── domain/               # Domain layer (DDD)
│   │   │   │   │   ├── notification.aggregate.ts
│   │   │   │   │   ├── notification.repository.ts
│   │   │   │   │   ├── notification.factory.ts
│   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   ├── notification-type.vo.ts
│   │   │   │   │   │   ├── notification-channel.vo.ts
│   │   │   │   │   │   ├── notification-priority.vo.ts
│   │   │   │   │   │   └── notification-status.vo.ts
│   │   │   │   │   └── policies/
│   │   │   │   │       ├── retry-policy.ts
│   │   │   │   │       ├── priority-policy.ts
│   │   │   │   │       └── targeting-policy.ts
│   │   │   │   ├── infrastructure/       # Infrastructure implementations
│   │   │   │   │   ├── notification.repository.impl.ts
│   │   │   │   │   ├── notification.mapper.ts
│   │   │   │   │   └── notification.event-store.ts
│   │   │   │   └── interface/            # Presentation layer
│   │   │   │       ├── notification.controller.ts
│   │   │   │       └── dto/
│   │   │   │           ├── send-notification.dto.ts
│   │   │   │           ├── notification-response.dto.ts
│   │   │   │           ├── notification-detail.dto.ts
│   │   │   │           └── mark-as-read.dto.ts
│   │   │   │
│   │   │   ├── device-token/             # Device Token Subdomain
│   │   │   │   ├── device-token.module.ts
│   │   │   │   ├── application/
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── register-token.command.ts
│   │   │   │   │   │   ├── register-token.handler.ts
│   │   │   │   │   │   ├── update-token.command.ts
│   │   │   │   │   │   ├── update-token.handler.ts
│   │   │   │   │   │   ├── delete-token.command.ts
│   │   │   │   │   │   └── delete-token.handler.ts
│   │   │   │   │   └── queries/
│   │   │   │   │       ├── get-user-tokens.query.ts
│   │   │   │   │       └── get-user-tokens.handler.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── device-token.entity.ts
│   │   │   │   │   ├── device-token.repository.ts
│   │   │   │   │   └── value-objects/
│   │   │   │   │       ├── device-platform.vo.ts
│   │   │   │   │       └── push-provider.vo.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── device-token.repository.impl.ts
│   │   │   │   └── interface/
│   │   │   │       ├── device-token.controller.ts
│   │   │   │       └── dto/
│   │   │   │           ├── register-token.dto.ts
│   │   │   │           ├── update-token.dto.ts
│   │   │   │           └── device-token-response.dto.ts
│   │   │   │
│   │   │   ├── preferences/              # User Preferences Subdomain
│   │   │   │   ├── preferences.module.ts
│   │   │   │   ├── application/
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── update-preferences.command.ts
│   │   │   │   │   │   └── update-preferences.handler.ts
│   │   │   │   │   └── queries/
│   │   │   │   │       ├── get-preferences.query.ts
│   │   │   │   │       └── get-preferences.handler.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── user-preferences.entity.ts
│   │   │   │   │   ├── user-preferences.repository.ts
│   │   │   │   │   └── policies/
│   │   │   │   │       └── emergency-override.policy.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── user-preferences.repository.impl.ts
│   │   │   │   └── interface/
│   │   │   │       ├── preferences.controller.ts
│   │   │   │       └── dto/
│   │   │   │           ├── update-preferences.dto.ts
│   │   │   │           └── preferences-response.dto.ts
│   │   │   │
│   │   │   ├── categories/              # Categories & Targeting
│   │   │   │   ├── categories.module.ts
│   │   │   │   ├── application/
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── create-category.command.ts
│   │   │   │   │   │   ├── create-category.handler.ts
│   │   │   │   │   │   ├── add-user-to-category.command.ts
│   │   │   │   │   │   └── add-user-to-category.handler.ts
│   │   │   │   │   └── queries/
│   │   │   │   │       ├── get-categories.query.ts
│   │   │   │   │       └── get-categories.handler.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── category.entity.ts
│   │   │   │   │   ├── category.repository.ts
│   │   │   │   │   └── value-objects/
│   │   │   │   │       └── category-type.vo.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── category.repository.impl.ts
│   │   │   │   └── interface/
│   │   │   │       ├── categories.controller.ts
│   │   │   │       └── dto/
│   │   │   │           ├── create-category.dto.ts
│   │   │   │           └── category-response.dto.ts
│   │   │   │
│   │   │   ├── templates/                # Notification Templates
│   │   │   │   ├── templates.module.ts
│   │   │   │   ├── application/
│   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── create-template.command.ts
│   │   │   │   │   │   ├── create-template.handler.ts
│   │   │   │   │   │   ├── update-template.command.ts
│   │   │   │   │   │   └── update-template.handler.ts
│   │   │   │   │   └── queries/
│   │   │   │   │       ├── get-templates.query.ts
│   │   │   │   │       ├── get-templates.handler.ts
│   │   │   │   │       ├── render-template.query.ts
│   │   │   │   │       └── render-template.handler.ts
│   │   │   │   ├── domain/
│   │   │   │   │   ├── notification-template.entity.ts
│   │   │   │   │   ├── notification-template.repository.ts
│   │   │   │   │   └── services/
│   │   │   │   │       └── template-renderer.service.ts
│   │   │   │   ├── infrastructure/
│   │   │   │   │   └── notification-template.repository.impl.ts
│   │   │   │   └── interface/
│   │   │   │       ├── templates.controller.ts
│   │   │   │       └── dto/
│   │   │   │           ├── create-template.dto.ts
│   │   │   │           ├── update-template.dto.ts
│   │   │   │           └── template-response.dto.ts
│   │   │   │
│   │   │   ├── admin/                    # Admin APIs
│   │   │   │   ├── admin.module.ts
│   │   │   │   └── interface/
│   │   │   │       ├── admin.controller.ts
│   │   │   │       └── dto/
│   │   │   │           ├── broadcast-notification.dto.ts
│   │   │   │           ├── notification-statistics.dto.ts
│   │   │   │           └── failed-notification.dto.ts
│   │   │   │
│   │   │   └── integration/              # External integrations
│   │   │       ├── rabbitmq/
│   │   │       │   ├── notification-event.consumer.ts
│   │   │       │   ├── rabbitmq-consumer.module.ts
│   │   │       │   └── event-handlers/
│   │   │       │       ├── payment-event.handler.ts
│   │   │       │       ├── booking-event.handler.ts
│   │   │       │       ├── announcement-event.handler.ts
│   │   │       │       └── emergency-event.handler.ts
│   │   │       ├── priority-queue/
│   │   │       │   ├── priority-queue.service.ts
│   │   │       │   ├── priority-queue.module.ts
│   │   │       │   └── workers/
│   │   │       │       ├── urgent-worker.ts
│   │   │       │       ├── high-worker.ts
│   │   │       │       ├── normal-worker.ts
│   │   │       │       └── low-worker.ts
│   │   │       ├── batch-processor/
│   │   │       │   ├── batch-processor.service.ts
│   │   │       │   ├── batch-processor.module.ts
│   │   │       │   └── deduplication.service.ts
│   │   │       └── analytics/
│   │   │           ├── analytics.service.ts
│   │   │           ├── analytics.module.ts
│   │   │           └── metrics/
│   │   │               ├── notification-metrics.service.ts
│   │   │               └── performance-metrics.service.ts
│   │   │
│   │   └── health/                       # Health check module
│   │       ├── health.controller.ts
│   │       ├── health.service.ts
│   │       └── health.module.ts
│   │
│   └── workers/                          # Background workers
│       ├── retry-worker.ts               # Retry failed notifications
│       ├── cleanup-worker.ts             # Cleanup old data
│       ├── sync-worker.ts                # Sync with external services
│       └── workers.module.ts
│
├── scripts/                              # Database Scripts
│   ├── migrations/                       # MongoDB migrations
│   │   ├── 001-initial-setup.js
│   │   ├── 002-default-categories.js
│   │   ├── 003-default-templates.js
│   │   └── 004-create-indexes.js
│   ├── seed/                             # Database seeding
│   │   ├── seed-users.js
│   │   ├── seed-categories.js
│   │   ├── seed-templates.js
│   │   └── seed-preferences.js
│   └── utils/
│       ├── migration-runner.js
│       └── seed-runner.js
│
├── test/                                 # Test files
│   ├── unit/
│   │   ├── common/
│   │   ├── modules/
│   │   └── infrastructure/
│   ├── integration/
│   │   ├── database/
│   │   ├── api/
│   │   └── external/
│   ├── e2e/
│   │   ├── notification-flow.e2e-spec.ts
│   │   ├── device-token-flow.e2e-spec.ts
│   │   └── admin-flow.e2e-spec.ts
│   └── factories/
│       ├── notification.factory.ts
│       ├── device-token.factory.ts
│       ├── user.factory.ts
│       ├── announcement.factory.ts
│       └── test-data.builder.ts
│
├── infrastructure/                       # Infrastructure as Code
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── .env.example
│   ├── kubernetes/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml
│   │   └── ingress.yaml
│   └── coolify/
│       └── coolify.json
│
├── docs/                                 # Documentation
│   ├── architecture.md
│   ├── prd.md
│   ├── api/
│   │   └── openapi.yml
│   ├── deployment/
│   │   ├── setup.md
│   │   └── monitoring.md
│   └── development/
│       ├── getting-started.md
│       └── contributing.md
│
├── .env.example
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── package.json
├── bun.lockb
├── tsconfig.json
├── nest-cli.json
├── jest.config.js
├── create-all-indexes.js              # MongoDB index creation script
└── README.md
```

### Key Architectural Decisions in Source Tree:

**1. DDD + CQRS Structure:**

- Each subdomain has `application/`, `domain/`, `infrastructure/`, `interface/` layers
- Commands and Queries are clearly separated
- Domain logic is isolated in `domain/` layer

**2. NestJS Module Organization:**

- Root module imports all feature modules
- Each subdomain has its own module with clear boundaries
- Shared infrastructure is organized in `infrastructure/`

**3. Fastify Integration:**

- Configuration in `config/` module
- Fastify-specific adapters in `infrastructure/`

**4. Testing Structure:**

- Unit tests mirror source structure
- Integration tests for database and external services
- E2E tests for complete workflows
- Factories for test data generation

**5. Infrastructure as Code:**

- Docker configuration for development and production
- Kubernetes manifests for deployment
- Coolify configuration for deployment platform

---
