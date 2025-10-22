# Notification Service Brownfield Enhancement PRD

**Powered by BMAD™ Core**  
**Version:** 1.1  
**Date:** October 16, 2025  
**Status:** Draft

---

## Introduction

This document outlines the Product Requirements Document (PRD) for **Notification Service** - a new microservice to handle notifications from internal services in the Cư dân xã (Resident Management) system. The service will integrate with Novu self-hosted to send push notifications, in-app notifications, and email notifications with role-based permissions and comprehensive notification management.

**Relationship to Existing System:**
This service will integrate with the existing microservices ecosystem (Auth Service, RabbitMQ event system) and follow the established patterns from the cdx-qlnd and cdx-phananh services.

---

## Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source:** IDE-based fresh analysis

**Current Project State:**
The existing system is a microservices architecture with:

- **Microservices with NestJS** framework
- **Event-driven system** using RabbitMQ
- **Auth Service** managing authentication and authorization
- **App cư dân xã** - resident management system for residential communities

### Available Documentation Analysis

**Available Documentation:**

- ❌ Tech Stack Documentation (needs analysis from codebase)
- ❌ Source Tree/Architecture (needs analysis from codebase)
- ❌ Coding Standards (needs analysis from codebase)
- ❌ API Documentation (needs analysis from codebase)
- ❌ External API Documentation (needs analysis from codebase)
- ❌ UX/UI Guidelines (may not apply to service)
- ❌ Technical Debt Documentation (needs analysis from codebase)

**Recommendation:** Run the `document-project` task first to get detailed technical analysis of the existing system.

### Enhancement Scope Definition

**Enhancement Type:**

- ✅ New Feature Addition
- ✅ Integration with New Systems (Novu)

**Enhancement Description:**
Create a new microservice to handle notifications from internal services, integrating with Novu self-hosted to send push notifications, in-app notifications, and email notifications with role-based permissions through Auth Service.

**Impact Assessment:**

- ✅ Moderate Impact (some existing code changes)
- ✅ Significant Impact (substantial existing code changes)

### Goals and Background Context

**Goals:**

- Create centralized notification system for the entire Cư dân xã app ecosystem
- Integrate Novu to support diverse notification types (push, in-app, email)
- Implement role-based notification permissions
- Provide notification management and history tracking
- Ensure scalability and reliability for notification delivery

**Background Context:**
Currently, microservices in the Cư dân xã system lack a centralized notification system. Sending notifications to residents (such as payment notifications, booking confirmations, emergency alerts) needs to be handled consistently and manageably. The Notification Service will serve as the central hub for processing all notifications, ensuring delivery reliability and providing notification management capabilities for admins.

---

## Requirements

### Functional Requirements

**FR1**: Notification Service must listen to and process events from RabbitMQ of internal microservices (payment, booking, announcement, emergency, maintenance).

**FR2**: Service must connect and integrate with Novu self-hosted API to send push notifications, in-app notifications, and email notifications.

**FR3**: Service must integrate with Auth Service to validate user roles and permissions before sending notifications.

**FR4**: Service must support targeting notifications by role (admin, resident, staff, manager) through Auth Service.

**FR5**: Service must support targeting notifications by individual users or groups.

**FR6**: Service must store all notification records in database with complete metadata (sender, recipient, type, status, timestamp).

**FR7**: Service must provide REST API to query notification history by user, date range, and notification type.

**FR8**: Service must support user preferences for notification channels (users can enable/disable push, email, in-app).

**FR9**: Service must implement retry mechanism for failed notifications with exponential backoff.

**FR10**: Service must provide Admin API to manage notification templates and broadcast notifications.

**FR11**: Service must support notification priority levels (low, normal, high, urgent) to process in priority order.

**FR12**: Service must validate and sanitize notification content before sending to ensure security.

**FR13**: Service must provide API endpoint for mobile/web apps to register and manage push notification tokens for each user.

**FR14**: Service must store and manage push tokens with mapping to userId, device type (iOS/Android/Web), and device identifier.

**FR15**: Service must support multiple devices per user (one user can have multiple push tokens from different devices).

**FR16**: Service must automatically remove invalid/expired push tokens after Novu reports delivery errors.

**FR17**: Service must sync push tokens with Novu subscriber system to ensure delivery.

**FR18**: Service must implement priority queue system with multiple workers to process notifications in parallel based on priority levels.

**FR19**: Service must implement circuit breaker pattern for external service calls (Novu, Auth Service) to prevent cascading failures.

**FR20**: Service must support batch processing for high-volume notifications to optimize performance and reduce API calls.

**FR21**: Service must implement notification deduplication mechanism to prevent duplicate notifications within configurable time windows.

**FR22**: Service must support notification scheduling with timezone awareness and recurring patterns.

**FR23**: Service must provide real-time delivery status tracking and webhook notifications for delivery events.

**FR24**: Service must implement notification analytics and reporting with delivery metrics, engagement rates, and performance insights.

**FR25**: Service must support A/B testing for notification content and delivery strategies.

**FR26**: Service must implement notification templates with dynamic content and personalization variables.

**FR27**: Service must support notification channels with fallback strategies (e.g., push → email → SMS).

**FR28**: Service must implement notification throttling and rate limiting per user to prevent notification fatigue.

**FR29**: Service must support notification segmentation and targeting based on user behavior and preferences.

**FR30**: Service must implement notification lifecycle management with automatic cleanup and archival policies.

**FR31**: Service must implement Priority Queue Service with 5 concurrent workers processing notifications by priority (urgent → high → medium → low).

**FR32**: Service must implement Circuit Breaker pattern for Novu API with 10 consecutive failure threshold and 30-second auto-reset.

**FR33**: Service must implement Redis persistence for queue backup every 30 seconds to ensure zero data loss on service restart.

**FR34**: Service must implement retry mechanism with exponential backoff (1s → 2s → 4s) and maximum 3 attempts per notification.

**FR35**: Service must provide queue metrics API endpoint showing real-time queue status, processing rates, and circuit breaker state.

**FR36**: Service must listen to RabbitMQ user events (user.created, user.updated, user.deleted) from Auth Service.

**FR37**: Service must automatically create/update Novu subscribers when user events are received.

**FR38**: Service must handle user deletion events with GDPR compliance (soft delete, anonymization, device token cleanup).

**FR39**: Service must sync user profile changes (email, phone, name) with Novu subscriber data in real-time.

**FR40**: Service must support multiple push notification providers: FCM (Android/iOS/Web), APNS (iOS native), Expo (React Native).

**FR41**: Service must validate provider-specific token formats and store device metadata (deviceName, osVersion, appVersion).

**FR42**: Service must implement TTL cleanup for inactive devices after 180 days (increased from 90 days).

**FR43**: Service must provide real-time queue monitoring API with metrics: queue length, processing status, circuit breaker state, success rates.

**FR44**: Service must export Prometheus-compatible metrics at `/metrics` endpoint for monitoring dashboards.

**FR45**: Service must implement alert thresholds: queue length > 1000 (WARNING), > 5000 (CRITICAL), success rate < 95% (WARNING).

**FR46**: Service must provide queue status API endpoint showing real-time queue metrics and health status.

**FR47**: Service must support bulk operations for user notifications (bulk mark as read, bulk archive).

**FR48**: Service must provide detailed user notification statistics API with breakdown by type, priority, and time ranges.

**FR49**: Service must use Tedis client for TypeScript Redis operations with proper error handling.

**FR50**: Service must implement queue backup to Redis with 24-hour TTL and automatic cleanup.

**FR51**: Service must store queue metrics in Redis with 7-day TTL for historical analysis.

**FR52**: Service must provide complete Category CRUD APIs: create, read, update, delete categories with validation.

**FR53**: Service must support hierarchical category structure with parent-child relationships.

**FR54**: Service must provide category member management APIs: add members, remove members, list members with pagination.

**FR55**: Service must support category-based notification targeting (send to all members of a category).

**FR56**: Service must provide category statistics API showing member count, notification history, and engagement metrics.

**FR57**: Service must support bulk addition of members to categories (up to 1000 users per request).

**FR58**: Service must automatically track and update category member count when members are added/removed.

**FR59**: Service must store member metadata including source (manual/automatic), addedBy, and reason for membership.

**FR60**: Service must handle duplicate member additions gracefully (skip duplicates, not error).

**FR61**: Service must validate member status (only active users can be added to categories).

**FR62**: Service must support sending notifications to all members of a specific category.

**FR63**: Service must filter category members to only include active users for notifications.

**FR64**: Service must track notification history per category for analytics and reporting.

**FR65**: Service must provide category engagement metrics (open rates, click rates, response rates).

**FR66**: Service must implement category schema with metadata support (icon, color, priority, tags).

**FR67**: Service must enforce category naming conventions (unique names, max 100 characters).

**FR68**: Service must support category status management (active/inactive) to control notification delivery.

**FR69**: Service must validate category data before creation/update with proper error handling.

**FR70**: Service must support categoryId parameter in targeted notification APIs for category-based sending.

**FR71**: Service must include category member count in notification delivery statistics.

**FR72**: Service must support filtering notifications by category in user notification queries.

**FR73**: Service must support category-specific notification templates and content.

**FR74**: Service must implement Novu Subscriber Queue with Early ACK strategy for 10x faster RabbitMQ processing.

**FR75**: Service must provide 3 concurrent workers for Novu API operations (CREATE/UPDATE/DELETE subscribers).

**FR76**: Service must implement 5 retry attempts with exponential backoff (1s → 2s → 4s → 8s → 16s) for Novu API calls.

**FR77**: Service must provide dedicated queue monitoring API endpoint for Novu subscriber operations.

**FR78**: Service must implement ServicesModule for centralized service management and dependency injection.

**FR79**: Service must achieve 10-20 users/second throughput for user synchronization (10x improvement from 1-2 users/s).

**FR80**: Service must reduce RabbitMQ ACK time to 110ms (7-10x faster than blocking approach).

### Non-Functional Requirements

**NFR1**: Service must handle minimum 10,000 notifications/hour with average response time < 500ms.

**NFR2**: Service must ensure 99.9% uptime and have graceful degradation when Novu or Auth Service is down.

**NFR3**: Service must implement comprehensive logging with structured logs for monitoring and debugging.

**NFR4**: Service must have health check endpoints for Kubernetes/Docker orchestration.

**NFR5**: Service must implement rate limiting to prevent spam notifications.

**NFR6**: Notification data must be encrypted at rest and in transit (TLS/SSL).

**NFR7**: Service must follow coding standards and patterns of the existing NestJS system.

**NFR8**: Service must have unit tests with minimum 80% coverage and integration tests for critical flows.

**NFR9**: Service must support horizontal scaling to handle increased load.

**NFR10**: Service must have monitoring metrics (Prometheus/Grafana) for notification delivery rates, failure rates, and latency.

**NFR11**: Push token registration API must have authentication and only allow users to register tokens for themselves.

**NFR12**: Service must implement priority queue system with 5 parallel workers to achieve 10+ notifications/second throughput.

**NFR13**: Service must implement circuit breaker pattern for Novu API with automatic recovery after 10 consecutive failures.

**NFR14**: Service must support batch processing for high-volume notifications with configurable batch sizes.

**NFR15**: Service must implement exponential backoff retry strategy with jitter to prevent thundering herd problems.

**NFR16**: Service must provide real-time notification delivery status tracking and webhook support.

**NFR17**: Service must implement notification deduplication to prevent duplicate notifications within 5-minute windows.

**NFR18**: Service must support notification scheduling with timezone awareness and cron-like expressions.

**NFR19**: Service must implement notification analytics and reporting with delivery metrics, engagement rates, and performance dashboards.

**NFR20**: Service must support A/B testing for notification content and delivery strategies.

**NFR21**: Service must achieve 10+ notifications/second throughput with 5 concurrent workers (5x improvement from baseline).

**NFR22**: Service must maintain 99%+ notification success rate with retry mechanism and circuit breaker protection.

**NFR23**: Service must process notifications in batches of 10 per worker cycle for optimal performance.

**NFR24**: Service must implement graceful shutdown procedure with maximum 30-second timeout for in-flight tasks.

**NFR25**: Service must provide real-time queue metrics with sub-second latency for monitoring dashboards.

**NFR26**: Service must support Redis persistence with Tedis client for TypeScript compatibility and error handling.

**NFR27**: Service must implement circuit breaker with 10 consecutive failure threshold and 30-second auto-reset.

**NFR28**: Service must provide Prometheus metrics export at `/metrics` endpoint for monitoring integration.

**NFR29**: Service must support user event synchronization via RabbitMQ with idempotent processing.

**NFR30**: Service must handle multi-provider device tokens (FCM, APNS, Expo) with provider-specific validation.

**NFR31**: Service must implement category management with hierarchical structure and bulk member operations.

**NFR32**: Service must support category-based notification targeting with member count tracking.

**NFR33**: Service must provide comprehensive category analytics and engagement metrics.

**NFR34**: Service must implement Early ACK strategy for RabbitMQ events with 110ms ACK time (7-10x faster than blocking).

**NFR35**: Service must provide 3 concurrent workers for Novu subscriber operations with dedicated queue management.

**NFR36**: Service must implement 5 retry attempts with exponential backoff for Novu API resilience.

**NFR37**: Service must provide dedicated Novu subscriber queue monitoring with real-time metrics and circuit breaker status.

**NFR38**: Service must achieve 10-20 users/second throughput for user synchronization operations.

### Compatibility Requirements

**CR1: Existing Microservices Integration**: Service must be compatible with current RabbitMQ event schema of microservices without requiring breaking changes.

**CR2: Auth Service Integration**: Service must use existing Auth Service APIs for authentication and authorization, maintaining compatibility with token validation mechanism.

**CR3: Database Compatibility**: Service must use MongoDB 6.0+ with Mongoose ODM 8.0+ to maintain consistency with existing microservices architecture.

**CR4: Infrastructure Compatibility**: Service must be deployable in the current Kubernetes/Docker environment and comply with networking policies.

**CR5: API Versioning**: Service API must support versioning to ensure backward compatibility when updates occur.

**CR6: Mobile App Compatibility**: Push token registration API must be compatible with both iOS (APNs) and Android (FCM) push token formats.

**CR7: Priority Queue Compatibility**: Service must be compatible with existing RabbitMQ infrastructure and support priority-based message routing.

**CR8: Circuit Breaker Compatibility**: Service must integrate with existing monitoring and alerting systems for circuit breaker state changes.

**CR9: Batch Processing Compatibility**: Service must support existing event schemas and maintain backward compatibility with current microservices.

**CR10: Analytics Compatibility**: Service must integrate with existing analytics and reporting infrastructure for notification metrics.

**CR11: Scheduling Compatibility**: Service must support existing timezone configurations and scheduling patterns used by other services.

**CR12: A/B Testing Compatibility**: Service must integrate with existing feature flag and experimentation platforms.

**CR13: Priority Queue Compatibility**: Service must be compatible with existing RabbitMQ infrastructure and support priority-based message routing.

**CR14: Circuit Breaker Compatibility**: Service must integrate with existing monitoring and alerting systems for circuit breaker state changes.

**CR15: Redis Integration Compatibility**: Service must use Tedis client for TypeScript Redis operations and maintain compatibility with existing Redis infrastructure.

**CR16: User Event Compatibility**: Service must be compatible with existing Auth Service user event schemas and RabbitMQ routing patterns.

**CR17: Multi-Provider Device Token Compatibility**: Service must support existing FCM, APNS, and Expo token formats without breaking changes.

**CR18: Category Management Compatibility**: Service must integrate with existing user management systems and maintain backward compatibility.

**CR19: Queue Monitoring Compatibility**: Service must integrate with existing Prometheus/Grafana monitoring infrastructure.

**CR20: Graceful Shutdown Compatibility**: Service must be compatible with existing Kubernetes/Docker orchestration and health check systems.

**CR21: Novu Subscriber Queue Compatibility**: Service must integrate with existing RabbitMQ event processing and maintain backward compatibility with user synchronization.

**CR22: Early ACK Strategy Compatibility**: Service must be compatible with existing RabbitMQ acknowledgment patterns and event processing workflows.

**CR23: ServicesModule Compatibility**: Service must integrate with existing NestJS dependency injection and module architecture.

---

## Technical Constraints and Integration Requirements

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

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: **Single Epic** for Notification Service

**Rationale**:
Notification Service is a new microservice with a clear bounded context - notification management. Although it has multiple functions (push tokens, preferences, templates, Novu integration), they all serve the main purpose of sending and managing notifications. Organizing into a single epic helps:

- **Consistency**: Ensure all parts of the service are developed synchronously
- **Incremental Delivery**: Stories are arranged in priority order for incremental deployment
- **Clear Dependencies**: Easy to manage dependencies between stories
- **Brownfield Integration**: Focus on integration with existing system (RabbitMQ, Auth Service)

---

## Epic 1: Notification Service - Hệ thống thông báo tích hợp Novu

**Epic Goal**: Build Notification Service to handle notifications from internal microservices, integrate with Novu self-hosted to send push notifications, in-app notifications, and email notifications with role-based permissions and notification management.

**Integration Requirements**:

- Integrate with RabbitMQ to receive events from microservices
- Integrate with Novu self-hosted API to send notifications via multiple channels
- Integrate with Auth Service to validate roles and permissions
- Store notification history and user preferences in PostgreSQL
- Caching with Redis to optimize performance

---

### Story 1.1: Database Schema & Infrastructure Setup

**As a** Backend Developer,  
**I want** to set up database schema, Prisma ORM, and basic NestJS project structure,  
**So that** there's a foundation to develop notification service features.

#### Acceptance Criteria

1. **Database Schema**: Complete MongoDB collections with Mongoose schemas:
   - `users`: store user profile information synced from Auth Service
   - `device_tokens`: manage FCM/APNS device tokens for push notifications
   - `announcements`: store core notification content and metadata
   - `user_notifications`: user's personal notification inbox
   - `categories`: logical grouping for targeted notifications
   - `category_members`: many-to-many relationship between users and categories
   - Indexes created for performance-critical queries

2. **Project Structure**: NestJS project with DDD + CQRS structure:
   - Common utilities (decorators, guards, interceptors, pipes)
   - Config module for database, Redis, RabbitMQ, Novu
   - Infrastructure layer (Mongoose, Redis, RabbitMQ services)
   - Module structure for notification, device-token, preferences, categories, templates

3. **Development Environment**: Docker Compose setup with:
   - MongoDB database
   - Redis cache
   - RabbitMQ message broker
   - Novu self-hosted (optional for local dev)

4. **Health Checks**: `/health` endpoint returns status of all dependencies (DB, Redis, RabbitMQ, Novu)

5. **Testing Infrastructure**: Jest configuration with test factories and fixtures

#### Integration Verification

- IV1: MongoDB migrations run successfully and create all collections with proper indexes
- IV2: Development environment starts successfully with `docker-compose up`
- IV3: Health check endpoint returns healthy status for all services
- IV4: Test suite runs successfully with jest

**Estimated Effort**: 2 days  
**Priority**: P0 (Foundation)  
**Dependencies**: None

---

### Story 1.2: Novu Client Integration

**As a** Backend Developer,  
**I want** to integrate Novu client SDK and implement wrapper service,  
**So that** can send notifications via Novu API reliably.

#### Acceptance Criteria

1. **Novu Client Service**: NestJS service wrapper for Novu SDK:
   - Connection management with Novu self-hosted API
   - Subscriber management (create, update, get subscribers)
   - Workflow triggering for push, in-app, email
   - Error handling and retry logic
   - Circuit breaker pattern for Novu API calls

2. **Subscriber Sync**: Logic to sync users with Novu subscribers:
   - Create subscriber when user registers push token for first time
   - Update subscriber data (email, phone) from Auth Service
   - Manage subscriber preferences

3. **Workflow Configuration**: Setup Novu workflows:
   - Push notification workflow
   - In-app notification workflow
   - Email notification workflow
   - Template variables mapping

4. **Testing**: Unit tests for Novu client with mocked API responses

5. **Configuration**: Environment variables for Novu:
   - `NOVU_API_URL`
   - `NOVU_API_KEY`
   - `NOVU_APPLICATION_IDENTIFIER`

#### Integration Verification

- IV1: Novu client connects successfully with Novu self-hosted API
- IV2: Test subscriber creation and update successfully
- IV3: Test workflow trigger with mocked data successfully
- IV4: Circuit breaker works when Novu API is down (failover gracefully)

**Estimated Effort**: 2 days  
**Priority**: P0 (Core Integration)  
**Dependencies**: Story 1.1

---

### Story 1.3: RabbitMQ Event Consumer

**As a** Backend Developer,  
**I want** to implement RabbitMQ consumer to receive notification events from microservices,  
**So that** service can process and send notifications when events occur.

#### Acceptance Criteria

1. **RabbitMQ Consumer Service**: NestJS service to consume messages:
   - Subscribe to `notifications.exchange` topic exchange
   - Handle routing keys: `notification.{service}.{type}`
   - Message deserialization and validation
   - Acknowledgment and error handling
   - Dead letter queue for failed messages

2. **Event Handlers**: Handlers for different event types:
   - Payment events (`notification.payment.success`, `notification.payment.failed`)
   - Booking events (`notification.booking.confirmed`, `notification.booking.cancelled`)
   - Announcement events (`notification.announcement.new`)
   - Emergency events (`notification.emergency.alert`)

3. **Event Schema Validation**: Validate incoming events with defined schema:
   - Required fields: `eventType`, `userId`, `data`, `timestamp`
   - Optional fields: `targetRoles`, `targetUsers`, `priority`

4. **Retry Logic**: Exponential backoff retry for failed messages:
   - Max retries: 3
   - Backoff: 100ms, 500ms, 2000ms
   - Move to DLQ after max retries

5. **Monitoring**: Log all events with correlation IDs for tracing

#### Integration Verification

- IV1: Consumer connects successfully with RabbitMQ cluster
- IV2: Test event consumption with mock messages successfully
- IV3: DLQ receives failed messages after max retries
- IV4: Event handlers are triggered correctly for each routing key

**Estimated Effort**: 3 days  
**Priority**: P0 (Core Integration)  
**Dependencies**: Story 1.1

---

### Story 1.4: Device Token Registration API

**As a** Mobile/Web App Developer,  
**I want** API endpoints to register and manage device push notification tokens,  
**So that** users can receive push notifications on their devices.

#### Acceptance Criteria

1. **Device Token Registration Endpoint**: `POST /api/v1/device-tokens`
   - Authenticated endpoint (JWT required)
   - Request body: `{ token, platform, deviceId, provider }`
   - Validate token format (FCM for Android, APNs for iOS, Expo for React Native)
   - Check duplicate tokens (same user, same device, same platform)
   - Store token with user mapping in MongoDB
   - Sync token with Novu subscriber

2. **Token Update Endpoint**: `PUT /api/v1/device-tokens/:id`
   - Update existing token
   - Re-sync with Novu

3. **Token Deletion Endpoint**: `DELETE /api/v1/device-tokens/:id`
   - Soft delete token (mark as inactive)
   - Remove from Novu subscriber

4. **Get User Tokens**: `GET /api/v1/device-tokens/me`
   - Return all active tokens for current user
   - Include device info (platform, provider, last updated)

5. **Security**:
   - User can only manage tokens for themselves
   - Validate device ownership (deviceId binding)

6. **Auto Cleanup**: TTL index to auto-delete inactive tokens after 90 days

#### Integration Verification

- IV1: Device token registration API works with valid FCM, APNs, and Expo tokens
- IV2: Duplicate token detection prevents redundant entries
- IV3: Token is synced successfully with Novu subscribers
- IV4: User can only see and manage their own tokens

**Estimated Effort**: 2 days  
**Priority**: P0 (Required for Push Notifications)  
**Dependencies**: Story 1.1, Story 1.2

---

### Story 1.5: Notification Sending Logic (Core Domain)

**As a** Backend Developer,  
**I want** to implement core notification sending logic with domain models,  
**So that** service can process events and send notifications via Novu.

#### Acceptance Criteria

1. **Notification Aggregate**: Domain aggregate with business logic:
   - Create notification from event data
   - Validate notification data
   - Apply business rules (priority, targeting, channels)
   - Emit domain events (NotificationCreated, NotificationSent, NotificationFailed)

2. **Notification Processing Flow**:
   - Receive event from RabbitMQ consumer
   - Query target users from Auth Service (if targeting by role)
   - Get user tokens and preferences from database
   - Filter users based on preferences (opt-out handling)
   - Create notification records in database
   - Trigger Novu workflows for each channel (push, in-app, email)
   - Update notification status (sent, failed)

3. **Role-based Targeting**:
   - Query Auth Service API: `GET /users/by-role?role={role}`
   - Support multiple roles targeting
   - Support individual user targeting (userId array)

4. **Channel Selection Logic**:
   - Respect user preferences per channel type
   - Fallback logic if preferred channel fails
   - Parallel sending for multiple channels

5. **Priority Handling**:
   - URGENT: Send immediately, bypass preferences (emergency alerts)
   - HIGH: Send with high priority, respect critical preferences only
   - NORMAL: Standard processing
   - LOW: Can be batched or delayed

6. **Error Handling**:
   - Catch Novu API errors
   - Retry failed sends with exponential backoff
   - Log failures for monitoring

#### Integration Verification

- IV1: Events from RabbitMQ are processed and create notification records
- IV2: Role targeting queries Auth Service and gets correct users
- IV3: Notifications are sent via Novu to all target users
- IV4: User preferences are respected (users opt-out don't receive notifications)
- IV5: Failed notifications are retried and logged correctly

**Estimated Effort**: 4 days  
**Priority**: P0 (Core Business Logic)  
**Dependencies**: Story 1.2, Story 1.3, Story 1.4

---

### Story 1.6: Notification History & Query APIs

**As a** Resident/Staff User,  
**I want** APIs to view notification history and notification details,  
**So that** can review received notifications.

#### Acceptance Criteria

1. **Get Notification History**: `GET /api/v1/notifications`
   - Authenticated endpoint
   - Pagination support (page, limit)
   - Filter by: type, channel, status, date range
   - Sort by: createdAt (desc by default)
   - Return: notification list with metadata

2. **Get Notification Detail**: `GET /api/v1/notifications/:id`
   - Return full notification details
   - Include: title, body, data, channels, status, timestamps
   - Security: User can only view their own notifications

3. **Mark as Read**: `PATCH /api/v1/notifications/:id/read`
   - Update notification read status
   - Timestamp when read
   - Emit NotificationRead event

4. **Mark All as Read**: `POST /api/v1/notifications/read-all`
   - Bulk update all unread notifications
   - Return count of updated notifications

5. **Get Unread Count**: `GET /api/v1/notifications/unread-count`
   - Fast query for unread notification count
   - Cached in Redis for performance

6. **Performance Optimization**:
   - Cache recent notifications in Redis (TTL: 5 minutes)
   - Database indexes on userId, createdAt, status
   - Limit pagination to reasonable size (max 100 per page)

#### Integration Verification

- IV1: Notification history API returns correct data for authenticated user
- IV2: Filters and pagination work correctly
- IV3: Mark as read updates database and clears cache
- IV4: Unread count query returns accurate count with cache hit
- IV5: Users cannot access notifications of other users

**Estimated Effort**: 2 days  
**Priority**: P1 (User Experience)  
**Dependencies**: Story 1.5

---

### Story 1.7: User Notification Preferences

**As a** User,  
**I want** to configure notification preferences for each channel and notification type,  
**So that** only receive notifications I care about.

#### Acceptance Criteria

1. **Get Preferences**: `GET /api/v1/preferences`
   - Return user's notification preferences
   - Default preferences if not set
   - Structure: channel preferences and type preferences

2. **Update Preferences**: `PUT /api/v1/preferences`
   - Update notification preferences
   - Request body:
     ```json
     {
       "channels": {
         "push": true,
         "email": false,
         "inApp": true
       },
       "types": {
         "payment": true,
         "booking": true,
         "announcement": false,
         "emergency": true // Cannot be disabled
       }
     }
     ```
   - Validate: Emergency notifications cannot be disabled
   - Save to database
   - Clear cache

3. **Default Preferences**: Auto-create on first user registration:
   - All channels enabled by default
   - All notification types enabled by default
   - Emergency always enabled (enforced)

4. **Preference Enforcement**: Update notification sending logic:
   - Check user preferences before sending
   - Skip channels user has disabled
   - Skip notification types user has disabled
   - Always send URGENT priority notifications (emergency override)

5. **Cache Strategy**:
   - Cache preferences in Redis (TTL: 10 minutes)
   - Invalidate cache on update
   - Batch query for multiple users

#### Integration Verification

- IV1: Default preferences are created for new users
- IV2: Preference updates are saved and cached correctly
- IV3: Notification sending respects user preferences (skips disabled channels/types)
- IV4: Emergency notifications bypass preferences and are still sent
- IV5: Cache invalidation works when preferences are updated

**Estimated Effort**: 2 days  
**Priority**: P1 (User Control)  
**Dependencies**: Story 1.5

---

### Story 1.8: Notification Templates Management

**As a** Admin,  
**I want** to manage notification templates with variables and i18n support,  
**So that** notifications have consistent format and are easy to maintain.

#### Acceptance Criteria

1. **Template Model**: Database model for templates:
   - `name`: Template identifier
   - `type`: Notification type
   - `channel`: Target channel (push, email, in-app)
   - `subject`: Template subject (for email)
   - `body`: Template body with variables `{{variable}}`
   - `language`: i18n support (vi, en)
   - `isActive`: Enable/disable template

2. **Admin Template APIs**:
   - `GET /api/v1/admin/templates` - List all templates
   - `POST /api/v1/admin/templates` - Create new template
   - `PUT /api/v1/admin/templates/:id` - Update template
   - `DELETE /api/v1/admin/templates/:id` - Delete template (soft delete)

3. **Template Rendering**: Service to render templates:
   - Variable substitution: `{{userName}}` → actual value
   - Fallback to default language if translation missing
   - HTML sanitization for email templates
   - Preview functionality

4. **Template Seeding**: Prisma seed script with default templates:
   - Payment success/failed templates
   - Booking confirmation/cancellation templates
   - Announcement templates
   - Emergency alert templates

5. **Integration with Notification Sending**:
   - Query appropriate template based on notification type
   - Render template with event data
   - Pass rendered content to Novu

6. **Security**:
   - Only ADMIN role can manage templates
   - Validate template syntax before saving
   - Prevent XSS in templates

#### Integration Verification

- IV1: Default templates are seeded into database
- IV2: Admin APIs work with proper RBAC
- IV3: Template rendering substitutes variables correctly
- IV4: Notifications use rendered templates when sending via Novu
- IV5: Invalid template syntax is rejected when create/update

**Estimated Effort**: 3 days  
**Priority**: P1 (Content Management)  
**Dependencies**: Story 1.5

---

### Story 1.9: Retry & Error Handling

**As a** Backend Developer,  
**I want** robust retry mechanism and error handling for failed notifications,  
**So that** ensure notification delivery reliability.

#### Acceptance Criteria

1. **Retry Worker**: Background worker to retry failed notifications:
   - Query notifications with status = FAILED
   - Filter by retry count < MAX_RETRIES (3)
   - Exponential backoff: 1min, 5min, 15min
   - Update retry attempt count
   - Re-trigger Novu workflow

2. **Error Classification**:
   - **Retryable errors**: Network timeout, Novu 5xx, rate limit
   - **Non-retryable errors**: Invalid token, Novu 4xx (except 429), validation errors
   - Different handling for each error type

3. **Dead Letter Queue**:
   - Move to DLQ after max retries exceeded
   - Log detailed error information
   - Admin API to view and manually retry DLQ items

4. **Circuit Breaker Implementation**:
   - Track Novu API failure rate
   - Open circuit after 5 consecutive failures
   - Half-open test after 30 seconds
   - Auto-close on success

5. **Token Cleanup**: Auto-invalidate push tokens:
   - When Novu reports "InvalidToken" error
   - Mark token as inactive in database
   - Remove from Novu subscriber

6. **Monitoring & Alerts**:
   - Log all failures with correlation IDs
   - Metrics: failure rate, retry success rate
   - Alert when failure rate > 5%

#### Integration Verification

- IV1: Failed notifications are automatically retried with backoff
- IV2: Non-retryable errors are not retried (moved to DLQ)
- IV3: Circuit breaker opens when Novu API has consecutive failures
- IV4: Invalid push tokens are auto-cleaned up
- IV5: DLQ admin API allows manual retry

**Estimated Effort**: 3 days  
**Priority**: P0 (Reliability)  
**Dependencies**: Story 1.5

---

### Story 1.10: Admin Dashboard APIs & Broadcast

**As a** Admin,  
**I want** APIs to view notification statistics and broadcast notifications to groups,  
**So that** can monitor system and send announcements.

#### Acceptance Criteria

1. **Notification Statistics**: `GET /api/v1/admin/statistics`
   - Total notifications sent (today, this week, this month)
   - Breakdown by channel (push, email, in-app)
   - Breakdown by status (sent, failed, pending)
   - Delivery rate percentage
   - Top notification types
   - Failed notification reasons

2. **Broadcast Notification**: `POST /api/v1/admin/broadcast`
   - Send notification to multiple target groups
   - Request body:
     ```json
     {
       "title": "Announcement title",
       "body": "Announcement body",
       "targetRoles": ["resident", "staff"],
       "targetUsers": ["user1", "user2"], // Optional specific users
       "channels": ["push", "email", "inApp"],
       "priority": "HIGH",
       "scheduledAt": "2025-10-20T10:00:00Z" // Optional
     }
     ```
   - Validate admin role
   - Query target users from Auth Service
   - Create notification records
   - Trigger sending logic

3. **Scheduled Broadcasts**:
   - Support scheduled notifications (send at specific time)
   - Background job to check and send scheduled notifications
   - Cancel scheduled notification API

4. **Failed Notifications Report**: `GET /api/v1/admin/failed`
   - List failed notifications with pagination
   - Filter by: date range, error type, notification type
   - Include: error details, retry attempts, user info
   - Export to CSV functionality

5. **Manual Retry**: `POST /api/v1/admin/notifications/:id/retry`
   - Admin can manually trigger retry for failed notification
   - Bypass retry count limit
   - Log manual retry action

6. **Security & RBAC**:
   - All admin APIs require ADMIN role
   - Audit log for broadcast actions
   - Rate limiting for broadcast API (prevent abuse)

#### Integration Verification

- IV1: Statistics API returns accurate data from database
- IV2: Broadcast API sends successfully to all target users
- IV3: Scheduled broadcasts are sent at correct time
- IV4: Failed notifications report shows detailed error information
- IV5: Manual retry bypasses automatic retry limits

**Estimated Effort**: 3 days  
**Priority**: P1 (Admin Tools)  
**Dependencies**: Story 1.5, Story 1.8, Story 1.9

---

### Story 1.11: Testing, Documentation & Deployment

**As a** Development Team,  
**I want** comprehensive tests, API documentation, and deployment configuration,  
**So that** service has quality assurance and is ready for production.

#### Acceptance Criteria

1. **Unit Tests**:
   - Test coverage > 80% overall
   - Domain layer coverage > 90%
   - All aggregates, entities, value objects tested
   - All command/query handlers tested
   - Mock external dependencies (Novu, Auth Service, RabbitMQ)

2. **Integration Tests**:
   - Repository tests with Testcontainers MongoDB
   - RabbitMQ consumer tests with in-memory broker
   - Novu client tests with mocked API
   - Redis cache tests

3. **E2E Tests**:
   - Full notification flow from RabbitMQ event to Novu delivery
   - Device token registration flow
   - Notification history query flow
   - Broadcast notification flow
   - Retry mechanism flow

4. **API Documentation**:
   - Swagger/OpenAPI spec for all endpoints
   - Request/response examples
   - Authentication requirements
   - Error codes documentation

5. **Deployment Configuration**:
   - Dockerfile multi-stage build
   - Docker Compose for local development
   - Coolify configuration file
   - Environment variables documentation
   - MongoDB migration scripts

6. **Monitoring Setup**:
   - Prometheus metrics endpoints
   - Health check endpoints
   - Grafana dashboard configuration
   - Log aggregation setup

#### Integration Verification

- IV1: All tests pass with coverage thresholds met
- IV2: Docker build succeeds and container starts healthy
- IV3: Swagger UI accessible and has complete documentation
- IV4: Deployment to Coolify staging succeeds
- IV5: Monitoring dashboards show metrics correctly

**Estimated Effort**: 3 days  
**Priority**: P0 (Quality Assurance)  
**Dependencies**: All previous stories

---

## Story Summary

| Story | Title                                    | Effort | Priority | Status  |
| ----- | ---------------------------------------- | ------ | -------- | ------- |
| 1.1   | Database Schema & Infrastructure Setup   | 2 days | P0       | Pending |
| 1.2   | Novu Client Integration                  | 2 days | P0       | Pending |
| 1.3   | RabbitMQ Event Consumer                  | 3 days | P0       | Pending |
| 1.4   | Device Token Registration API            | 2 days | P0       | Pending |
| 1.5   | Notification Sending Logic (Core Domain) | 4 days | P0       | Pending |
| 1.6   | Notification History & Query APIs        | 2 days | P1       | Pending |
| 1.7   | User Notification Preferences            | 2 days | P1       | Pending |
| 1.8   | Notification Templates Management        | 3 days | P1       | Pending |
| 1.9   | Retry & Error Handling                   | 3 days | P0       | Pending |
| 1.10  | Admin Dashboard APIs & Broadcast         | 3 days | P1       | Pending |
| 1.11  | Testing, Documentation & Deployment      | 3 days | P0       | Pending |

**Total Estimated Effort**: 29 days (~6 weeks with 1 developer)

---

### Story 1.12: Priority Queue System Implementation

**As a** Backend Developer,  
**I want** to implement priority queue system with 5 parallel workers,  
**So that** can achieve 10+ notifications/second throughput and process notifications by priority.

#### Acceptance Criteria

1. **Priority Queue Infrastructure**:
   - Implement 5 parallel workers for different priority levels
   - URGENT: 1 worker (immediate processing)
   - HIGH: 2 workers (high priority processing)
   - NORMAL: 2 workers (standard processing)
   - LOW: 1 worker (batch processing)

2. **Queue Management**:
   - Priority-based message routing in RabbitMQ
   - Queue configuration for each priority level
   - Worker pool management with automatic scaling
   - Dead letter queue for failed priority messages

3. **Performance Optimization**:
   - Achieve 10+ notifications/second throughput
   - Batch processing for LOW priority notifications
   - Connection pooling for external API calls
   - Memory-efficient message processing

4. **Monitoring & Metrics**:
   - Queue depth monitoring for each priority level
   - Worker utilization metrics
   - Processing time per priority level
   - Throughput metrics and alerts

5. **Configuration**:
   - Configurable worker counts per priority
   - Configurable batch sizes for LOW priority
   - Configurable processing timeouts
   - Environment-based queue configuration

#### Integration Verification

- IV1: Priority queue system processes notifications in correct priority order
- IV2: System achieves 10+ notifications/second throughput under load
- IV3: Workers automatically scale based on queue depth
- IV4: Failed messages are properly routed to dead letter queues
- IV5: Monitoring metrics show accurate queue and worker status

**Estimated Effort**: 3 days  
**Priority**: P0 (Performance Critical)  
**Dependencies**: Story 1.3, Story 1.5

---

### Story 1.13: Circuit Breaker Pattern Implementation

**As a** Backend Developer,  
**I want** to implement circuit breaker pattern for external service calls,  
**So that** prevent cascading failures and ensure system resilience.

#### Acceptance Criteria

1. **Circuit Breaker Service**:
   - Implement circuit breaker for Novu API calls
   - Implement circuit breaker for Auth Service calls
   - Configurable failure thresholds and timeouts
   - Automatic recovery and health check integration

2. **Failure Detection**:
   - Track consecutive failures for each external service
   - Open circuit after 10 consecutive failures
   - Half-open state for testing recovery
   - Auto-close circuit on successful calls

3. **Fallback Mechanisms**:
   - Graceful degradation when circuits are open
   - Queue notifications for later processing
   - Cached responses for Auth Service calls
   - Alternative notification channels when available

4. **Monitoring & Alerts**:
   - Circuit state monitoring and logging
   - Alert when circuits open/close
   - Failure rate tracking and reporting
   - Integration with existing monitoring systems

5. **Configuration**:
   - Configurable failure thresholds per service
   - Configurable timeout periods
   - Configurable retry intervals
   - Environment-based circuit breaker settings

#### Integration Verification

- IV1: Circuit breaker opens after configured failure threshold
- IV2: Fallback mechanisms work when circuits are open
- IV3: Circuit automatically recovers when external service is healthy
- IV4: Monitoring alerts are triggered on circuit state changes
- IV5: System continues to function gracefully during external service outages

**Estimated Effort**: 2 days  
**Priority**: P0 (Reliability Critical)  
**Dependencies**: Story 1.2, Story 1.5

---

### Story 1.14: Batch Processing & Deduplication

**As a** Backend Developer,  
**I want** to implement batch processing and notification deduplication,  
**So that** optimize performance and prevent duplicate notifications.

#### Acceptance Criteria

1. **Batch Processing System**:
   - Configurable batch sizes for different notification types
   - Batch processing for LOW priority notifications
   - Parallel batch processing for multiple channels
   - Batch API calls to Novu for efficiency

2. **Notification Deduplication**:
   - Prevent duplicate notifications within 5-minute windows
   - Content-based deduplication using hash comparison
   - User-based deduplication for same notification type
   - Configurable deduplication time windows

3. **Performance Optimization**:
   - Reduce API calls through batching
   - Optimize database queries for batch operations
   - Memory-efficient batch processing
   - Connection pooling for batch operations

4. **Monitoring & Metrics**:
   - Batch processing performance metrics
   - Deduplication effectiveness tracking
   - API call reduction metrics
   - Processing time improvements

5. **Configuration**:
   - Configurable batch sizes per notification type
   - Configurable deduplication windows
   - Configurable batch processing intervals
   - Environment-based batch settings

#### Integration Verification

- IV1: Batch processing reduces API calls and improves performance
- IV2: Deduplication prevents duplicate notifications within time windows
- IV3: System handles large volumes of notifications efficiently
- IV4: Monitoring shows improved performance metrics
- IV5: Configuration changes take effect without service restart

**Estimated Effort**: 2 days  
**Priority**: P1 (Performance Enhancement)  
**Dependencies**: Story 1.5, Story 1.12

---

### Story 1.15: Real-time Analytics & Reporting

**As a** Admin,  
**I want** real-time analytics and reporting for notification performance,  
**So that** can monitor system health and optimize notification strategies.

#### Acceptance Criteria

1. **Analytics Dashboard**:
   - Real-time notification delivery metrics
   - Engagement rates and user behavior analytics
   - Performance dashboards with key metrics
   - Historical data analysis and trends

2. **Reporting APIs**:
   - REST APIs for analytics data
   - Export functionality (CSV, JSON)
   - Custom date range filtering
   - Real-time data streaming capabilities

3. **Key Metrics Tracking**:
   - Delivery rates by channel and notification type
   - User engagement and interaction rates
   - System performance and throughput metrics
   - Error rates and failure analysis

4. **Visualization**:
   - Grafana dashboards for key metrics
   - Real-time charts and graphs
   - Alerting based on metric thresholds
   - Custom dashboard creation

5. **Data Storage**:
   - Time-series data storage for metrics
   - Efficient data aggregation and querying
   - Data retention policies
   - Backup and archival strategies

#### Integration Verification

- IV1: Analytics dashboard shows real-time notification metrics
- IV2: Reporting APIs return accurate data with proper filtering
- IV3: Grafana dashboards display metrics correctly
- IV4: Alerting works based on configured thresholds
- IV5: Data export functionality works for all supported formats

**Estimated Effort**: 3 days  
**Priority**: P1 (Monitoring & Analytics)  
**Dependencies**: Story 1.5, Story 1.9

---

### Story 1.16: A/B Testing Framework

**As a** Admin,  
**I want** A/B testing framework for notification content and delivery strategies,  
**So that** can optimize notification effectiveness and user engagement.

#### Acceptance Criteria

1. **A/B Testing Infrastructure**:
   - Framework for creating and managing A/B tests
   - User segmentation and randomization
   - Test configuration and management
   - Results tracking and analysis

2. **Content Variations**:
   - Support for multiple notification content versions
   - Template-based content variations
   - Dynamic content personalization
   - Content performance comparison

3. **Delivery Strategy Testing**:
   - Test different delivery channels
   - Test different timing strategies
   - Test different frequency patterns
   - Test different priority levels

4. **Results Analysis**:
   - Statistical significance testing
   - Performance metrics comparison
   - User behavior analysis
   - Conversion rate tracking

5. **Integration**:
   - Integration with existing analytics system
   - Integration with notification sending logic
   - Integration with user preference system
   - Integration with admin dashboard

#### Integration Verification

- IV1: A/B tests can be created and configured through admin interface
- IV2: Users are properly segmented and randomized for tests
- IV3: Different content variations are delivered to test groups
- IV4: Results are accurately tracked and analyzed
- IV5: Statistical significance is properly calculated

**Estimated Effort**: 4 days  
**Priority**: P2 (Advanced Features)  
**Dependencies**: Story 1.5, Story 1.15

---

## Updated Story Summary

| Story | Title                                    | Effort | Priority | Status  |
| ----- | ---------------------------------------- | ------ | -------- | ------- |
| 1.1   | Database Schema & Infrastructure Setup   | 2 days | P0       | Pending |
| 1.2   | Novu Client Integration                  | 2 days | P0       | Pending |
| 1.3   | RabbitMQ Event Consumer                  | 3 days | P0       | Pending |
| 1.4   | Device Token Registration API            | 2 days | P0       | Pending |
| 1.5   | Notification Sending Logic (Core Domain) | 4 days | P0       | Pending |
| 1.6   | Notification History & Query APIs        | 2 days | P1       | Pending |
| 1.7   | User Notification Preferences            | 2 days | P1       | Pending |
| 1.8   | Notification Templates Management        | 3 days | P1       | Pending |
| 1.9   | Retry & Error Handling                   | 3 days | P0       | Pending |
| 1.10  | Admin Dashboard APIs & Broadcast         | 3 days | P1       | Pending |
| 1.11  | Testing, Documentation & Deployment      | 3 days | P0       | Pending |
| 1.12  | Priority Queue System Implementation     | 3 days | P0       | Pending |
| 1.13  | Circuit Breaker Pattern Implementation   | 2 days | P0       | Pending |
| 1.14  | Batch Processing & Deduplication         | 2 days | P1       | Pending |
| 1.15  | Real-time Analytics & Reporting          | 3 days | P1       | Pending |
| 1.16  | A/B Testing Framework                    | 4 days | P2       | Pending |

**Total Estimated Effort**: 42 days (~8.5 weeks with 1 developer)

---

## API Documentation

### Core API Endpoints

#### 1. Broadcast APIs

- `POST /api/v1/broadcast/system` - Send system-wide broadcast
- `GET /api/v1/broadcast/system/:id/status` - Get broadcast delivery status

#### 2. Targeted Notification APIs

- `POST /api/v1/notifications/targeted` - Send notification to specific users
- `GET /api/v1/notifications/targeted/:id/stats` - Get notification statistics

#### 3. User Notification APIs

- `GET /api/v1/user-notifications/me` - Get user's notification inbox
- `GET /api/v1/user-notifications/:id` - Get notification details
- `GET /api/v1/user-notifications/me/unread-count` - Get unread count
- `GET /api/v1/user-notifications/me/statistics` - Get user statistics
- `PATCH /api/v1/user-notifications/:id/read` - Mark notification as read
- `POST /api/v1/user-notifications/bulk/read` - Bulk mark as read
- `POST /api/v1/user-notifications/all/read` - Mark all as read
- `PATCH /api/v1/user-notifications/:id/archive` - Archive notification
- `DELETE /api/v1/user-notifications/:id` - Delete notification

#### 4. Device Token APIs

- `POST /api/v1/novu/devices/register` - Register device token (FCM/APNS/Expo)
- `GET /api/v1/novu/devices/user/:userId` - Get user's devices
- `GET /api/v1/novu/devices/user/:userId/has-devices` - Check if user has devices
- `DELETE /api/v1/novu/devices/remove` - Remove device token
- `DELETE /api/v1/novu/devices/user/:userId/all` - Remove all user devices

#### 5. Category Management APIs

- `POST /api/v1/categories` - Create category
- `GET /api/v1/categories` - List categories (pagination)
- `GET /api/v1/categories/tree` - Get hierarchical category tree
- `GET /api/v1/categories/:id` - Get category details
- `PUT /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category
- `GET /api/v1/categories/:id/children` - Get child categories
- `GET /api/v1/categories/:id/announcements` - Get category notifications
- `GET /api/v1/categories/stats/overview` - Get category statistics

#### 6. Category Member APIs

- `POST /api/v1/categories/:id/members` - Add members to category
- `GET /api/v1/categories/:id/members` - Get category members (pagination)
- `DELETE /api/v1/categories/:id/members/:userId` - Remove member from category
- `GET /api/v1/categories/:id/members/count` - Get member count

#### 7. Queue Monitoring APIs

- `GET /api/v1/categories/queue-status` - Get real-time queue metrics
- `GET /api/v1/categories/queue/novu-subscriber/status` - Get Novu subscriber queue status
- `GET /metrics` - Prometheus metrics export

### API Request/Response Examples

#### Send System Broadcast

```json
POST /api/v1/broadcast/system
{
  "title": "🎉 Flash Sale: 50% OFF!",
  "body": "Limited time offer. Shop now and save big!",
  "priority": "high",
  "channels": ["in-app", "push"],
  "payload": {
    "campaignId": "FLASH_SALE_2025",
    "discountPercent": 50
  },
  "deepLink": "myapp://promotions/flash-sale",
  "imageUrl": "https://cdn.example.com/banners/flash-sale.jpg"
}
```

#### Register Device Token

```json
POST /api/v1/novu/devices/register
{
  "token": "fY8Nz3xRQkC9vH2wB1pL4mT6qX0jK5nF",
  "deviceId": "iPhone14_ABC123",
  "platform": "ios",
  "provider": "apns",
  "metadata": {
    "deviceName": "iPhone 14 Pro",
    "osVersion": "iOS 17.1",
    "appVersion": "2.5.0"
  }
}
```

#### Create Category

```json
POST /api/v1/categories
{
  "name": "VIP_CUSTOMERS",
  "description": "High-value customers with purchases > 10M VND",
  "metadata": {
    "icon": "👑",
    "color": "#FFD700",
    "priority": 10,
    "tags": ["vip", "high-value"]
  }
}
```

#### Queue Status Response

```json
GET /api/v1/categories/queue-status
{
  "queueLength": 150,
  "isProcessing": true,
  "circuitBreakerOpen": false,
  "metrics": {
    "totalProcessed": 45230,
    "totalFailed": 127,
    "totalRetried": 89,
    "successRate": 99.72,
    "averageProcessingTime": 342
  },
  "priorityBreakdown": {
    "urgent": 5,
    "high": 23,
    "medium": 87,
    "low": 35
  },
  "lastProcessedAt": "2025-10-15T10:30:45Z"
}
```

#### Novu Subscriber Queue Status Response

```json
GET /api/v1/categories/queue/novu-subscriber/status
{
  "queueLength": 5,
  "processing": true,
  "processingCount": 2,
  "concurrency": 3,
  "circuitBreakerOpen": false,
  "novuFailureCount": 0,
  "metrics": {
    "totalProcessed": 1245,
    "totalFailed": 12,
    "totalRetried": 38,
    "averageProcessingTime": 650.3,
    "successRate": "99.04%",
    "createCount": 800,
    "updateCount": 320,
    "deleteCount": 125,
    "lastProcessedAt": "2025-10-20T10:30:00Z"
  },
  "nextTasks": [
    {
      "id": "novu_1729425000_abc123",
      "type": "create",
      "userId": "user_123",
      "attempts": 0,
      "createdAt": "2025-10-20T10:25:00Z"
    }
  ]
}
```

### Authentication & Authorization

All API endpoints require JWT authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

**Role-based Access:**

- **Admin**: Full access to all endpoints
- **Operator**: Access to notification and category management
- **Reader**: Read-only access to monitoring and statistics
- **User**: Access to personal notification endpoints only

### Rate Limiting

| Endpoint Type       | Limit        | Window   |
| ------------------- | ------------ | -------- |
| General API         | 500 requests | 1 minute |
| Broadcast           | 10 requests  | 1 hour   |
| Device Registration | 20 requests  | 1 minute |
| Read/Archive        | 100 requests | 1 minute |

---

## Change Log

| Change         | Date       | Version | Description                                                             | Author |
| -------------- | ---------- | ------- | ----------------------------------------------------------------------- | ------ |
| Initial PRD    | 2025-10-16 | 1.0     | Created comprehensive PRD for Notification Service                      | PM     |
| Enhanced PRD   | 2025-10-16 | 1.1     | Added advanced features from Announcement Service analysis              | PM     |
| Complete PRD   | 2025-10-16 | 2.0     | Added Priority Queue, User Sync, Category Management, API Documentation | PM     |
| Novu Queue PRD | 2025-10-20 | 2.1     | Added Novu Subscriber Queue, Early ACK Strategy, ServicesModule         | PM     |

---

**Document Status**: ✅ **Complete - Ready for Development**  
**Next Phase**: Architecture design and development sprint planning  
**PRD Version**: 2.1  
**Last Updated**: October 20, 2025
