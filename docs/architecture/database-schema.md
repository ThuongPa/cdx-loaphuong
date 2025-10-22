# Database Schema

Based on the conceptual data models and using MongoDB with Mongoose ODM, I will create detailed schema definitions for all collections.

### MongoDB Collections Schema

**1. Users Collection**

```javascript
// users.schema.ts
import { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: string;
  email: string;
  phone?: string;
  roles: string[];
  isActive: boolean;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema =
  new Schema() <
  IUser >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      sparse: true,
      index: true,
    },
    roles: [
      {
        type: String,
        enum: ["admin", "resident", "staff", "manager"],
        required: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "users",
  });

// Indexes
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ roles: 1, isActive: 1 });
UserSchema.index({ lastSyncedAt: 1 });
```

**2. Device Tokens Collection**

```javascript
// device-tokens.schema.ts
import { Schema, Document } from "mongoose";

export interface IDeviceToken extends Document {
  _id: string;
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
  provider: "fcm" | "apns" | "expo";
  deviceId: string;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DeviceTokenSchema =
  new Schema() <
  IDeviceToken >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web"],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["fcm", "apns", "expo"],
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "device_tokens",
  });

// Indexes
DeviceTokenSchema.index({ userId: 1, isActive: 1 });
DeviceTokenSchema.index(
  { userId: 1, platform: 1, deviceId: 1 },
  { unique: true }
);
DeviceTokenSchema.index({ token: 1, isActive: 1 });
DeviceTokenSchema.index({ lastUsedAt: 1 });

// TTL Index for inactive tokens (90 days)
DeviceTokenSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { isActive: false },
  }
);
```

**3. Announcements Collection**

```javascript
// announcements.schema.ts
import { Schema, Document } from "mongoose";

export interface IAnnouncement extends Document {
  _id: string;
  title: string;
  body: string;
  type: "payment" | "booking" | "announcement" | "emergency";
  priority: "urgent" | "high" | "normal" | "low";
  channels: ("push" | "email" | "inApp")[];
  targetRoles: string[];
  targetUsers?: string[];
  data: Record<string, any>;
  templateId?: string;
  scheduledAt?: Date;
  status: "draft" | "scheduled" | "sent" | "failed";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const AnnouncementSchema =
  new Schema() <
  IAnnouncement >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
      index: true,
    },
    body: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ["payment", "booking", "announcement", "emergency"],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["urgent", "high", "normal", "low"],
      default: "normal",
      index: true,
    },
    channels: [
      {
        type: String,
        enum: ["push", "email", "inApp"],
        required: true,
      },
    ],
    targetRoles: [
      {
        type: String,
        enum: ["admin", "resident", "staff", "manager"],
        required: true,
      },
    ],
    targetUsers: [
      {
        type: String,
        ref: "User",
      },
    ],
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    templateId: {
      type: String,
      ref: "NotificationTemplate",
      index: true,
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "failed"],
      default: "draft",
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "announcements",
  });

// Indexes
AnnouncementSchema.index({ type: 1, status: 1 });
AnnouncementSchema.index({ priority: 1, scheduledAt: 1 });
AnnouncementSchema.index({ createdBy: 1, createdAt: -1 });
AnnouncementSchema.index({ scheduledAt: 1, status: 1 });
```

**4. User Notifications Collection**

```javascript
// user-notifications.schema.ts
import { Schema, Document } from "mongoose";

export interface IUserNotification extends Document {
  _id: string;
  userId: string;
  announcementId: string;
  title: string;
  body: string;
  type: "payment" | "booking" | "announcement" | "emergency";
  channel: "push" | "email" | "inApp";
  priority: "urgent" | "high" | "normal" | "low";
  data: Record<string, any>;
  status: "pending" | "sent" | "delivered" | "failed" | "read";
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const UserNotificationSchema =
  new Schema() <
  IUserNotification >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    announcementId: {
      type: String,
      required: true,
      ref: "Announcement",
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ["payment", "booking", "announcement", "emergency"],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["push", "email", "inApp"],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["urgent", "high", "normal", "low"],
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed", "read"],
      default: "pending",
      index: true,
    },
    sentAt: {
      type: Date,
      index: true,
    },
    deliveredAt: {
      type: Date,
      index: true,
    },
    readAt: {
      type: Date,
      index: true,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
      max: 3,
    },
  },
  {
    timestamps: true,
    collection: "user_notifications",
  });

// Indexes
UserNotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
UserNotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
UserNotificationSchema.index({ announcementId: 1, status: 1 });
UserNotificationSchema.index({ status: 1, retryCount: 1, createdAt: 1 });
UserNotificationSchema.index({ sentAt: 1, status: 1 });

// TTL Index for old notifications (1 year)
UserNotificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 365 * 24 * 60 * 60,
    partialFilterExpression: { status: { $in: ["read", "delivered"] } },
  }
);
```

**5. Categories Collection**

```javascript
// categories.schema.ts
import { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  _id: string;
  name: string;
  description: string;
  type: "building" | "floor" | "apartment" | "custom";
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CategorySchema =
  new Schema() <
  ICategory >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["building", "floor", "apartment", "custom"],
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "categories",
  });

// Indexes
CategorySchema.index({ type: 1, isActive: 1 });
CategorySchema.index({ createdBy: 1, createdAt: -1 });
```

**6. Category Members Collection**

```javascript
// category-members.schema.ts
import { Schema, Document } from "mongoose";

export interface ICategoryMember extends Document {
  _id: string;
  categoryId: string;
  userId: string;
  joinedAt: Date;
  isActive: boolean;
}

export const CategoryMemberSchema =
  new Schema() <
  ICategoryMember >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    categoryId: {
      type: String,
      required: true,
      ref: "Category",
      index: true,
    },
    userId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: "category_members",
  });

// Indexes
CategoryMemberSchema.index({ categoryId: 1, userId: 1 }, { unique: true });
CategoryMemberSchema.index({ userId: 1, isActive: 1 });
CategoryMemberSchema.index({ categoryId: 1, isActive: 1 });
```

**7. User Preferences Collection**

```javascript
// user-preferences.schema.ts
import { Schema, Document } from "mongoose";

export interface IUserPreferences extends Document {
  _id: string;
  userId: string;
  channels: {
    push: boolean,
    email: boolean,
    inApp: boolean,
  };
  types: {
    payment: boolean,
    booking: boolean,
    announcement: boolean,
    emergency: boolean,
  };
  quietHours: {
    enabled: boolean,
    start: string,
    end: string,
  };
  createdAt: Date;
  updatedAt: Date;
}

export const UserPreferencesSchema =
  new Schema() <
  IUserPreferences >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      ref: "User",
      unique: true,
      index: true,
    },
    channels: {
      push: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: true,
      },
      inApp: {
        type: Boolean,
        default: true,
      },
    },
    types: {
      payment: {
        type: Boolean,
        default: true,
      },
      booking: {
        type: Boolean,
        default: true,
      },
      announcement: {
        type: Boolean,
        default: true,
      },
      emergency: {
        type: Boolean,
        default: true,
      },
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      start: {
        type: String,
        default: "22:00",
      },
      end: {
        type: String,
        default: "08:00",
      },
    },
  },
  {
    timestamps: true,
    collection: "user_preferences",
  });

// Indexes
UserPreferencesSchema.index({ userId: 1 });
```

**8. Notification Templates Collection**

```javascript
// notification-templates.schema.ts
import { Schema, Document } from "mongoose";

export interface INotificationTemplate extends Document {
  _id: string;
  name: string;
  type: "payment" | "booking" | "announcement" | "emergency";
  channel: "push" | "email" | "inApp";
  subject: string;
  body: string;
  language: "vi" | "en";
  variables: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationTemplateSchema =
  new Schema() <
  INotificationTemplate >
  ({
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
      index: true,
    },
    type: {
      type: String,
      enum: ["payment", "booking", "announcement", "emergency"],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["push", "email", "inApp"],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    language: {
      type: String,
      enum: ["vi", "en"],
      default: "vi",
      index: true,
    },
    variables: [
      {
        type: String,
        required: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "notification_templates",
  });

// Indexes
NotificationTemplateSchema.index({
  type: 1,
  channel: 1,
  language: 1,
  isActive: 1,
});
NotificationTemplateSchema.index({ name: 1, isActive: 1 });
NotificationTemplateSchema.index({ createdBy: 1, createdAt: -1 });
```

### Database Indexes Summary

**Performance-Critical Indexes:**

- `users`: email, roles+isActive, lastSyncedAt
- `device_tokens`: userId+isActive, userId+platform+deviceId (unique), token+isActive
- `announcements`: type+status, priority+scheduledAt, createdBy+createdAt
- `user_notifications`: userId+status+createdAt, userId+type+createdAt, status+retryCount+createdAt
- `categories`: type+isActive, name (unique)
- `category_members`: categoryId+userId (unique), userId+isActive
- `user_preferences`: userId (unique)
- `notification_templates`: type+channel+language+isActive, name+isActive

**TTL Indexes:**

- `device_tokens`: 180 days for inactive tokens (increased from 90 days)
- `user_notifications`: 1 year for read/delivered notifications
- `announcements`: 1 year for expired announcements
- `categories`: 1 year for inactive categories
- `user_preferences`: 1 year for inactive preferences

---
