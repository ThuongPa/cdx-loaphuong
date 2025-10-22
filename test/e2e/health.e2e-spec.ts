import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from '../../src/modules/health/health.module';
import { DatabaseConfig } from '../../src/config/database.config';
import { RedisConfig } from '../../src/config/redis.config';
import { RabbitMQConfig } from '../../src/config/rabbitmq.config';
import { NovuConfig } from '../../src/config/novu.config';
import { AuthConfig } from '../../src/config/auth.config';
import { AppConfig } from '../../src/config/app.config';
import * as request from 'supertest';

describe('Health E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [DatabaseConfig, RedisConfig, RabbitMQConfig, NovuConfig, AuthConfig, AppConfig],
        }),
        MongooseModule.forRootAsync({
          useFactory: (databaseConfig: any) => ({
            uri: databaseConfig().uri,
            useNewUrlParser: true,
            useUnifiedTopology: true,
          }),
          inject: [DatabaseConfig],
        }),
        TerminusModule,
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('info');
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('details');
      });
  });
});
