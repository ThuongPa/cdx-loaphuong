import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookService } from './application/services/webhook.service';
import { WebhookRepository } from './infrastructure/webhook.repository';
import { WebhookRepositoryImpl } from './infrastructure/webhook.repository.impl';
import { Webhook, WebhookSchema } from './webhook.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Webhook.name, schema: WebhookSchema }])],
  providers: [
    WebhookService,
    {
      provide: 'WebhookRepository',
      useClass: WebhookRepositoryImpl,
    },
  ],
  exports: [WebhookService],
})
export class WebhookModule {}
