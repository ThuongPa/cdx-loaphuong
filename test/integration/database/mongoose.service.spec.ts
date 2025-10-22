import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongooseService } from '../../../src/infrastructure/database/mongoose.service';
import { DatabaseConfig } from '../../../src/config/database.config';

describe('MongooseService Integration', () => {
  let service: MongooseService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [DatabaseConfig],
        }),
        MongooseModule.forRootAsync({
          useFactory: () => DatabaseConfig(),
        }),
      ],
      providers: [MongooseService],
    }).compile();

    service = module.get<MongooseService>(MongooseService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have connection', () => {
    const connection = service.getConnection();
    expect(connection).toBeDefined();
  });

  it('should be able to ping database', async () => {
    const connection = service.getConnection();
    const result = await connection?.db?.admin()?.ping();
    expect(result?.ok).toBe(1);
  });
});
