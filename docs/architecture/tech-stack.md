# Tech Stack

This is the **MOST IMPORTANT** section - all technology choices made here will be the single source of truth for the entire project.

### Cloud Infrastructure

- **Provider:** Self-hosted infrastructure
- **Key Services:** Docker, Kubernetes, Coolify, RabbitMQ, Redis, MongoDB
- **Deployment Regions:** Single region (Vietnam)

### Technology Stack Table

| Category                 | Technology | Version     | Purpose                      | Rationale                                                   |
| ------------------------ | ---------- | ----------- | ---------------------------- | ----------------------------------------------------------- |
| **Language**             | TypeScript | 5.3.3       | Primary development language | Strong typing, excellent tooling, team expertise            |
| **Runtime**              | Node.js    | 20.11.0 LTS | JavaScript runtime           | LTS version, stable performance, wide ecosystem             |
| **Framework**            | NestJS     | 10.3.2      | Backend framework            | Enterprise-ready, good DI, matches team patterns            |
| **HTTP Adapter**         | Fastify    | 4.24.3      | HTTP server                  | High performance, built-in validation, TypeScript support   |
| **Database**             | MongoDB    | 6.0+        | Primary database             | Document-based, fits notification data structure            |
| **ODM**                  | Mongoose   | 8.0+        | MongoDB object modeling      | Mature, well-documented, NestJS integration                 |
| **Cache**                | Redis      | 7.0+        | Caching & session management | Fast in-memory storage, pub/sub capabilities                |
| **Message Broker**       | RabbitMQ   | 3.12+       | Event messaging              | Reliable, supports priority queues, existing infrastructure |
| **Notification Service** | Novu       | Latest      | Notification infrastructure  | Self-hosted, multi-channel support                          |
| **Testing**              | Jest       | 29.7.0      | Testing framework            | Comprehensive, good mocking, NestJS integration             |
| **Code Quality**         | ESLint     | 8.55.0      | Linting                      | Code consistency, error prevention                          |
| **Code Formatting**      | Prettier   | 3.1.0       | Code formatting              | Consistent code style                                       |
| **Container**            | Docker     | Latest      | Containerization             | Consistent deployment, easy scaling                         |
| **Orchestration**        | Kubernetes | 1.28+       | Container orchestration      | Production-ready, auto-scaling                              |
| **Deployment**           | Coolify    | Latest      | Deployment platform          | Simple deployment, existing infrastructure                  |

---
