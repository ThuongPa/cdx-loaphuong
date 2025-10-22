# Coding Standards

These are **MANDATORY** coding standards for AI agents. I will work with you to define ONLY the critical rules needed to prevent bad code.

**Important Notes:**

1. This section directly controls AI developer behavior
2. Keep it minimal - assume AI knows general best practices
3. Focus on project-specific conventions and gotchas
4. Overly detailed standards bloat context and slow development
5. Standards will be extracted to separate file for dev agent use

### Core Standards

- **Languages & Runtimes:** TypeScript 5.3.3, Node.js 20.11.0 LTS, NestJS 10.3.2 with Fastify adapter
- **Style & Linting:** ESLint 8.55.0 + Prettier 3.1.0 with strict TypeScript configuration
- **Test Organization:** Jest 29.7.0 with test files co-located (`.spec.ts`, `.test.ts`)

### Critical Rules

- **Never use console.log in production code** - Always use Winston logger with appropriate log levels
- **All API responses must use ApiResponse wrapper type** - Consistent response format across all endpoints
- **Database queries must use repository pattern** - Never direct Mongoose calls outside repository layer
- **All external API calls must have circuit breaker protection** - Prevent cascading failures
- **JWT token validation must be done via Auth Service** - Never validate tokens locally
- **All notification sending must respect user preferences** - Check preferences before sending
- **Device token operations must validate user ownership** - Users can only manage their own tokens
- **All admin operations must have proper RBAC validation** - Admin role required for admin endpoints
- **Priority queue processing must handle failures gracefully** - Failed notifications go to retry queue
- **All database operations must use transactions for multi-document updates** - Ensure data consistency

### Language-Specific Guidelines

#### TypeScript Specifics

- **Always use strict null checks** - Enable strict mode in tsconfig.json
- **Use CUID for all entity IDs** - Consistent with existing system, never use MongoDB ObjectId
- **DTOs must use class-validator decorators** - All input validation through DTOs
- **Use dependency injection pattern** - NestJS standard, no manual instantiation
- **Async/await preferred over Promises** - Better error handling and readability

#### NestJS Specifics

- **Use decorators for all route handlers** - @Get(), @Post(), @Put(), @Delete()
- **Guards must be applied at controller level** - Authentication and authorization
- **Interceptors for cross-cutting concerns** - Logging, transformation, caching
- **Pipes for input validation** - ValidationPipe, ParseCuidPipe, ParseIntPipe
- **Exception filters for error handling** - Global exception handling

---
