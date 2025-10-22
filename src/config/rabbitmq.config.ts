import { registerAs } from '@nestjs/config';

export const RabbitMQConfig = registerAs('rabbitmq', () => ({
  uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
  exchanges: {
    notifications: {
      name: 'notifications.exchange',
      type: 'topic',
      durable: true,
    },
    events: {
      name: 'events',
      type: 'topic',
      durable: true,
    },
  },
  queues: {
    notificationQueue: {
      name: 'notification.queue',
      durable: true,
      arguments: {
        'x-message-ttl': 3600000, // 1 hour
        'x-dead-letter-exchange': 'notifications.exchange',
        'x-dead-letter-routing-key': 'dlq.notification',
      },
    },
    retryQueue: {
      name: 'notification.retry.queue',
      durable: true,
      arguments: {
        'x-message-ttl': 300000, // 5 minutes
        'x-dead-letter-exchange': 'notifications.exchange',
        'x-dead-letter-routing-key': 'dlq.notification',
      },
    },
    deadLetterQueue: {
      name: 'notification.dlq.new',
      durable: true,
      arguments: {},
    },
  },
}));
