import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from 'src/modules/health/health.module';
import { RabbitMQConsumerModule } from 'src/modules/notification/integration/rabbitmq/rabbitmq-consumer.module';
import { DatabaseConfig } from 'src/config/database.config';
import { RedisConfig } from 'src/config/redis.config';
import { RabbitMQConfig } from 'src/config/rabbitmq.config';
import { NovuConfig } from 'src/config/novu.config';
import { AuthConfig } from 'src/config/auth.config';
import { AppConfig } from 'src/config/app.config';
import * as request from 'supertest';

describe('RabbitMQ Consumer E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [DatabaseConfig, RedisConfig, RabbitMQConfig, NovuConfig, AuthConfig, AppConfig],
        }),
        TerminusModule,
        HealthModule,
        RabbitMQConsumerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return health status including RabbitMQ consumer health', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const health = res.body;

          // Check that all health indicators are present
          expect(health.status).toBeDefined();
          expect(health.info).toBeDefined();
          expect(health.error).toBeDefined();

          // Check that RabbitMQ consumer health is included
          expect(health.info).toHaveProperty('rabbitmq-consumer');
          expect(health.info).toHaveProperty('event-validation');
          expect(health.info).toHaveProperty('rabbitmq-retry');

          // Check RabbitMQ consumer health structure
          const rabbitmqConsumerHealth = health.info['rabbitmq-consumer'];
          expect(rabbitmqConsumerHealth).toHaveProperty('status');
          expect(rabbitmqConsumerHealth).toHaveProperty('isConsuming');
          expect(rabbitmqConsumerHealth).toHaveProperty('registeredHandlers');
          expect(rabbitmqConsumerHealth).toHaveProperty('timestamp');

          // Check event validation health structure
          const eventValidationHealth = health.info['event-validation'];
          expect(eventValidationHealth).toHaveProperty('status');
          expect(eventValidationHealth).toHaveProperty('correlationIdGenerated');
          expect(eventValidationHealth).toHaveProperty('timestamp');

          // Check retry service health structure
          const retryHealth = health.info['rabbitmq-retry'];
          expect(retryHealth).toHaveProperty('status');
          expect(retryHealth).toHaveProperty('canIdentifyRetryableErrors');
          expect(retryHealth).toHaveProperty('timestamp');
        });
    });

    it('should return health status with correct data types', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const health = res.body;

          // Check RabbitMQ consumer health data types
          const rabbitmqConsumerHealth = health.info['rabbitmq-consumer'];
          expect(typeof rabbitmqConsumerHealth.isConsuming).toBe('boolean');
          expect(typeof rabbitmqConsumerHealth.registeredHandlers).toBe('number');
          expect(typeof rabbitmqConsumerHealth.timestamp).toBe('string');

          // Check event validation health data types
          const eventValidationHealth = health.info['event-validation'];
          expect(typeof eventValidationHealth.correlationIdGenerated).toBe('boolean');
          expect(typeof eventValidationHealth.timestamp).toBe('string');

          // Check retry service health data types
          const retryHealth = health.info['rabbitmq-retry'];
          expect(typeof retryHealth.canIdentifyRetryableErrors).toBe('boolean');
          expect(typeof retryHealth.timestamp).toBe('string');
        });
    });

    it('should return health status with valid timestamps', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const health = res.body;

          // Check that timestamps are valid ISO strings
          const rabbitmqConsumerHealth = health.info['rabbitmq-consumer'];
          const eventValidationHealth = health.info['event-validation'];
          const retryHealth = health.info['rabbitmq-retry'];

          expect(() => new Date(rabbitmqConsumerHealth.timestamp)).not.toThrow();
          expect(() => new Date(eventValidationHealth.timestamp)).not.toThrow();
          expect(() => new Date(retryHealth.timestamp)).not.toThrow();

          // Check that timestamps are recent (within last minute)
          const now = new Date();
          const rabbitmqTimestamp = new Date(rabbitmqConsumerHealth.timestamp);
          const eventValidationTimestamp = new Date(eventValidationHealth.timestamp);
          const retryTimestamp = new Date(retryHealth.timestamp);

          expect(now.getTime() - rabbitmqTimestamp.getTime()).toBeLessThan(60000);
          expect(now.getTime() - eventValidationTimestamp.getTime()).toBeLessThan(60000);
          expect(now.getTime() - retryTimestamp.getTime()).toBeLessThan(60000);
        });
    });
  });

  describe('Health Check Response Format', () => {
    it('should return health status in correct format', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const health = res.body;

          // Check overall health structure
          expect(health).toHaveProperty('status');
          expect(health).toHaveProperty('info');
          expect(health).toHaveProperty('error');
          expect(health).toHaveProperty('details');

          // Check that status is either 'ok' or 'error'
          expect(['ok', 'error']).toContain(health.status);

          // Check that info and error are objects
          expect(typeof health.info).toBe('object');
          expect(typeof health.error).toBe('object');
        });
    });

    it('should include all required health indicators', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const health = res.body;

          // Check that all expected health indicators are present
          const expectedIndicators = [
            'database',
            'redis',
            'rabbitmq',
            'rabbitmq-consumer',
            'event-validation',
            'rabbitmq-retry',
            'novu',
          ];

          expectedIndicators.forEach((indicator) => {
            expect(health.info).toHaveProperty(indicator);
            expect(health.info[indicator]).toHaveProperty('status');
          });
        });
    });
  });
});
