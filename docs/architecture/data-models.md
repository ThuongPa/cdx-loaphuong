# Data Models

Based on PRD analysis, I have identified the core data models for Notification Service. Each model is designed to support notification management, user preferences, and integration with existing system.

### User Model

**Purpose:** Store user information synced from Auth Service to support notification targeting and personalization.

**Key Attributes:**

- `id`: string - Unique user identifier (CUID)
- `email`: string - User email for email notifications
- `phone`: string - User phone for SMS notifications (optional)
- `roles`: string[] - User roles for role-based targeting
- `isActive`: boolean - User account status
- `lastSyncedAt`: Date - Last sync timestamp with Auth Service
- `createdAt`: Date - Record creation timestamp
- `updatedAt`: Date - Record update timestamp

**Relationships:**

- One-to-many with DeviceToken (one user has multiple device tokens)
- One-to-many with UserNotification (one user has multiple notifications)
- One-to-one with UserPreferences (one user has one preference record)
- Many-to-many with Category through CategoryMember

### DeviceToken Model

**Purpose:** Manage FCM/APNS device tokens for push notifications, supporting multiple devices per user.

**Key Attributes:**

- `id`: string - Unique token identifier (CUID)
- `userId`: string - Reference to User
- `token`: string - FCM/APNS/Expo push token
- `platform`: string - Device platform (ios, android, web)
- `provider`: string - Push provider (fcm, apns, expo)
- `deviceId`: string - Unique device identifier
- `isActive`: boolean - Token status
- `lastUsedAt`: Date - Last successful push timestamp
- `createdAt`: Date - Token registration timestamp
- `updatedAt`: Date - Last update timestamp

**Relationships:**

- Many-to-one with User (multiple tokens belong to one user)

### Announcement Model

**Purpose:** Store core notification content and metadata, supporting template-based notifications.

**Key Attributes:**

- `id`: string - Unique announcement identifier (CUID)
- `title`: string - Notification title
- `body`: string - Notification body content
- `type`: string - Notification type (payment, booking, announcement, emergency)
- `priority`: string - Priority level (urgent, high, normal, low)
- `channels`: string[] - Target channels (push, email, inApp)
- `targetRoles`: string[] - Target user roles
- `targetUsers`: string[] - Specific target users (optional)
- `data`: object - Additional notification data
- `templateId`: string - Reference to notification template (optional)
- `scheduledAt`: Date - Scheduled send time (optional)
- `status`: string - Announcement status (draft, scheduled, sent, failed)
- `createdBy`: string - Creator user ID
- `createdAt`: Date - Creation timestamp
- `updatedAt`: Date - Update timestamp

**Relationships:**

- One-to-many with UserNotification (one announcement creates multiple user notifications)
- Many-to-one with NotificationTemplate (multiple announcements can share template)

### UserNotification Model

**Purpose:** Personal inbox for users, storing all notifications sent to user with read/unread status.

**Key Attributes:**

- `id`: string - Unique notification identifier (CUID)
- `userId`: string - Reference to User
- `announcementId`: string - Reference to Announcement
- `title`: string - Notification title (copied from announcement)
- `body`: string - Notification body (copied from announcement)
- `type`: string - Notification type
- `channel`: string - Delivery channel (push, email, inApp)
- `priority`: string - Priority level
- `data`: object - Additional notification data
- `status`: string - Delivery status (pending, sent, delivered, failed, read)
- `sentAt`: Date - When notification was sent
- `deliveredAt`: Date - When notification was delivered
- `readAt`: Date - When user read the notification
- `createdAt`: Date - Record creation timestamp
- `updatedAt`: Date - Record update timestamp

**Relationships:**

- Many-to-one with User (multiple notifications belong to one user)
- Many-to-one with Announcement (multiple user notifications from one announcement)

### Category Model

**Purpose:** Logical grouping for targeting notifications, supporting segmentation and user grouping.

**Key Attributes:**

- `id`: string - Unique category identifier (CUID)
- `name`: string - Category name
- `description`: string - Category description
- `type`: string - Category type (building, floor, apartment, custom)
- `isActive`: boolean - Category status
- `createdBy`: string - Creator user ID
- `createdAt`: Date - Creation timestamp
- `updatedAt`: Date - Update timestamp

**Relationships:**

- Many-to-many with User through CategoryMember

### CategoryMember Model

**Purpose:** Many-to-many relationship between users and categories, supporting flexible user grouping.

**Key Attributes:**

- `id`: string - Unique membership identifier (CUID)
- `categoryId`: string - Reference to Category
- `userId`: string - Reference to User
- `joinedAt`: Date - When user joined category
- `isActive`: boolean - Membership status

**Relationships:**

- Many-to-one with Category
- Many-to-one with User

### UserPreferences Model

**Purpose:** Store user preferences for notification channels and types, supporting opt-out functionality.

**Key Attributes:**

- `id`: string - Unique preference identifier (CUID)
- `userId`: string - Reference to User
- `channels`: object - Channel preferences {push: boolean, email: boolean, inApp: boolean}
- `types`: object - Type preferences {payment: boolean, booking: boolean, announcement: boolean, emergency: boolean}
- `quietHours`: object - Quiet hours settings {enabled: boolean, start: string, end: string}
- `createdAt`: Date - Creation timestamp
- `updatedAt`: Date - Update timestamp

**Relationships:**

- One-to-one with User

### NotificationTemplate Model

**Purpose:** Manage notification templates with variables and i18n support, supporting consistent notification formatting.

**Key Attributes:**

- `id`: string - Unique template identifier (CUID)
- `name`: string - Template identifier
- `type`: string - Notification type
- `channel`: string - Target channel (push, email, inApp)
- `subject`: string - Template subject (for email)
- `body`: string - Template body with variables {{variable}}
- `language`: string - i18n support (vi, en)
- `variables`: string[] - Required template variables
- `isActive`: boolean - Template status
- `createdBy`: string - Creator user ID
- `createdAt`: Date - Creation timestamp
- `updatedAt`: Date - Update timestamp

**Relationships:**

- One-to-many with Announcement (one template can be used by multiple announcements)

---
