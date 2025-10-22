# External APIs

Based on PRD analysis and component design, Notification Service needs to integrate with several external services. I will document each integration in detail.

### Novu Self-hosted API

- **Purpose:** Send push notifications, in-app notifications, and email notifications through Novu infrastructure
- **Documentation:** [Novu API Documentation](https://docs.novu.co/api-reference)
- **Base URL(s):** `{NOVU_API_URL}/v1` (self-hosted instance)
- **Authentication:** API Key authentication (`Authorization: ApiKey {NOVU_API_KEY}`)
- **Rate Limits:** Configurable in self-hosted setup (default: 1000 requests/minute)

**Key Endpoints Used:**

- `POST /subscribers` - Create new subscriber
- `PUT /subscribers/{subscriberId}` - Update subscriber
- `DELETE /subscribers/{subscriberId}` - Delete subscriber
- `POST /events/trigger` - Trigger notification workflow
- `GET /events/{eventId}` - Get delivery status
- `POST /workflows` - Create workflow template
- `GET /workflows` - Get list of workflows

**Integration Notes:**

- Use circuit breaker pattern to handle API failures
- Implement retry logic with exponential backoff
- Cache subscriber data to reduce API calls
- Support batch operations for high-volume notifications

### Auth Service API

- **Purpose:** Validate JWT tokens, query users by role, and sync user data
- **Documentation:** Internal service documentation (need confirmation with team)
- **Base URL(s):** `{AUTH_SERVICE_URL}/api/v1`
- **Authentication:** JWT token validation middleware
- **Rate Limits:** Internal service (no specific limits)

**Key Endpoints Used:**

- `GET /users/me` - Validate JWT token and get user info
- `GET /users/by-role?role={role}` - Query users by role
- `GET /users/{userId}` - Get user details
- `GET /users/batch` - Batch query multiple users
- `POST /users/sync` - Sync user data (webhook endpoint)

**Integration Notes:**

- Cache role data in Redis with TTL 10 minutes
- Implement fallback mechanism when Auth Service unavailable
- Use circuit breaker for resilience
- Support batch queries to optimize performance

### Firebase Cloud Messaging (FCM) API

- **Purpose:** Send push notifications to Android devices
- **Documentation:** [FCM REST API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- **Base URL(s):** `https://fcm.googleapis.com/fcm/send`
- **Authentication:** Server key authentication
- **Rate Limits:** 1000 requests/minute per project

**Key Endpoints Used:**

- `POST /fcm/send` - Send push notification to single device
- `POST /fcm/send` - Send push notification to multiple devices

**Integration Notes:**

- Handled through Novu integration (no direct integration)
- Novu will manage FCM tokens and delivery
- Only need to monitor delivery status from Novu

### Apple Push Notification Service (APNs) API

- **Purpose:** Send push notifications to iOS devices
- **Documentation:** [APNs HTTP/2 API](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)
- **Base URL(s):** `https://api.push.apple.com/3/device/{token}` (production)
- **Authentication:** JWT token with Apple Developer certificate
- **Rate Limits:** 1000 requests/minute per connection

**Key Endpoints Used:**

- `POST /3/device/{token}` - Send push notification to iOS device

**Integration Notes:**

- Handled through Novu integration (no direct integration)
- Novu will manage APNs certificates and delivery
- Only need to monitor delivery status from Novu

### SMTP Server API

- **Purpose:** Send email notifications
- **Documentation:** SMTP protocol standard
- **Base URL(s):** `{SMTP_HOST}:{SMTP_PORT}` (configurable)
- **Authentication:** Username/password authentication
- **Rate Limits:** Configurable in SMTP server setup

**Key Endpoints Used:**

- `SMTP` - Standard SMTP protocol for email sending

**Integration Notes:**

- Handled through Novu integration (no direct integration)
- Novu will manage SMTP configuration and delivery
- Support HTML and plain text email formats

---
