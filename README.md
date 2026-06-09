# Service Provider API

A backend service for managing outsourced service providers, their employees, vehicles, and compliance documents. The system centralizes the validation of operational records and computes provider compliance status from required documents and their expiration dates.

This project is built as a portfolio demonstration of backend development at the junior-advanced to mid-level range, with realistic business rules and modern tooling. It is **not** intended to be an ambitious distributed system; it is intended to be a clean, focused, well-documented backend.

## Features

- Firebase Authentication for identity, with token verification on the API.
- Role-based access (`admin`, `provider`) with strict per-provider data scoping.
- CRUD for providers, employees, vehicles, and documents.
- Direct file upload to AWS S3, with metadata persisted in PostgreSQL.
- Compliance computation per provider, including missing, expired, and soon-to-expire documents.
- Daily scheduled job that marks expired documents.
- Soft-delete via explicit status fields; historical records are preserved.
- Audited status transitions on provider approval and deactivation.
- Polymorphic document model with database-level integrity constraints.
- Standardized error format, pagination, filtering across list endpoints.
- OpenAPI documentation generated from code.
- Error tracking via Sentry; access logs via morgan.
- Dockerized for one-command local setup.

## Tech Stack

- **Runtime:** Node.js, Express
- **Database:** PostgreSQL with Sequelize ORM
- **Authentication:** Firebase Authentication (Admin SDK for verification)
- **File storage:** AWS S3 (`multer-s3`)
- **Validation:** Zod
- **Documentation:** Swagger (`swagger-jsdoc`)
- **Observability:** Sentry, morgan
- **Scheduling:** node-cron
- **Testing:** Jest
- **Containerization:** Docker, docker-compose

## Project Structure

```
.
├── src/
│   ├── controllers/         # HTTP layer: parse, validate, delegate
│   ├── services/            # Business logic
│   ├── models/              # Sequelize models
│   ├── routes/              # Express routers
│   ├── middlewares/         # Auth, error handling, validation
│   ├── validations/         # Zod schemas
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── jobs/                # node-cron scheduled jobs
│   ├── config/              # Centralized env loading + service initializers
│   └── utils/               # Shared helpers, custom error classes
├── docs/
│   ├── architecture.md      # Technical decisions and rationale
│   ├── business-rules.md    # Domain model and validation rules
│   └── database-model.md    # Schema, ERD, and constraints
├── tests/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── .env.example
├── .gitignore
├── .sequelizerc
├── instrument.js            # Sentry initialization (loads before server.js)
├── server.js                # Application entry point
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 20.x or later
- Docker and Docker Compose
- A Firebase project with Authentication enabled and a service account JSON
- An AWS account with an S3 bucket and IAM credentials

### Setup

Clone the repository and copy the environment template:

```bash
git clone https://github.com/leite-leo/service-provider-api.git
cd service-provider-api
cp .env.example .env
```

Fill in the values in `.env` (see [Environment Variables](#environment-variables)).

### Run with Docker

The simplest path is Docker Compose, which starts the API and PostgreSQL together:

```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`. The Swagger UI is at `http://localhost:3000/docs`.

To run migrations and seeders inside the running container:

```bash
docker-compose exec api npx sequelize-cli db:migrate
docker-compose exec api npx sequelize-cli db:seed:all
```

### Run Locally Without Docker

Make sure a PostgreSQL instance is running and accessible with the credentials in your `.env`. Then:

```bash
npm install
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
```

## Environment Variables

| Variable                     | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `PORT`                       | API listen port                                  |
| `NODE_ENV`                   | `development` / `test` / `production`            |
| `DATABASE_URL`               | Full PostgreSQL connection URL (used in production; takes precedence over `DB_*` variables) |
| `DB_HOST`                    | PostgreSQL host (used in local development)      |
| `DB_PORT`                    | PostgreSQL port (used in local development)      |
| `DB_NAME`                    | Database name (used in local development)        |
| `DB_USER`                    | Database user (used in local development)        |
| `DB_PASSWORD`                | Database password (used in local development)    |
| `FIREBASE_PROJECT_ID`        | Firebase project ID                              |
| `FIREBASE_CLIENT_EMAIL`      | Firebase service account email                   |
| `FIREBASE_PRIVATE_KEY`       | Firebase service account private key             |
| `AWS_ACCESS_KEY_ID`          | AWS IAM access key                               |
| `AWS_SECRET_ACCESS_KEY`      | AWS IAM secret                                   |
| `AWS_REGION`                 | S3 region                                        |
| `AWS_BUCKET_NAME`            | S3 bucket for document uploads                   |
| `SENTRY_DSN`                 | Sentry DSN (optional in development)             |

A complete template is in `.env.example`. The application validates required variables at startup and fails fast if any are missing.

## API Documentation

### Endpoints

```
Auth & User
GET    /me                              Current authenticated user

Providers
GET    /providers                       [admin]
GET    /providers/:id
POST   /providers                       [admin] — creates Firebase user, returns passwordSetupLink in body
POST   /providers/:id/approve           [admin]
POST   /providers/:id/deactivate        [admin]
POST   /providers/:id/regenerate-invite [admin] — new passwordSetupLink for an existing provider user
GET    /providers/:id/compliance        Computed compliance status

Employees                               (provider role sees only own resources)
GET    /employees
GET    /employees/:id
POST   /employees
PATCH  /employees/:id
DELETE /employees/:id                   Soft delete (status → inactive)

Vehicles                                (provider role sees only own resources)
GET    /vehicles
GET    /vehicles/:id
POST   /vehicles
PATCH  /vehicles/:id
DELETE /vehicles/:id                    Soft delete (status → inactive)

Documents                               (provider role sees only own resources)
POST   /documents                       Multipart upload
GET    /documents/:id
DELETE /documents/:id                   Soft delete (status → archived)
```

All endpoints require a valid Firebase ID token in the `Authorization` header. List endpoints (`GET /providers`, `GET /employees`, etc.) support pagination via `?page=1&limit=20` and resource-appropriate filtering (`?status=approved`, `?country=BR`, `?document_type=driver_license`).

**On provider creation:** `POST /providers` orchestrates the creation of the Firebase Authentication account for the provider's representative (without password) and returns a `passwordSetupLink` in the response body. The administrator forwards this link to the representative through any preferred channel; the system does not send emails. See [docs/business-rules.md](docs/business-rules.md) for the full onboarding flow and [docs/architecture.md](docs/architecture.md) for the design rationale.

### Interactive documentation

OpenAPI (Swagger) is generated from JSDoc annotations in the route and controller files. The interactive UI is served at `/docs` when the server is running (non-production environments). Full request and response schemas, including the standardized error format, are documented there.

For the error response shape, pagination envelope, and permission model in detail, see [docs/architecture.md](docs/architecture.md) and [docs/business-rules.md](docs/business-rules.md).

## Demo Access

This API is deployed for live demonstration. The seed data includes pre-created demo accounts so you can authenticate and exercise the endpoints immediately, without running the system locally.

**Demo administrator**

- Email: `admin@demo.com`
- Password: `DemoAdmin123!`

**Demo provider**

- Email: `provider@demo.com`
- Password: `DemoProvider123!`

### Obtaining a Firebase ID token

The API verifies Firebase ID tokens but does not issue them — authentication runs entirely through Firebase. To obtain a token for the demo accounts, call the Firebase Authentication REST API directly:

```bash
curl -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=FIREBASE_WEB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "DemoAdmin123!",
    "returnSecureToken": true
  }'
```

The Firebase Web API Key for this project will be published here after deployment. Firebase Web API Keys are intentionally public — they identify the project but do not grant access.

The response includes an `idToken`. Use it in the `Authorization: Bearer <idToken>` header for subsequent API requests. The token expires in 1 hour; the response also includes a `refreshToken` you can exchange for a new ID token if needed.

You can also paste the token directly into Swagger UI (`/docs`) by clicking *Authorize* and entering `Bearer <idToken>`.

### Demo reset

This is a demo environment. **All non-seed data is automatically reset every 24 hours** by a scheduled job that runs at 04:00 UTC. Any providers, employees, vehicles, or documents you create during testing will be removed by the next reset. Do not store anything meaningful in this instance.

The seed admin and provider accounts (and their Firebase users) persist through resets, so the credentials above remain valid indefinitely.

The Firebase project and S3 bucket used by this deployment are dedicated to the demo and isolated from any production resources.

## Testing

Unit tests live under `tests/` and cover business logic in the service layer:

```bash
npm test
```

Tests target tax ID validation per country, compliance computation, status transitions, document expiration logic, and the polymorphic document linkage rules.

## Deployment

The project is configured to deploy on **Render** for the API container and **Neon** for the PostgreSQL database. This combination provides a permanent free tier suitable for portfolio and demo purposes, with no credit card required for either service.

### Why Render + Neon instead of Render alone

Render offers a free PostgreSQL tier, but it expires 30 days after creation, after which the data is deleted. For a portfolio project that should remain accessible indefinitely, this is impractical. Neon provides a serverless PostgreSQL with a permanent free tier (500 MB storage), no expiration, and works seamlessly as an external database via a single `DATABASE_URL` environment variable.

Using an external database provider also reflects a realistic production pattern: in real deployments, the application and the database are independently managed services.

### Step 1 — Provision the database on Neon

1. Create a Neon account at [neon.tech](https://neon.tech) (no credit card).
2. Create a new project. Select the region closest to where Render will host the API.
3. Copy the connection string from the project dashboard. It will look like `postgresql://user:password@host/database?sslmode=require`.

### Step 2 — Deploy the API on Render

1. Create a Render account at [render.com](https://render.com) (no credit card).
2. Connect the GitHub repository for this project.
3. Create a new **Web Service** from the repository. Render detects the `Dockerfile` automatically.
4. Set the environment variables in the Render dashboard:
   - `NODE_ENV=production`
   - `DATABASE_URL` — paste the Neon connection string from Step 1
   - All `FIREBASE_*` variables from your Firebase service account
   - All `AWS_*` variables for the S3 bucket
   - `SENTRY_DSN` if Sentry is enabled
5. Deploy. Render builds the Docker image and starts the container. The API will be available at `https://<service-name>.onrender.com`.

### Step 3 — Run migrations

After the first deploy, run migrations against the Neon database. The simplest path is from your local machine, pointing at the production `DATABASE_URL`:

```bash
DATABASE_URL="<neon connection string>" npx sequelize-cli db:migrate
```

Seeders can be run the same way if demo data is desired.

### Caveats

- Render's free web service spins down after 15 minutes of inactivity. The first request after spin-down takes about 30 to 60 seconds (cold start). This is acceptable for a portfolio link reviewers will visit occasionally; it is not suitable for production traffic.
- Render's free tier provides 750 instance-hours per month per workspace, enough for one always-on service.
- Neon's free tier provides 500 MB of database storage, well above what this project will use.
- Neither tier requires a credit card, which keeps the project genuinely free to keep online.

### Other compatible platforms

The project's Docker setup is platform-agnostic. The same image runs on Railway, Fly.io, Google Cloud Run, AWS ECS, or any other Docker-compatible host. The only Render-specific guidance above is the dashboard workflow; the underlying deployment artifact (the Docker image built from `Dockerfile`) is portable.

## Documentation

Detailed documentation is split across three focused files in `docs/`:

- **[docs/business-rules.md](docs/business-rules.md)** — domain context, entities, validation rules, status definitions, document rules, compliance logic, permission matrix.
- **[docs/architecture.md](docs/architecture.md)** — technical decisions with context, alternatives considered, and trade-offs. Modular monolith with MSC, Firebase Auth rationale, polymorphic document constraint, compliance computation strategy, observability setup.
- **[docs/database-model.md](docs/database-model.md)** — schema, ERD, indexes, partial unique indexes for the one-active-document rule, naming conventions, migration strategy.

## Development Methodology

This project was developed with AI assistance (Claude) used as a productivity tool. AI helped with researching alternatives, drafting documentation, generating boilerplate code, and reviewing code for issues. I was responsible for all architectural decisions, business rules, data modeling, validation logic, security decisions, and code review of every line that landed in the repository. AI accelerated execution; it did not replace engineering judgment.

For a more detailed account of the workflow, see the *Development Methodology* section in [docs/architecture.md](docs/architecture.md).

## Roadmap

### MVP

- Authentication and user management.
- Provider, employee, vehicle CRUD with relationships and validation.
- Standardized error format, pagination, filtering.

### v1.1

- Document upload to S3.
- Compliance computation endpoint.
- Daily expiration job.

### v1.2

- Swagger documentation.
- Sentry integration.
- Deployment to Render with Neon-hosted PostgreSQL.
- Seed data for demo purposes.

### Explicitly out of scope

Microservices, event-driven architecture, real-time features, payment integration, and multi-tenancy are deliberately not part of this project. See *Non-Goals* in [docs/architecture.md](docs/architecture.md).

## License

MIT
