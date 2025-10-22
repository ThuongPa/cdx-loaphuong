# REST API Spec

Based on requirements from PRD and component design, I will create OpenAPI 3.0 specification for all REST API endpoints of Notification Service.

```yaml
openapi: 3.0.0
info:
  title: Notification Service API
  version: 1.0.0
  description: |
    REST API for Notification Service - handles notifications from internal microservices,
    integrates with Novu self-hosted to send push notifications, in-app notifications,
    and email notifications with role-based permissions and comprehensive notification management.
  contact:
    name: Development Team
    email: dev@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://notification-service.example.com/api/v1
    description: Production server
  - url: https://staging-notification-service.example.com/api/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Development server

security:
  - BearerAuth: []

paths:
  # Device Token Management
  /device-tokens:
    post:
      tags:
        - Device Tokens
      summary: Register device token
      description: Register a new device token for push notifications
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterDeviceTokenRequest'
            example:
              token: 'fcm_token_example_12345'
              platform: 'android'
              deviceId: 'device_12345'
              provider: 'fcm'
      responses:
        '201':
          description: Device token registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeviceTokenResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '409':
          description: Device token already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

    get:
      tags:
        - Device Tokens
      summary: Get user device tokens
      description: Get all active device tokens for the current user
      responses:
        '200':
          description: List of device tokens
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/DeviceTokenResponse'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'

  /device-tokens/{id}:
    put:
      tags:
        - Device Tokens
      summary: Update device token
      description: Update an existing device token
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateDeviceTokenRequest'
      responses:
        '200':
          description: Device token updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeviceTokenResponse'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      tags:
        - Device Tokens
      summary: Delete device token
      description: Soft delete a device token
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      responses:
        '204':
          description: Device token deleted successfully
        '404':
          $ref: '#/components/responses/NotFound'

  # Notification History
  /notifications:
    get:
      tags:
        - Notifications
      summary: Get notification history
      description: Get paginated list of notifications for the current user
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: type
          in: query
          schema:
            type: string
            enum: [payment, booking, announcement, emergency]
        - name: channel
          in: query
          schema:
            type: string
            enum: [push, email, inApp]
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, sent, delivered, failed, read]
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: List of notifications
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/NotificationResponse'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'

  /notifications/{id}:
    get:
      tags:
        - Notifications
      summary: Get notification details
      description: Get detailed information about a specific notification
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      responses:
        '200':
          description: Notification details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationDetailResponse'
        '404':
          $ref: '#/components/responses/NotFound'

    patch:
      tags:
        - Notifications
      summary: Mark notification as read
      description: Mark a notification as read
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      responses:
        '200':
          description: Notification marked as read
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'

  /notifications/read-all:
    post:
      tags:
        - Notifications
      summary: Mark all notifications as read
      description: Mark all unread notifications as read for the current user
      responses:
        '200':
          description: All notifications marked as read
          content:
            application/json:
              schema:
                type: object
                properties:
                  updatedCount:
                    type: integer
                    description: Number of notifications marked as read

  /notifications/unread-count:
    get:
      tags:
        - Notifications
      summary: Get unread notification count
      description: Get the count of unread notifications for the current user
      responses:
        '200':
          description: Unread notification count
          content:
            application/json:
              schema:
                type: object
                properties:
                  unreadCount:
                    type: integer

  # User Preferences
  /preferences:
    get:
      tags:
        - Preferences
      summary: Get user notification preferences
      description: Get notification preferences for the current user
      responses:
        '200':
          description: User notification preferences
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserPreferencesResponse'

    put:
      tags:
        - Preferences
      summary: Update user notification preferences
      description: Update notification preferences for the current user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePreferencesRequest'
      responses:
        '200':
          description: Preferences updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserPreferencesResponse'

  # Admin APIs
  /admin/statistics:
    get:
      tags:
        - Admin
      summary: Get notification statistics
      description: Get comprehensive notification statistics for admin dashboard
      security:
        - AdminAuth: []
      parameters:
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: Notification statistics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationStatisticsResponse'

  /admin/broadcast:
    post:
      tags:
        - Admin
      summary: Send broadcast notification
      description: Send notification to multiple target groups
      security:
        - AdminAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BroadcastNotificationRequest'
      responses:
        '201':
          description: Broadcast notification sent successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BroadcastResponse'

  /admin/failed:
    get:
      tags:
        - Admin
      summary: Get failed notifications report
      description: Get paginated list of failed notifications
      security:
        - AdminAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: List of failed notifications
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/FailedNotificationResponse'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'

  /admin/notifications/{id}/retry:
    post:
      tags:
        - Admin
      summary: Manually retry failed notification
      description: Manually trigger retry for a failed notification
      security:
        - AdminAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      responses:
        '200':
          description: Notification retry triggered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'

  # Queue Monitoring
  /categories/queue-status:
    get:
      tags:
        - Queue Monitoring
      summary: Get queue status and metrics
      description: Get real-time queue performance metrics and status
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Queue status retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueueStatusResponse'
              example:
                queueLength: 150
                isProcessing: true
                circuitBreakerOpen: false
                metrics:
                  totalProcessed: 45230
                  totalFailed: 127
                  totalRetried: 89
                  successRate: 99.72
                  averageProcessingTime: 342
                priorityBreakdown:
                  urgent: 50
                  high: 70
                  medium: 20
                  low: 10
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # Health Check
  /health:
    get:
      tags:
        - Health
      summary: Health check
      description: Check service health and dependencies
      security: []
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'
        '503':
          description: Service is unhealthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    AdminAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # Device Token Schemas
    RegisterDeviceTokenRequest:
      type: object
      required:
        - token
        - platform
        - deviceId
        - provider
      properties:
        token:
          type: string
          description: FCM/APNS/Expo push token
          minLength: 1
          maxLength: 500
        platform:
          type: string
          enum: [ios, android, web]
          description: Device platform
        deviceId:
          type: string
          description: Unique device identifier
          minLength: 1
          maxLength: 100
        provider:
          type: string
          enum: [fcm, apns, expo]
          description: Push notification provider

    UpdateDeviceTokenRequest:
      type: object
      properties:
        token:
          type: string
          description: Updated push token
          minLength: 1
          maxLength: 500
        isActive:
          type: boolean
          description: Token active status

    DeviceTokenResponse:
      type: object
      properties:
        id:
          type: string
          format: cuid
        userId:
          type: string
          format: cuid
        token:
          type: string
        platform:
          type: string
        provider:
          type: string
        deviceId:
          type: string
        isActive:
          type: boolean
        lastUsedAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    # Notification Schemas
    NotificationResponse:
      type: object
      properties:
        id:
          type: string
          format: cuid
        title:
          type: string
        body:
          type: string
        type:
          type: string
          enum: [payment, booking, announcement, emergency]
        channel:
          type: string
          enum: [push, email, inApp]
        priority:
          type: string
          enum: [urgent, high, normal, low]
        status:
          type: string
          enum: [pending, sent, delivered, failed, read]
        data:
          type: object
          description: Additional notification data
        sentAt:
          type: string
          format: date-time
        deliveredAt:
          type: string
          format: date-time
        readAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time

    NotificationDetailResponse:
      allOf:
        - $ref: '#/components/schemas/NotificationResponse'
        - type: object
          properties:
            announcementId:
              type: string
              format: cuid
            errorDetails:
              type: string
              description: Error details if notification failed

    # User Preferences Schemas
    UserPreferencesResponse:
      type: object
      properties:
        id:
          type: string
          format: cuid
        userId:
          type: string
          format: cuid
        channels:
          type: object
          properties:
            push:
              type: boolean
            email:
              type: boolean
            inApp:
              type: boolean
        types:
          type: object
          properties:
            payment:
              type: boolean
            booking:
              type: boolean
            announcement:
              type: boolean
            emergency:
              type: boolean
        quietHours:
          type: object
          properties:
            enabled:
              type: boolean
            start:
              type: string
              format: time
            end:
              type: string
              format: time
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    UpdatePreferencesRequest:
      type: object
      properties:
        channels:
          type: object
          properties:
            push:
              type: boolean
            email:
              type: boolean
            inApp:
              type: boolean
        types:
          type: object
          properties:
            payment:
              type: boolean
            booking:
              type: boolean
            announcement:
              type: boolean
            emergency:
              type: boolean
        quietHours:
          type: object
          properties:
            enabled:
              type: boolean
            start:
              type: string
              format: time
            end:
              type: string
              format: time

    # Admin Schemas
    BroadcastNotificationRequest:
      type: object
      required:
        - title
        - body
        - targetRoles
        - channels
        - priority
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 200
        body:
          type: string
          minLength: 1
          maxLength: 1000
        targetRoles:
          type: array
          items:
            type: string
            enum: [admin, resident, staff, manager]
          minItems: 1
        targetUsers:
          type: array
          items:
            type: string
            format: cuid
          description: Optional specific user IDs
        channels:
          type: array
          items:
            type: string
            enum: [push, email, inApp]
          minItems: 1
        priority:
          type: string
          enum: [urgent, high, normal, low]
          default: normal
        data:
          type: object
          description: Additional notification data
        scheduledAt:
          type: string
          format: date-time
          description: Optional scheduled send time

    BroadcastResponse:
      type: object
      properties:
        id:
          type: string
          format: cuid
        announcementId:
          type: string
          format: cuid
        targetUserCount:
          type: integer
        scheduledAt:
          type: string
          format: date-time
        status:
          type: string
          enum: [scheduled, sent, failed]

    NotificationStatisticsResponse:
      type: object
      properties:
        totalNotifications:
          type: object
          properties:
            today:
              type: integer
            thisWeek:
              type: integer
            thisMonth:
              type: integer
        breakdownByChannel:
          type: object
          properties:
            push:
              type: integer
            email:
              type: integer
            inApp:
              type: integer
        breakdownByStatus:
          type: object
          properties:
            sent:
              type: integer
            failed:
              type: integer
            pending:
              type: integer
        deliveryRate:
          type: number
          format: float
          description: Delivery success rate percentage
        topNotificationTypes:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
              count:
                type: integer

    FailedNotificationResponse:
      type: object
      properties:
        id:
          type: string
          format: cuid
        userId:
          type: string
          format: cuid
        title:
          type: string
        type:
          type: string
        channel:
          type: string
        errorMessage:
          type: string
        retryCount:
          type: integer
        lastRetryAt:
          type: string
          format: date-time
        failedAt:
          type: string
          format: date-time

    # Common Schemas
    PaginationMeta:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrev:
          type: boolean

    QueueStatusResponse:
      type: object
      properties:
        queueLength:
          type: integer
          description: Number of pending notifications in queue
          minimum: 0
        isProcessing:
          type: boolean
          description: Whether queue is actively processing notifications
        circuitBreakerOpen:
          type: boolean
          description: Current state of the circuit breaker
        metrics:
          type: object
          properties:
            totalProcessed:
              type: integer
              description: Total notifications processed
            totalFailed:
              type: integer
              description: Total notifications failed
            totalRetried:
              type: integer
              description: Total notifications retried
            successRate:
              type: number
              format: float
              description: Percentage of successful notifications
            averageProcessingTime:
              type: integer
              description: Average time (ms) to process a notification
          required:
            - totalProcessed
            - totalFailed
            - totalRetried
            - successRate
            - averageProcessingTime
        priorityBreakdown:
          type: object
          description: Breakdown of notifications by priority level
          additionalProperties:
            type: integer
      required:
        - queueLength
        - isProcessing
        - circuitBreakerOpen
        - metrics
        - priorityBreakdown

    HealthResponse:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, unhealthy]
        timestamp:
          type: string
          format: date-time
        services:
          type: object
          properties:
            mongodb:
              type: string
              enum: [healthy, unhealthy]
            redis:
              type: string
              enum: [healthy, unhealthy]
            rabbitmq:
              type: string
              enum: [healthy, unhealthy]
            novu:
              type: string
              enum: [healthy, unhealthy]
            authService:
              type: string
              enum: [healthy, unhealthy]

    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        statusCode:
          type: integer
        timestamp:
          type: string
          format: date-time
        path:
          type: string

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: 'Bad Request'
            message: 'Validation failed'
            statusCode: 400
            timestamp: '2025-01-27T10:00:00Z'
            path: '/api/v1/device-tokens'

    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: 'Unauthorized'
            message: 'Invalid or missing JWT token'
            statusCode: 401
            timestamp: '2025-01-27T10:00:00Z'
            path: '/api/v1/notifications'

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            error: 'Not Found'
            message: 'Resource not found'
            statusCode: 404
            timestamp: '2025-01-27T10:00:00Z'
            path: '/api/v1/notifications/123'

tags:
  - name: Device Tokens
    description: Device token management for push notifications
  - name: Notifications
    description: Notification history and management
  - name: Preferences
    description: User notification preferences
  - name: Admin
    description: Admin APIs for notification management
  - name: Queue Monitoring
    description: Queue status and performance metrics
  - name: Health
    description: Health check endpoints
```

**API Endpoints Summary:**

- **Total Endpoints:** 30
- **Device Tokens:** 4 endpoints (register, get, update, delete)
- **Notifications:** 5 endpoints (history, details, mark read, mark all read, unread count)
- **Preferences:** 2 endpoints (get, update)
- **Admin:** 4 endpoints (statistics, broadcast, failed notifications, retry)
- **Queue Monitoring:** 1 endpoint (queue status)
- **Health:** 1 endpoint (health check)

---
