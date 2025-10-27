# CDX Notification Service

Dịch vụ thông báo cho hệ thống CDX, được xây dựng với NestJS và tích hợp Novu.

## Tính năng chính

- Gửi thông báo qua nhiều kênh (email, SMS, push notification)
- Tích hợp với Novu để quản lý templates và campaigns
- Hỗ trợ RabbitMQ cho message queuing
- Redis caching để tối ưu hiệu suất
- MongoDB để lưu trữ dữ liệu
- API documentation với Swagger
- Monitoring và logging đầy đủ

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Cấu hình environment variables
cp env.example .env

# Chạy migrations
npm run migration:run

# Khởi động development server
npm run dev
```

## API Documentation

Sau khi khởi động server, truy cập Swagger UI tại: `http://localhost:3000/api`

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

## Docker

```bash
# Build image
docker build -t cdx-notifi-service .

# Run container
docker run -p 3000:3000 cdx-notifi-service
```

## License

UNLICENSED
