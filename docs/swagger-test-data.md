# Sample Data cho Testing trên Swagger

## 1. Authentication

### Login Request

```json
{
  "identifier": "john.doe@example.com",
  "password": "password123"
}
```

### Login Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "roles": ["RESIDENT"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 2. Device Token Management

### Register Device Token

**Endpoint**: `POST /api/v1/device-tokens`

**Request Body**:

```json
{
  "token": "fcm_token_123456789abcdef",
  "platform": "android",
  "provider": "fcm",
  "deviceId": "device_123456",
  "deviceName": "Samsung Galaxy S21",
  "osVersion": "13",
  "appVersion": "1.2.3"
}
```

**Response**:

```json
{
  "id": "cuid_device_token_123",
  "userId": "user_123",
  "token": "fcm_token_123456789abcdef",
  "platform": "android",
  "provider": "fcm",
  "deviceId": "device_123456",
  "isActive": true,
  "lastUsedAt": null,
  "deviceName": "Samsung Galaxy S21",
  "osVersion": "13",
  "appVersion": "1.2.3",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Update Device Token

**Endpoint**: `PUT /api/v1/device-tokens/{id}`

**Request Body**:

```json
{
  "token": "fcm_token_updated_123456789",
  "isActive": true
}
```

### Get User Device Tokens

**Endpoint**: `GET /api/v1/device-tokens/me`

**Response**:

```json
[
  {
    "id": "cuid_device_token_123",
    "userId": "user_123",
    "token": "fcm_token_123456789abcdef",
    "platform": "android",
    "provider": "fcm",
    "deviceId": "device_123456",
    "isActive": true,
    "lastUsedAt": "2024-01-15T11:00:00Z",
    "deviceName": "Samsung Galaxy S21",
    "osVersion": "13",
    "appVersion": "1.2.3",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
]
```

## 3. User Preferences

### Get User Preferences

**Endpoint**: `GET /api/v1/preferences`

**Response**:

```json
{
  "success": true,
  "message": "Preferences retrieved successfully",
  "data": {
    "id": "pref_123",
    "userId": "user_123",
    "channelPreferences": {
      "push": true,
      "email": true,
      "inApp": false
    },
    "typePreferences": {
      "payment": true,
      "booking": true,
      "announcement": false,
      "emergency": true
    },
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "07:00",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Update User Preferences

**Endpoint**: `PUT /api/v1/preferences`

**Request Body**:

```json
{
  "channels": {
    "push": true,
    "email": false,
    "inApp": true
  },
  "types": {
    "payment": true,
    "booking": false,
    "announcement": true,
    "emergency": true
  },
  "quietHours": {
    "enabled": true,
    "startTime": "23:00",
    "endTime": "08:00",
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "id": "pref_123",
    "userId": "user_123",
    "channelPreferences": {
      "push": true,
      "email": false,
      "inApp": true
    },
    "typePreferences": {
      "payment": true,
      "booking": false,
      "announcement": true,
      "emergency": true
    },
    "quietHours": {
      "enabled": true,
      "startTime": "23:00",
      "endTime": "08:00",
      "timezone": "Asia/Ho_Chi_Minh"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:15:00Z"
  },
  "timestamp": "2024-01-15T11:15:00Z"
}
```

## 4. Category Management

### Create Category (Admin Only)

**Endpoint**: `POST /api/v1/categories`

**Request Body**:

```json
{
  "name": "Emergency Alerts",
  "description": "Critical notifications for emergency situations",
  "parentId": null,
  "metadata": {
    "icon": "alert-triangle",
    "color": "#ff4444",
    "priority": 1,
    "tags": ["emergency", "safety", "critical"]
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "cat_123",
    "name": "Emergency Alerts",
    "description": "Critical notifications for emergency situations",
    "parentId": null,
    "metadata": {
      "icon": "alert-triangle",
      "color": "#ff4444",
      "priority": 1,
      "tags": ["emergency", "safety", "critical"]
    },
    "isActive": true,
    "memberCount": 0,
    "createdBy": "admin_123",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Categories

**Endpoint**: `GET /api/v1/categories`

**Query Parameters**:

- `search`: "emergency"
- `isActive`: true
- `page`: 1
- `limit`: 10
- `sortBy`: "name"
- `sortOrder`: "asc"

**Response**:

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_123",
        "name": "Emergency Alerts",
        "description": "Critical notifications for emergency situations",
        "parentId": null,
        "metadata": {
          "icon": "alert-triangle",
          "color": "#ff4444",
          "priority": 1,
          "tags": ["emergency", "safety", "critical"]
        },
        "isActive": true,
        "memberCount": 5,
        "createdBy": "admin_123",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Add Member to Category

**Endpoint**: `POST /api/v1/categories/{categoryId}/members`

**Request Body**:

```json
{
  "userId": "user_123",
  "role": "member",
  "permissions": {
    "canReceiveNotifications": true,
    "canManageMembers": false
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "member_123",
    "categoryId": "cat_123",
    "userId": "user_123",
    "role": "member",
    "permissions": {
      "canReceiveNotifications": true,
      "canManageMembers": false
    },
    "joinedAt": "2024-01-15T10:30:00Z",
    "isActive": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 5. Health Check

### Get Health Status

**Endpoint**: `GET /health`

**Response**:

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "responseTime": "15ms"
    },
    "redis": {
      "status": "up",
      "responseTime": "2ms"
    },
    "rabbitmq": {
      "status": "up",
      "responseTime": "8ms"
    },
    "novu": {
      "status": "up",
      "responseTime": "120ms"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up",
      "responseTime": "15ms"
    },
    "redis": {
      "status": "up",
      "responseTime": "2ms"
    },
    "rabbitmq": {
      "status": "up",
      "responseTime": "8ms"
    },
    "novu": {
      "status": "up",
      "responseTime": "120ms"
    }
  }
}
```

## 6. Error Responses

### Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid request data",
  "details": [
    {
      "field": "token",
      "message": "Token is required"
    },
    {
      "field": "platform",
      "message": "Platform must be one of: android, ios, web"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Authentication Error

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Not Found Error

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Device token not found",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Server Error

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 7. Testing Scenarios

### Scenario 1: Complete User Registration Flow

1. **Login** với credentials hợp lệ
2. **Register Device Token** cho Android device
3. **Get User Preferences** để xem default settings
4. **Update Preferences** để customize notification settings
5. **Get Device Tokens** để verify registration

### Scenario 2: Admin Category Management

1. **Login** với admin account
2. **Create Category** cho emergency alerts
3. **Get Categories** để verify creation
4. **Add Member** vào category
5. **Update Category** metadata
6. **Delete Category** (nếu cần)

### Scenario 3: Error Handling

1. **Login** với invalid credentials
2. **Register Device Token** với invalid data
3. **Update Preferences** với invalid quiet hours
4. **Access Admin Endpoints** với non-admin user
5. **Get Non-existent Resources**

### Scenario 4: Performance Testing

1. **Concurrent Device Token Registration** (10+ requests)
2. **Bulk Category Creation** (5+ categories)
3. **High-frequency Preference Updates**
4. **Health Check under Load**

## 8. Headers Required

### Authentication Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Content Type

```
Content-Type: application/json
```

### Accept Header

```
Accept: application/json
```

## 9. Rate Limiting

### Rate Limits

- **Authentication**: 5 requests per minute
- **Device Token Operations**: 10 requests per minute
- **Preferences**: 20 requests per minute
- **Category Management**: 5 requests per minute (Admin only)

### Rate Limit Headers

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1642248600
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 10. Webhook Testing (for External Integrations)

### Novu Webhook Payload

```json
{
  "eventType": "notification.delivered",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "notificationId": "notif_123",
    "userId": "user_123",
    "channel": "push",
    "status": "delivered",
    "deliveredAt": "2024-01-15T10:30:05Z"
  }
}
```

### RabbitMQ Event Payload

```json
{
  "eventType": "auth.UserCreatedEvent",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "userData": {
      "userId": "user_123",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "phone": "+84123456789",
      "role": "RESIDENT",
      "apartment": "A101",
      "building": "Building A",
      "isActive": true
    }
  }
}
```
