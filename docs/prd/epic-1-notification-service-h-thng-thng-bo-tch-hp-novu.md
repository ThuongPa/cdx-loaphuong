# Epic 1: Notification Service - Hệ thống thông báo tích hợp Novu

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
