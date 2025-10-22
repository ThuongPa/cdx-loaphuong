# Requirements

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
