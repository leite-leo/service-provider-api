# Architecture

This document records the architectural and implementation decisions taken for the Service Provider API. Each decision is presented with its context, the alternatives considered, the chosen approach, and the trade-offs accepted.

The format is intentionally a lightweight Architecture Decision Record (ADR): enough structure to communicate reasoning, not so much that the document becomes ceremonial.

## About This Document

This is the technical companion to `business-rules.md` and `database-model.md`. Where those documents describe **what** the system does and **how** it is shaped, this document explains **why** specific technical choices were made.

The document is meant to be readable by other developers evaluating the project, by future contributors, and by myself months from now when I have forgotten what I was thinking.

## Project Philosophy

This project is primarily a portfolio project, designed to demonstrate backend development skills with a realistic business scenario. The complexity target is "Junior advanced / Mid-level entry" — meaningful business rules, real integrations, and proper architectural discipline, without overengineering.

The project deliberately avoids microservices, event-driven architecture, distributed systems, multi-tenancy, and any technology whose adoption cannot be justified by the problem at hand. Every dependency and every architectural choice should serve a clear purpose in the scope of this system.

Clarity, organization, and maintainability are prioritized over technical sophistication. A clean implementation of a focused scope is more valuable than an incomplete attempt at an ambitious scope.

## Architecture Style: Modular Monolith with MSC

**Context.** The system needs an organization style that scales to a few dozen endpoints without forcing premature distribution.

**Decision.** Modular monolith following the Model-Service-Controller (MSC) pattern.

**Alternatives considered.**

- *Microservices.* Rejected: introduces operational complexity (service discovery, inter-service communication, deployment topology) that is not justified by the problem size or team size.
- *Layered hexagonal / clean architecture.* Rejected: the additional ports, adapters, and use case layers add ceremony without value at this scope. MSC is sufficient.
- *Single-file Express application.* Rejected: does not scale beyond toy projects and signals carelessness in a portfolio context.

**Consequences.**

- Controllers are thin: they parse, validate, and delegate. They never contain business logic.
- Services hold all business logic. They are unit-testable in isolation because they depend on injected models, not on HTTP.
- Models are Sequelize definitions. They do not contain business logic beyond Sequelize-native concerns (associations, hooks for timestamps).
- The folder structure mirrors this separation:

```
.
├── src/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── validations/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── jobs/
│   ├── config/
│   └── utils/
├── instrument.js
└── server.js
```

## Authentication: Firebase Authentication

**Context.** The API needs an authentication mechanism that handles user registration, password management, password reset, and token issuance. The API itself only needs to verify tokens, not manage credentials.

**Decision.** Use Firebase Authentication for identity management. The API verifies Firebase ID tokens using the Firebase Admin SDK.

**Alternatives considered.**

- *JWT issued by the API itself.* Rejected for this project. Building this from scratch (bcrypt password hashing, JWT signing and verification, refresh token rotation, password reset flow, email confirmation) is well-trodden tutorial territory. Firebase Auth produces a more realistic integration scenario that matches how mobile and web frontends are typically built today.
- *Auth0 / Clerk / other hosted identity providers.* Rejected: equivalent capability to Firebase, with no advantage for this scope. Firebase was chosen because of existing familiarity with the Firebase ecosystem.
- *Session-based authentication with cookies.* Rejected: not appropriate for an API consumed by mobile clients.

**Consequences.**

- No `password` column exists in the `users` table. The application database stores no credentials.
- A middleware (`authMiddleware`) extracts the `Authorization: Bearer <token>` header, verifies it with `admin.auth().verifyIdToken()`, and loads the corresponding local `User` record by `firebase_uid`.
- A separate middleware (`requireRole`) checks the application-level role attached to the local user record.
- The local `User` record is synchronized on first login: when a token verifies but no local user exists, the record is created using the Firebase user data (`uid`, `email`, `name`). Subsequent logins update the local record if Firebase data has changed.
- Token expiration is handled by Firebase; the API simply rejects expired tokens with HTTP 401. Refresh is handled by the client using the Firebase client SDK.
- The README documents this decision explicitly to set reader expectations.

What this demonstrates technically: integration with an external identity provider, middleware composition, separation between authentication (Firebase) and authorization (application-level role), local user record synchronization, and token verification flow.

## User Provisioning: Backend-Orchestrated via Firebase Admin SDK

**Context.** Providers are admin-onboarded (see *Admin-Onboarding Model* below). The administrator needs to create the provider's representative as a Firebase user without ever knowing the representative's password. The representative defines their own password but does not self-register.

**Decision.** The backend uses the Firebase Admin SDK to provision users during provider creation. The flow:

1. `POST /providers` receives provider data plus the representative's email and name.
2. Backend creates the Firebase user via `admin.auth().createUser({ email, displayName })` with no password.
3. Backend creates the local `User` record linked to the new `ServiceProvider`.
4. Backend generates a password setup link via `admin.auth().generatePasswordResetLink(email)`.
5. Backend returns the created provider, the created user, and the `passwordSetupLink` in the response body.

The administrator delivers the link to the representative through whatever channel they prefer. Email delivery from the backend is explicitly out of scope; the link is returned in the response for the administrator to forward manually.

**Alternatives considered.**

- *Admin sets the password.* Rejected. The administrator would know the representative's password, which is an anti-pattern in B2B systems. A "force change on first login" mitigation adds complexity without addressing the underlying smell.
- *Backend sends the setup link via email or SMS.* Rejected. Requires email or messaging infrastructure (SMTP, SES, SendGrid, Twilio) that is out of declared scope. The link-in-response pattern preserves the core security property (representative sets own password) without the supporting infrastructure. In a production B2B SaaS, the same backend would additionally send the link via email — the API contract remains unchanged.
- *Pending-invite pattern without creating the Firebase user upfront.* Rejected. Would allow anyone who learns the invited email to register first and claim the provider account. Closing that gap requires invitation tokens and additional validation flow, which ends up more complex than the current approach.
- *Magic links / passwordless authentication.* Rejected. Most B2B representatives expect password-based access; magic links can be confusing and tie ongoing access to email delivery reliability.

**Consequences.**

- The Firebase Admin SDK is used for more than token verification: `createUser`, `generatePasswordResetLink`, and `deleteUser` (as a compensating action) are part of the backend's responsibilities. The `src/config/firebase.js` module exports the full `admin` namespace.
- Provider creation involves two systems (Firebase and Postgres) that cannot share a transaction. The implementation uses a saga-style compensating action: if the database transaction fails after the Firebase user is created, the Firebase user is deleted before the error response is returned. This keeps the two systems consistent without distributed transactions.
- A companion endpoint `POST /providers/:id/regenerate-invite` generates a fresh setup link if the original expired (Firebase default expiration is one hour). The same endpoint also serves as an admin-triggered password reset for already-active provider users — the Firebase API used (`generatePasswordResetLink`) behaves identically in both cases.
- Email and messaging delivery infrastructure is documented as future scope. The link-in-response pattern is the production-acceptable shape for this project; adding email later would not change the API contract, only the side-effect of the endpoint.

## Data Model Decisions

### Soft Delete via Status Fields

**Context.** Some records must remain queryable after they are no longer operational. Deleting a provider must not delete its historical documents.

**Decision.** Use explicit status fields per entity (`pending`/`approved`/`inactive` for providers, `active`/`inactive` for employees and vehicles, `active`/`expired`/`archived` for documents). Do not use `deleted_at` columns or Sequelize paranoid mode.

**Alternatives considered.**

- *Sequelize paranoid mode (`deleted_at`).* Rejected: introduces global hidden filtering that produces subtle bugs and obscures query intent. Explicit status filtering is preferable.
- *Hard delete with cascade restrictions.* Rejected: violates the requirement that historical documents survive provider deactivation.

**Consequences.**

- Every relevant query includes `WHERE status = 'active'` (or equivalent) explicitly. There is no implicit filtering.
- Status transitions are an explicit part of the API and the business rules. They carry timestamps and, where appropriate, actor identification (`approved_by`).

### Polymorphic Document Linkage

**Context.** A document may belong to a provider directly (`tax_id`), to an employee (`government_id`, `driver_license`, `employment_contract`), or to a vehicle (`vehicle_registration`). All three cases need to be represented.

**Decision.** Single `documents` table with `service_provider_id` (always present) and nullable `employee_id` and `vehicle_id` columns. A CHECK constraint enforces that at most one of the nullable columns is set.

**Alternatives considered.**

- *Three separate document tables (`provider_documents`, `employee_documents`, `vehicle_documents`).* Rejected: triples the schema for very similar data, complicates compliance queries, and makes the upload endpoint awkward to design.
- *Generic `owner_type` + `owner_id` polymorphic columns.* Rejected: gives up referential integrity entirely. Database-level FK constraints are a meaningful integrity guarantee that should not be discarded for a small amount of schema convenience.

**Consequences.**

- The polymorphic CHECK constraint enforces the linkage rule at the database level. See `database-model.md` for the SQL.
- Compliance queries can join `documents` on either `employee_id` or `vehicle_id` without UNION across tables.
- Application-level validation additionally ensures that the `document_type` matches the linkage pattern (`tax_id` requires both nullable FKs null, etc.).

### One Active Document per Type per Entity

**Context.** When a provider uploads a new driver's license for an employee, the previous license should not coexist as an equally valid active record. The system needs to enforce that only one document of each type is current per entity at any time.

**Decision.** Partial unique indexes scoped to `status = 'active'`, with one index per linkage pattern (provider-level, employee-level, vehicle-level). When a new document of an existing type is uploaded, the application transitions the prior document to `archived` before inserting the new one.

**Consequences.**

- Historical documents accumulate in the table under `archived` status; queries that need the full history can fetch them.
- The compliance computation only ever considers documents with `status = 'active'`.
- Race conditions on concurrent uploads are caught by the partial unique index; the application returns HTTP 409 with a meaningful error code.

### Admin-Onboarding Model

**Context.** A provider company must exist in the system as a `ServiceProvider` record, and the user representing that provider must exist as a `User` linked to it. The question is whether providers register themselves or are created by administrators.

**Decision.** Administrators create `ServiceProvider` records on behalf of providers. Self-registration is not supported. The provider's user authenticates via Firebase only after the administrator has created the company record and invited the representative.

**Alternatives considered.**

- *Self-registration with email verification and pending-approval workflow.* Rejected for scope reasons: requires email verification flow, anti-fraud measures, and handling of an intermediate state where a `User` exists without a linked `ServiceProvider`. This complexity is not justified for the project's purpose.
- *Hybrid (admins can create, providers can also self-register).* Rejected: the worst of both worlds — full self-registration complexity plus the maintenance burden of two parallel onboarding paths.

**Consequences.**

- The `created_by` audit column on `ServiceProvider` is always populated and always references an administrator user. The application enforces this invariant.
- The flow is documented in `business-rules.md` as part of the user role model.
- Adding self-registration in the future would be a new feature, requiring a deliberate decision and probably a new endpoint set rather than a modification of existing endpoints.

### Vehicle Type as Enum, Not Separate Table

**Context.** Vehicles in the system belong to a small set of categories (car, van, truck, motorcycle). The category influences how the vehicle is described but does not currently influence required documents or business rules.

**Decision.** Model `vehicle_type` as a `VARCHAR` column with a CHECK constraint enumerating the allowed values, on the `vehicles` table itself. No `vehicle_types` lookup table.

**Alternatives considered.**

- *Separate `vehicle_types` lookup table.* Rejected: would store four constant strings as table rows for no behavioral payoff. Adds joins to listings and queries for no integrity gain that the CHECK constraint does not already provide.
- *PostgreSQL `ENUM` type.* Rejected: PostgreSQL native enums are awkward to evolve via migrations (adding a value requires explicit `ALTER TYPE`). VARCHAR + CHECK gives equivalent constraint with simpler evolution.

**Consequences.**

- A lookup table can be introduced later if vehicle type ever needs to carry its own attributes (for example, type-specific required documents). At that point the migration is straightforward: create the table, backfill from the existing CHECK values, replace the CHECK with an FK.
- The enum CHECK is documented in `database-model.md`. Any change to the allowed values requires a migration.

### Audit Fields

Provider creation, approval, and ongoing status changes are the most consequential state transitions in the system. The schema captures `created_by`, `approved_at`, `approved_by`, and `status_changed_at` on `service_providers` to record these transitions. Documents carry `uploaded_by` to identify the user who provided each file.

A generic audit log table is intentionally out of scope. The targeted fields cover the system's actual audit needs.

## Business Logic Highlights

### Compliance Computation

The endpoint `GET /providers/:id/compliance` computes compliance on demand. It does not query a stored compliance column; the result is always fresh.

The service walks the provider's required documents (own `tax_id`, each active employee's required documents, each active vehicle's required documents), classifies each as `present`, `missing`, `expired`, or `expiring_soon` (less than 30 days to `expires_at`), and returns a structured response.

This design choice — computation over storage — avoids the cache invalidation problems that come with a denormalized compliance column. The endpoint runs a bounded number of queries and is fast enough for the scale of this project.

### Document Expiration Job

A daily cron job runs at 03:00 UTC, scans `documents WHERE status = 'active' AND expires_at < NOW()`, and transitions matching rows to `status = 'expired'`. This is the only automatic business-logic status transition in the system.

The job uses `node-cron` for scheduling. There is no distributed lock or job queue: a single process runs the job, which is acceptable because the project deploys as a single instance. If the project later scaled to multiple instances, this assumption would need to be revisited.

### Demo Data Reset Job

A second cron job runs daily at 04:00 UTC **only when `NODE_ENV === 'production'`** (i.e., on the deployed demo instance). It clears non-seed data and re-runs the seeders, producing a clean demo state for portfolio visitors. This job does not run in development or test environments.

Concretely, the job:

1. Deletes all `Document`, `Employee`, `Vehicle`, and `ServiceProvider` records (in dependency order to respect foreign keys), except those created by the seeders.
2. Re-runs the demo seeders to recreate the demo administrator user, the demo provider user, and a small amount of representative demo data.

The Firebase users created by the seeders (`admin@demo.com`, `provider@demo.com`) persist across resets — the seeder is idempotent in Firebase (`getUserByEmail` first, create only if missing). This means the documented demo credentials in the README continue to work after every reset.

Demo data created by visitors during testing **does not persist** through this reset. The README's Demo Access section documents this clearly so visitors do not store anything meaningful in the instance.

### Status Transitions with Auditing

Provider status transitions (`pending → approved`, `pending → inactive`, `approved → inactive`, `inactive → approved`) are exposed via dedicated endpoints rather than generic `PATCH /providers/:id`. This makes the transitions discoverable, audit-loggable, and easier to validate.

Each transition endpoint updates the appropriate audit fields (`approved_at` and `approved_by` for approval; `status_changed_at` for others) atomically with the status change.

## File Storage

**Decision.** Files upload directly to AWS S3 using `multer-s3`. Only metadata and the S3 URL are stored in the database.

**Accepted file types.** PDF, PNG, JPG.

**Maximum file size.** 5 MB per file.

**Alternatives considered.**

- *Local file storage with later migration to S3.* Rejected: introduces a code path that gets thrown away. Going directly to S3 avoids the rework and matches production patterns from the start.
- *Database BLOB storage.* Rejected: bloats the database, complicates backups, and is poor practice for binary content.

**Consequences.**

- The S3 bucket is configured with no public read access. The application generates signed URLs on demand for authorized download requests.
- The S3 key follows a predictable pattern: `documents/{service_provider_id}/{document_type}/{document_id}.{ext}`.
- Upload is a two-stage process at the controller level: multer-s3 handles the file stream to S3, then the controller persists the document metadata.
- File validation (MIME type, extension, size) is enforced by multer's fileFilter and limits options before any S3 upload occurs.

## API Conventions

### RESTful Resource Design

Endpoints follow REST conventions: nouns for resources, HTTP verbs for actions. Status transitions on providers are exceptions exposed as sub-resources (`POST /providers/:id/approve`, `POST /providers/:id/deactivate`) rather than coerced into PATCH.

### Pagination

All list endpoints support pagination via query parameters:

- `?page=1` (1-indexed, default `1`)
- `?limit=20` (default `20`, maximum `100`)

The response envelope is consistent:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "total_pages": 8
  }
}
```

Offset-based pagination was chosen over cursor-based because the dataset is small, admin-oriented, and the offset pattern is universally recognizable. Cursor pagination would be appropriate at a different scale; it is not justified here.

### Filtering

List endpoints accept resource-appropriate filter parameters: `?status=approved`, `?country=BR` on providers; `?status=active` on employees and vehicles; `?document_type=driver_license&status=expired` on documents. Filters are validated and combine with `AND` semantics.

### Error Response Format

All error responses follow a single shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the error",
    "details": { "field": "tax_id", "reason": "invalid format for country BR" }
  }
}
```

`code` is a stable machine-readable identifier from a fixed enum (`VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `DUPLICATE_RESOURCE`, `INTERNAL_ERROR`, etc.). The HTTP status code is set in the response header; `code` carries the semantic meaning. `details` is optional and may carry validation-specific or context-specific information.

A central error-handling middleware catches all errors and produces this format. Throwing typed application errors from services (e.g., `throw new ResourceNotFoundError(...)`) is the normal flow.

### Naming Conventions

- Database columns: `snake_case`.
- JavaScript variables, properties, and JSON request/response bodies: `camelCase`.
- Sequelize models map between the two via the `field` mapping option.

This split is deliberate: PostgreSQL conventions favor `snake_case`, JavaScript and JSON conventions favor `camelCase`. Doing the translation at the ORM boundary keeps each ecosystem idiomatic.

## Quality and Tooling

### Validation: Zod

Request validation is performed by Zod schemas in `validations/`. A generic validation middleware applies a schema to the request body, params, or query before the controller runs. Validation errors are mapped to the standard error format with `code: "VALIDATION_ERROR"`.

### Testing: Jest

Unit tests cover services using Jest. Tests focus on business logic: tax ID validation per country, compliance computation, status transitions, document expiration logic, polymorphic document linkage validation. Models and controllers are not tested in isolation; the services are the meaningful unit.

Integration tests are intentionally out of scope for the MVP. They may be added later for authentication flows if time permits.

### API Documentation: Swagger

OpenAPI documentation is generated using `swagger-jsdoc` from JSDoc annotations on routes and controllers. The interactive Swagger UI is served at `/docs` in non-production environments.

This places the documentation next to the code, which reduces drift. The generated `openapi.json` is committed to the repository so changes are visible in pull requests.

### Linting: ESLint

ESLint with a standard configuration (Airbnb base or similar) enforces consistency. The lint step runs in CI.

### Observability: Sentry + morgan

Sentry handles error tracking and exception monitoring. The Sentry SDK is initialized at application startup; `Sentry.Handlers.requestHandler()` and `Sentry.Handlers.errorHandler()` are wired into the Express middleware chain.

Morgan handles HTTP access logging in `combined` format, writing to stdout. The deployment platform captures stdout for log retention.

A separate application logger (pino, winston) is intentionally omitted. Business events that matter for audit are captured in dedicated database columns (`approved_at`, `approved_by`, `uploaded_by`, `status_changed_at`) rather than in log lines.

## Infrastructure

### Docker

The application ships with a multi-stage `Dockerfile`:

- Build stage: installs all dependencies including `devDependencies`, runs the build if any, prunes to production dependencies.
- Runtime stage: minimal Node.js image, copies the pruned application, runs as a non-root user.

A `docker-compose.yml` defines two services: the API container and a PostgreSQL container. A named volume persists Postgres data between `docker-compose down` and `docker-compose up`. Environment variables are loaded from a `.env` file (not committed; `.env.example` is committed).

A `.dockerignore` excludes `node_modules`, `.git`, `.env`, logs, and test outputs.

### Configuration: Environment Variables

All environment-dependent values come from environment variables, loaded by `dotenv` in development and provided directly by the platform in production. Required variables are documented in `.env.example` and validated at startup; the application fails fast if any required variable is missing.

The application reads `process.env` in exactly one place: `src/config/config.js`. Every other module — including external service initializers (`firebase.js`, `s3.js`, `sentry.js`) and the Sequelize config consumed by `sequelize-cli` — imports from there. This single-source pattern makes the application's external dependencies explicit, makes startup validation enforceable in one place, and prevents env references from leaking into business logic.

The Sequelize production configuration uses `use_env_variable: 'DATABASE_URL'` rather than discrete `DB_*` variables, which is the documented Sequelize pattern for accepting a single connection URL. This is what allows the Render + Neon deployment to work without code changes between environments.

### Migrations: sequelize-cli

Schema changes are versioned migrations under `database/migrations/`. The `sync()` method is never used. Every migration has a tested `down`. The CI pipeline runs `npx sequelize-cli db:migrate` against an ephemeral database to confirm migrations are forward-applicable.

Seeders for development data are under `database/seeders/` and are run manually.

### Deployment: Render + Neon

**Context.** The project needs a hosting target that is genuinely free for portfolio use, supports Docker natively, and keeps the deployment artifact portable so the choice is not a lock-in.

**Decision.** Deploy the API container on Render and host the PostgreSQL database on Neon. Connect the two via the `DATABASE_URL` environment variable.

**Alternatives considered.**

- *Render + Render PostgreSQL.* Rejected. Render's free PostgreSQL tier expires 30 days after creation, after which the data is deleted. This is impractical for a portfolio link that should remain reachable indefinitely.
- *Heroku.* Rejected. Heroku removed its free tier in 2022. The minimum monthly cost for an equivalent Node.js + PostgreSQL setup is around $12, which is not justified for a portfolio project.
- *Railway.* Acceptable but uses a trial credit model that runs out within weeks of always-on operation. Less suitable for a link that needs to stay live for months.
- *Self-hosted on a VPS (Hetzner, DigitalOcean droplet).* Rejected. Adds operational overhead (SSL provisioning, systemd, log rotation, security patching) that is outside the scope this project intends to demonstrate.
- *AWS ECS / Fargate, Google Cloud Run.* Acceptable for production scenarios but introduces setup complexity (IAM, networking, container registry) that does not pay off for the portfolio target.

**Consequences.**

- The application supports two database connection modes. `DATABASE_URL` is used in production (Render → Neon) and takes precedence. The individual `DB_*` variables are used in local development to match the `docker-compose.yml` setup.
- The Docker image built from `Dockerfile` is unchanged across environments. Only environment variables differ.
- The Render free web service spins down after 15 minutes of inactivity, producing a 30-60 second cold start on the first subsequent request. This is acceptable for a portfolio reviewer but documented in the README so the behavior is not mistaken for a bug.
- The deployment is portable. The same Docker image runs on Railway, Fly.io, Cloud Run, or any other container host. Migration of either component (API host or database host) is a configuration change, not a code change.

## Non-Goals

These items are deliberately out of scope for this project. They are listed so reviewers understand the choice was intentional, not an oversight.

- Microservices, service mesh, or any distributed system pattern.
- Event-driven architecture, message brokers, or asynchronous workflows beyond the scheduled jobs.
- Kubernetes or any orchestration beyond docker-compose.
- Multi-tenancy beyond the existing provider scoping.
- Real-time features (WebSockets, server-sent events).
- Payment processing or billing integration.
- Email or SMS delivery. The `passwordSetupLink` from `POST /providers` is returned in the response body for the administrator to forward through their preferred channel; no SMTP, SES, SendGrid, Twilio, or similar service is integrated.
- Internationalization or localization of the API surface.
- An audit log table (the targeted audit columns are sufficient).
- Cursor-based pagination (offset is sufficient at this scale).
- A separate application logger (Sentry plus audit columns are sufficient).

If any of these become relevant in the future, they would be added with an explicit decision, not assumed.

## Development Methodology

This project was developed with AI assistance (Claude) used as a productivity tool. AI helped with:

- Researching technical alternatives and trade-offs.
- Drafting initial documentation that I then reviewed and refined.
- Generating boilerplate code structures that I reviewed and adjusted before committing.
- Reviewing code for issues and edge cases.
- Brainstorming naming and structural alternatives.

I was responsible for:

- All architectural decisions, including every choice documented in this file.
- Business rules, domain modeling, and validation logic.
- Database schema design, including constraints and indexing strategy.
- Security decisions (authentication model, scoping rules, file storage access patterns).
- Code review and acceptance of every line that landed in the repository.
- Testing strategy and the test cases that were written.
- All trade-offs explicitly documented as "alternatives considered" in this document.

The workflow was deliberate: decisions were defined before code. Each decision documented here was made by me, evaluated against alternatives by me, and committed to the project by me. AI accelerated execution; it did not replace engineering judgment.

I include this note because honest disclosure of AI usage is more valuable than pretending it did not happen. The goal of this project is to demonstrate technical reasoning and discipline. The AI is a tool I used to be more productive while applying that reasoning and discipline.
