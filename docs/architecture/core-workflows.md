# Core Workflows

I will create sequence diagrams to illustrate the most important processing flows of Notification Service, including both high-level and detailed workflows.

### High-Level Notification Processing Workflow

```mermaid
sequenceDiagram
    participant MS as Microservice
    participant RMQ as RabbitMQ
    participant NS as Notification Service
    participant AS as Auth Service
    participant Novu as Novu API
    participant DB as MongoDB
    participant Cache as Redis

    MS->>RMQ: Publish notification event
    RMQ->>NS: Consume event
    NS->>AS: Query target users by role
    AS-->>NS: Return user list
    NS->>Cache: Get user preferences
    Cache-->>NS: Return preferences
    NS->>DB: Create notification records
    NS->>Novu: Trigger notification workflow
    Novu-->>NS: Return delivery status
    NS->>DB: Update notification status
    NS->>Cache: Update cache
```

### Device Token Registration Workflow

```mermaid
sequenceDiagram
    participant App as Mobile/Web App
    participant API as Notification API
    participant NS as Notification Service
    participant AS as Auth Service
    participant Novu as Novu API
    participant DB as MongoDB

    App->>API: POST /device-tokens
    API->>AS: Validate JWT token
    AS-->>API: Return user info
    API->>NS: Register device token
    NS->>DB: Check duplicate token
    NS->>DB: Store device token
    NS->>Novu: Create/update subscriber
    Novu-->>NS: Return subscriber status
    NS-->>API: Return success response
    API-->>App: Return token registration result
```

### Priority Queue Processing Workflow

```mermaid
sequenceDiagram
    participant RMQ as RabbitMQ
    participant PQ as Priority Queue
    participant W1 as URGENT Worker
    participant W2 as HIGH Worker
    participant W3 as NORMAL Worker
    participant W4 as LOW Worker
    participant Novu as Novu API
    participant DB as MongoDB

    RMQ->>PQ: Route by priority
    PQ->>W1: Process URGENT (1 worker)
    PQ->>W2: Process HIGH (2 workers)
    PQ->>W3: Process NORMAL (2 workers)
    PQ->>W4: Process LOW (1 worker)

    par URGENT Processing
        W1->>Novu: Send immediately
        Novu-->>W1: Return status
        W1->>DB: Update status
    and HIGH Processing
        W2->>Novu: Send with high priority
        Novu-->>W2: Return status
        W2->>DB: Update status
    and NORMAL Processing
        W3->>Novu: Send standard
        Novu-->>W3: Return status
        W3->>DB: Update status
    and LOW Processing
        W4->>W4: Batch notifications
        W4->>Novu: Send batch
        Novu-->>W4: Return status
        W4->>DB: Update status
    end
```

### Circuit Breaker and Retry Workflow

```mermaid
sequenceDiagram
    participant NS as Notification Service
    participant CB as Circuit Breaker
    participant Novu as Novu API
    participant DLQ as Dead Letter Queue
    participant Retry as Retry Worker

    NS->>CB: Request to send notification
    CB->>Novu: API call
    Novu-->>CB: Return response/error

    alt Success
        CB-->>NS: Return success
    else Failure (retryable)
        CB->>CB: Increment failure count
        alt Circuit Closed
            CB-->>NS: Return error (will retry)
            NS->>Retry: Schedule retry
        else Circuit Open
            CB-->>NS: Return circuit open error
            NS->>DLQ: Move to dead letter queue
        end
    else Failure (non-retryable)
        CB-->>NS: Return permanent error
        NS->>DLQ: Move to dead letter queue
    end

    Note over Retry: Background retry process
    Retry->>CB: Retry failed notification
    CB->>Novu: Retry API call
    Novu-->>CB: Return response
    CB-->>Retry: Return result
```

### User Preferences and Targeting Workflow

```mermaid
sequenceDiagram
    participant NS as Notification Service
    participant Cache as Redis Cache
    participant DB as MongoDB
    participant AS as Auth Service
    participant Novu as Novu API

    NS->>Cache: Get user preferences
    alt Cache Hit
        Cache-->>NS: Return preferences
    else Cache Miss
        NS->>DB: Query user preferences
        DB-->>NS: Return preferences
        NS->>Cache: Store in cache
    end

    NS->>NS: Apply preference filters
    alt User opted out
        NS->>NS: Skip notification
    else User opted in
        NS->>AS: Get user device tokens
        AS-->>NS: Return tokens
        NS->>Novu: Send notification
        Novu-->>NS: Return delivery status
    end
```

### Admin Broadcast Workflow

```mermaid
sequenceDiagram
    participant Admin as Admin Dashboard
    participant API as Admin API
    participant NS as Notification Service
    participant AS as Auth Service
    participant PQ as Priority Queue
    participant Novu as Novu API

    Admin->>API: POST /admin/broadcast
    API->>API: Validate admin role
    API->>NS: Create broadcast notification
    NS->>AS: Query target users by roles
    AS-->>NS: Return user list
    NS->>NS: Create individual notifications
    NS->>PQ: Queue notifications by priority
    PQ->>Novu: Process notifications
    Novu-->>PQ: Return delivery status
    PQ-->>NS: Update notification status
    NS-->>API: Return broadcast result
    API-->>Admin: Return success response
```

---
