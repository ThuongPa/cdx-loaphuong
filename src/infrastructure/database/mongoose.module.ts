import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseService } from './mongoose.service';
import { User, UserSchema } from './schemas/user.schema';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-token.schema';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';
import { UserNotification, UserNotificationSchema } from './schemas/user-notification.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoryMember, CategoryMemberSchema } from './schemas/category-member.schema';
import { UserPreferencesSchema } from '../../modules/notification/preferences/domain/user-preferences.schema';

// Import all schemas
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './schemas/notification-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: UserNotification.name, schema: UserNotificationSchema },
      { name: Category.name, schema: CategorySchema },
      { name: CategoryMember.name, schema: CategoryMemberSchema },
      { name: 'UserPreferences', schema: UserPreferencesSchema },
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
    ]),
  ],
  providers: [MongooseService],
  exports: [MongooseService, MongooseModule],
})
export class DatabaseModule {}
