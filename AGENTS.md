# TaskManager (Venta Team & Task Workspace) — Agent Rules & Architecture Guidelines

> **IMPORTANT FOR ALL AI AGENTS:**  
> This file defines the core principles, architecture, performance, security, and coding standards for this project.  
> Every agent working on this repository **MUST** adhere to these rules without exception.

---

## 1. Project Mission & Scope
- **Dual-Mode Workspace System:** The app supports both individual users and collaborative teams seamlessly:
  1. **Personal Space (Solo Mode):** Any registered user can immediately manage personal tasks, set priorities, track deadlines, and add notes/comments without needing an organization. Zero-friction onboarding.
  2. **Organization / Team Space (Collaborative Mode):** Users can create or be invited to organizations (e.g., Venta Shop). Managers assign tasks, track employee progress, manage team statuses, and oversee shared workloads.
- **Key Capabilities:**
  - Workspace Context Switcher (Personal vs. Organization Workspaces).
  - Multi-tenant Organization model with Role-Based Access Control (RBAC): Owner, Manager/Admin, Member/Employee.
  - Task Assignment & Delegation: Managers assign tasks to members, track progress, manage statuses, and oversee personal/assigned tasks.
  - Task Comments & Collaboration: Real-time or threaded discussions per task (both personal and team).
  - Audit Trail / Activity Logs: History of changes per task and organization.
  - Authentication & Authorization: Secure cookie-based JWT session / refresh token rotation.


---

## 2. Core Non-Negotiable Engineering Rules

### A. Modularity & Clean Architecture
- **Layered Separation of Concerns:**
  - `routes`: Define endpoints and attach validation & auth middlewares only.
  - `controllers`: Handle HTTP requests, input parsing, and HTTP responses.
  - `services` (or business logic layer): House core business rules, queries, and multi-step transactions.
  - `models`: Mongoose schemas with strict validations, indexes, and schema hooks/methods.
  - `middlewares`: Auth verification, role checking, input validation, error handling, rate limiting.
  - `validators`: Strict schema validation (e.g. Zod) for all incoming payloads.
- **Zero Dead Code:** Never leave unused functions, commented-out dead code, unused dependencies, or orphan console logs in production code.
- **Single Responsibility:** Every module and component must do one thing well.

### B. High Performance & Minimal DB Roundtrips
- **Minimize Queries:** Avoid N+1 queries at all costs. Use targeted `$lookup` or `.populate()` only for required fields with strict projections (`select`).
- **Indexed Queries:** Every query touching `organizationId`, `assigneeId`, `status`, and `dueDate` must use appropriate compound MongoDB indexes.
- **Lean Queries:** Always use `.lean()` for read-only queries to bypass Mongoose document hydration overhead.
- **Pagination & Caching:** All task and log lists must support cursor/offset pagination. No unbounded queries.
- **Batching & Bulk Operations:** Batch updates where possible instead of issuing multiple sequential writes.

### C. Enterprise-Grade Security
- **Authentication:** Store JWT access and refresh tokens in secure, `httpOnly`, `sameSite: 'strict'/'lax'` cookies. Never expose sensitive tokens to client-side JavaScript (`localStorage`).
- **Authorization & Multi-Tenancy Boundary:** Every single database query for tasks, comments, and members **must enforce the tenant boundary** (`organizationId`). Never trust a client-provided ID without verifying membership.
- **RBAC:** Verify permissions at the middleware layer before touching business logic.
- **Input Sanitization & Validation:** Validate and sanitize all user input to prevent NoSQL injection, XSS, and prototype pollution.
- **Password & Secret Hygiene:** Passwords hashed with bcrypt (minimum cost factor 12). Never return passwords or sensitive fields in API responses (`select: '-password'`).

### D. Frontend Standards
- **Component Architecture:** High cohesion, low coupling. Reusable UI primitives vs feature-specific containers.
- **Network Efficiency:** TanStack Query / RTK Query for smart caching, background revalidation, and optimistic updates to minimize redundant HTTP requests.
- **Design Bar:** Polished, modern, responsive (Desktop, Tablet, Mobile), professional visual hierarchy, subtle micro-interactions, no bloated animation libraries.

---

## 3. Workflow for Agents
1. **Never write speculative code** without confirming architectural alignment.
2. **Review existing models and schemas** before modifying or extending fields.
3. **Always verify database indexing** when adding new query patterns.
4. **Test & inspect error handling:** All async routes must properly funnel errors to the centralized global error handler.
