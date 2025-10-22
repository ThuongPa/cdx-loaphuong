# Security

These are **MANDATORY** security requirements for AI and human developers. I will focus on implementation-specific rules and patterns.

### Input Validation

- **Validation Library:** class-validator 0.14.0 with class-transformer
- **Validation Location:** API boundary before processing business logic
- **Required Rules:**
  - All external inputs MUST be validated
  - Validation at API boundary before processing
  - Whitelist approach preferred over blacklist
  - Sanitize HTML content in notification templates

### Authentication & Authorization

- **Auth Method:** JWT token validation via Auth Service integration
- **Session Management:** Stateless JWT tokens with refresh token mechanism
- **Required Patterns:**
  - All protected endpoints MUST have JWT validation
  - Admin endpoints MUST have role-based authorization
  - Device token operations MUST validate user ownership
  - API keys MUST be stored securely in environment variables

### Secrets Management

- **Development:** Environment variables in `.env` files (not committed)
- **Production:** Coolify secrets management with encrypted storage
- **Code Requirements:**
  - NEVER hardcode secrets in code
  - Access secrets via configuration service only
  - No secrets in logs or error messages
  - Rotate secrets regularly

### API Security

- **Rate Limiting:** 1000 requests/minute per user, 100 requests/minute for admin endpoints
- **CORS Policy:** Restrictive CORS for production, permissive for development
- **Security Headers:** HSTS, X-Frame-Options, X-Content-Type-Options, CSP
- **HTTPS Enforcement:** Force HTTPS in production environment

### Data Protection

- **Encryption at Rest:** MongoDB encryption with AES-256
- **Encryption in Transit:** TLS 1.3 for all external communications
- **PII Handling:** Minimize PII storage, encrypt sensitive user data
- **Logging Restrictions:** No sensitive data in logs (tokens, passwords, personal info)

### Dependency Security

- **Scanning Tool:** npm audit with automated vulnerability scanning
- **Update Policy:** Weekly dependency updates with security patch priority
- **Approval Process:** Security team review for new dependencies

### Performance Achievements

**Queue Processing Performance:**

- **Throughput:** 1-3 notifications/second → 10+ notifications/second (5x improvement)
- **Success Rate:** 70-80% → 99%+ with retry mechanism
- **Data Loss:** Possible → Zero with Redis persistence
- **Recovery Time:** Manual → < 5 seconds automatic recovery

**Concurrent Processing:**

- **Workers:** 5 parallel workers processing notifications
- **Batch Size:** 10 notifications per processing cycle
- **Priority Levels:** 4 levels (urgent → high → medium → low)
- **Retry Logic:** 3 attempts with exponential backoff (1s → 2s → 4s)

**Reliability & Scalability:**

- **Circuit Breaker:** Implemented to prevent cascading failures
- **Load Balancing:** Across multiple worker instances
- **Horizontal Scaling:** Support for adding more worker nodes

**Multi-Provider Support:**

- **FCM:** Google Firebase Cloud Messaging for Android
- **APNS:** Apple Push Notification Service for iOS
- **Expo:** Expo Push Notifications for React Native apps
- **Unified API:** Single endpoint for all providers with automatic routing

**Advanced Features:**

- **User Synchronization:** Real-time user lifecycle event handling via RabbitMQ
- **Queue Monitoring:** Real-time metrics and performance tracking
- **Redis Persistence:** Zero data loss with automatic queue state backup
- **Dead Letter Queue:** Failed message handling and retry mechanisms

### Security Testing

- **SAST Tool:** ESLint security rules with custom security rules
- **DAST Tool:** OWASP ZAP integration in CI/CD pipeline
- **Penetration Testing:** Quarterly security assessments

---
