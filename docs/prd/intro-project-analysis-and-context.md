# Intro Project Analysis and Context

### Existing Project Overview

**Analysis Source:** IDE-based fresh analysis

**Current Project State:**
The existing system is a microservices architecture with:

- **Microservices with NestJS** framework
- **Event-driven system** using RabbitMQ
- **Auth Service** managing authentication and authorization
- **App cư dân xã** - resident management system for residential communities

### Available Documentation Analysis

**Available Documentation:**

- ❌ Tech Stack Documentation (needs analysis from codebase)
- ❌ Source Tree/Architecture (needs analysis from codebase)
- ❌ Coding Standards (needs analysis from codebase)
- ❌ API Documentation (needs analysis from codebase)
- ❌ External API Documentation (needs analysis from codebase)
- ❌ UX/UI Guidelines (may not apply to service)
- ❌ Technical Debt Documentation (needs analysis from codebase)

**Recommendation:** Run the `document-project` task first to get detailed technical analysis of the existing system.

### Enhancement Scope Definition

**Enhancement Type:**

- ✅ New Feature Addition
- ✅ Integration with New Systems (Novu)

**Enhancement Description:**
Create a new microservice to handle notifications from internal services, integrating with Novu self-hosted to send push notifications, in-app notifications, and email notifications with role-based permissions through Auth Service.

**Impact Assessment:**

- ✅ Moderate Impact (some existing code changes)
- ✅ Significant Impact (substantial existing code changes)

### Goals and Background Context

**Goals:**

- Create centralized notification system for the entire Cư dân xã app ecosystem
- Integrate Novu to support diverse notification types (push, in-app, email)
- Implement role-based notification permissions
- Provide notification management and history tracking
- Ensure scalability and reliability for notification delivery

**Background Context:**
Currently, microservices in the Cư dân xã system lack a centralized notification system. Sending notifications to residents (such as payment notifications, booking confirmations, emergency alerts) needs to be handled consistently and manageably. The Notification Service will serve as the central hub for processing all notifications, ensuring delivery reliability and providing notification management capabilities for admins.

---
