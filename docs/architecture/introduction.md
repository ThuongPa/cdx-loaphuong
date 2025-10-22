# Introduction

This document outlines the overall project architecture for **Notification Service**, including backend systems, shared services, and non-UI specific concerns. Its primary goal is to serve as the guiding architectural blueprint for AI-driven development, ensuring consistency and adherence to chosen patterns and technologies.

**Relationship to Frontend Architecture:**
This project focuses on backend microservice, with no significant user interface. This document includes all architectural decisions for Notification Service.

### Starter Template or Existing Project

Based on PRD analysis, this is a **brownfield enhancement** - creating a new microservice that integrates with existing system:

**Existing Project Analysis:**

- **Current System**: Microservices architecture with NestJS framework
- **Event-driven system**: Using RabbitMQ
- **Auth Service**: Managing authentication and authorization
- **App cư dân xã**: Resident management system for residential communities

**Architecture Decision:**

- **Use NestJS framework** to maintain consistency with existing microservices
- **Integrate with RabbitMQ** to receive events from other microservices
- **Integrate with Auth Service** for authentication and authorization
- **Use MongoDB** with Mongoose ODM to maintain consistency with existing architecture

**No starter template used** - will build from scratch following existing system patterns.

### Change Log

| Date       | Version | Description                                                     | Author    |
| ---------- | ------- | --------------------------------------------------------------- | --------- |
| 2025-01-27 | 1.0     | Initial architecture document creation for Notification Service | Architect |

---
