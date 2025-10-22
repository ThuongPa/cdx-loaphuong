# API Documentation

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
