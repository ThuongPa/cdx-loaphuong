import { Module, Controller } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplatesController } from './interface/templates.controller';
import { NotificationTemplateRepository } from './domain/notification-template.repository';
import { NotificationTemplateRepositoryImpl } from './infrastructure/notification-template.repository.impl';
import { TemplateRendererService } from './domain/services/template-renderer.service';
import { TemplateSelectionService } from './application/services/template-selection.service';
import { NotificationTemplateFactory } from './domain/notification-template.factory';
import { NotificationTemplateSchema } from '../../../infrastructure/database/schemas/notification-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'NotificationTemplate', schema: NotificationTemplateSchema },
    ]),
  ],
  controllers: [TemplatesController],
  providers: [
    {
      provide: 'NotificationTemplateRepository',
      useClass: NotificationTemplateRepositoryImpl,
    },
    TemplateRendererService,
    NotificationTemplateFactory,
    {
      provide: 'TemplateSelectionService',
      useClass: TemplateSelectionService,
    },
  ],
  exports: [
    'NotificationTemplateRepository',
    TemplateRendererService,
    NotificationTemplateFactory,
    'TemplateSelectionService',
  ],
})
export class TemplatesModule {}
