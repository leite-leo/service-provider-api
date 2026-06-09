# Business Rules

This document defines the business context, domain entities, validation rules, status definitions, document rules, compliance logic, and permission rules that govern the Service Provider API.

## Business Context

The platform manages outsourced service providers contracted by a hiring company. Each provider may employ workers and operate vehicles to execute services. The platform centralizes management and validation of operational and compliance records, exposing a RESTful API consumed by web dashboards, mobile applications, and internal systems.

The hiring company needs to ensure that every contracted provider remains compliant: required documents must be present, valid, and not expired. Non-compliant providers should be visible to administrators so corrective action can be taken before contractual or legal exposure arises.

## User Roles and Authentication Model

The platform has two authenticated roles and one unauthenticated entity type.

**Administrator** — has full access to every provider, employee, vehicle, and document in the system. Approves or deactivates providers, monitors compliance across the platform.

**Service Provider** — represents a provider company user. Authenticated users in this role can manage only the resources that belong to their own company: their employees, their vehicles, their documents. They cannot see or affect other providers.

**Employee** — represents a worker linked to a provider. Employees are operational records, not platform users. They do not have credentials, do not log in, and do not interact with the API directly. They exist as data managed by providers and administrators.

## Provider Onboarding Flow

The platform follows an **admin-onboarding** model. Provider companies do not register themselves through the API; instead, administrators create provider records on their behalf, based on commercial agreements established outside the system.

The flow is:

1. An administrator collects the provider's company data (corporate name, tax ID, country, contact information, address) and the representative's email through an external channel.

2. The administrator creates the provider via `POST /providers`. The backend orchestrates four operations as a coordinated unit:
   - Creates the `ServiceProvider` record with `status = pending` and `created_by` set to the administrator user id.
   - Creates the Firebase Authentication account for the representative using the Admin SDK (`admin.auth().createUser({ email, displayName })`). The account is created **without a password** — the representative will define one in the next step.
   - Creates the local `User` record with the `firebase_uid` returned by Firebase, role `provider`, and `service_provider_id` linked to the new provider.
   - Generates a password setup link via `admin.auth().generatePasswordResetLink(email)` and returns it as `passwordSetupLink` in the response body, alongside the created `provider` and `user` objects.

   Because Firebase Authentication and Postgres cannot share a transaction, the orchestration uses a saga-style compensating action: if the database transaction fails after the Firebase user is created, the Firebase user is deleted (`admin.auth().deleteUser`) before the error response is returned. This pattern is documented in `architecture.md`.

3. The administrator delivers the password setup link to the representative through an external channel — email, messaging app, or any preferred medium. **Email delivery is intentionally out of scope** for this system; the backend returns the link in the API response and the administrator forwards it manually. This decision is documented in `architecture.md`.

4. The representative opens the link, defines a password on the Firebase-hosted page, and signs in with their email and the password they just defined. They obtain a Firebase ID token from the client SDK and use it as the `Authorization: Bearer <token>` header for all subsequent API calls. The local `User` record already exists and is already linked to the `ServiceProvider`; no additional sync is needed.

5. The administrator reviews the provider's submitted documents and transitions the status from `pending` to `approved` via `POST /providers/:id/approve` (recording `approved_at` and `approved_by`).

6. The approved provider operates the system within its scoped permissions.

**Self-registration is explicitly out of scope.** This decision keeps the model simpler (no email verification flows, no anti-fraud measures, no intermediate states where a `User` exists without a `ServiceProvider`) and reflects a realistic B2B scenario where contractor relationships are established before system access is granted.

As a consequence, the `created_by` audit field on `ServiceProvider` is always populated and always refers to an administrator.

### Regenerating the Password Setup Link

The default Firebase expiration for password setup links is one hour. If the representative does not complete the setup in time, or if the link is lost in transit, an administrator can regenerate it via `POST /providers/:id/regenerate-invite`. The endpoint generates a new link for the linked `User` and returns it in the response body.

The same endpoint also serves as an admin-triggered password reset for representatives who have already set their password but lost access. The Firebase API used (`generatePasswordResetLink`) behaves identically for first-time setup and subsequent resets; the page the representative sees prompts them to define a new password either way.

Rate limiting on this endpoint and revocation of existing sessions (`admin.auth().revokeRefreshTokens`) are intentionally out of scope for the current implementation. Both can be added later without architectural change.

## Entities and Relationships

The system has five primary entities. Their relationships are documented in detail in `database-model.md`; this section describes their domain meaning.

**User** — represents an authenticated account. Holds the link to Firebase Authentication (via `firebase_uid`), the application-level role (`admin` or `provider`), and optionally a reference to a `ServiceProvider` when the role is `provider`.

**ServiceProvider** — represents a contracted provider company. Holds corporate identification data (corporate name, tax identification, country, contact information) and operational status. A provider has many employees, many vehicles, and many documents.

**Employee** — represents a worker linked to a provider. Holds personal identification and role information. An employee belongs to exactly one provider.

**Vehicle** — represents an operational vehicle linked to a provider. Holds vehicle identification (VIN, license plate, make, model, vehicle type, year). A vehicle belongs to exactly one provider.

**Document** — represents a compliance file uploaded to the system. A document is always linked to a provider, and optionally to either an employee or a vehicle within that provider. Documents are stored in S3; the database stores metadata and the file URL.

## Validation Rules

### BR001 — Tax Identification and Country

A provider must have a valid `tax_id` value linked to a supported country.

- **BR001.1** — The `country` field must be one of the supported ISO 3166-1 alpha-2 codes: `BR`, `US`, `DE`, `GB`, `FR`.
- **BR001.2** — The `tax_id` value must match the regular expression defined for the selected country (see table below).
- **BR001.3** — Requests with unsupported countries or `tax_id` values that fail the regex must be rejected with HTTP 400 and the standard error format.

Supported `tax_id` formats:

| Country | Identifier      | Format                                          |
| ------- | --------------- | ----------------------------------------------- |
| BR      | CNPJ            | 14 digits, with or without punctuation          |
| US      | EIN             | 9 digits, format `XX-XXXXXXX`                   |
| DE      | USt-IdNr        | `DE` followed by 9 digits                       |
| GB      | VAT Number      | `GB` followed by 9 digits                       |
| FR      | TVA             | `FR` followed by 2 alphanumeric and 9 digits    |

### BR002 — Vehicle Identification

- **BR002.1** — `license_plate` must contain between 4 and 10 alphanumeric characters.
- **BR002.2** — `vin` must contain exactly 17 characters.
- **BR002.3** — Duplicate license plates are not allowed across the platform.

### BR003 — Email Uniqueness

Email addresses must be unique across the `User` table. Employee email addresses do not need to be globally unique (employees are not authenticated), but should be unique within a provider.

### BR004 — Required Document Linkage

A document is always linked to a `service_provider_id`. Depending on its `document_type`, it may additionally link to either an `employee_id` or a `vehicle_id`. The combination must respect the polymorphic constraint defined in `database-model.md`.

### BR005 — Authentication Requirement

All endpoints except `POST /auth/login` and the health check require a valid Firebase ID token in the `Authorization` header. Missing or invalid tokens return HTTP 401.

### BR006 — Provider Scope Restriction

Authenticated providers can only access records that belong to their own company. Attempts to read, modify, or delete resources of a different provider must return HTTP 403, even if the resource exists.

### BR007 — Administrator Scope

Authenticated administrators can access and modify every resource in the system.

## Status Definitions

### Provider Status

A provider is one of:

- **`pending`** — initial state when a provider is created. Cannot operate; visible only to administrators.
- **`approved`** — active state. The provider can be assigned services. Records `approved_at` and `approved_by`.
- **`inactive`** — soft-deleted state. Records remain in the database; provider cannot operate. Records `status_changed_at` and `status_changed_by`.

Valid transitions:

- `pending → approved` (admin action)
- `pending → inactive` (admin action, rejection equivalent)
- `approved → inactive` (admin action, deactivation)
- `inactive → approved` (admin action, reactivation)

Every status transition records `status_changed_at` (timestamp) and `status_changed_by` (admin user id) on the provider. For `pending → approved`, `approved_at` and `approved_by` are additionally recorded as a permanent marker of the approval event.

### Employee and Vehicle Status

Employees and vehicles have a simpler lifecycle:

- **`active`** — operational and counted toward compliance.
- **`inactive`** — soft-deleted; ignored by compliance calculations.

### Document Status

Documents have an internal status used to enforce the one-active-document rule and to record automatic expiration:

- **`active`** — current valid document for its type.
- **`expired`** — automatically set by the daily expiration job when `expires_at` is in the past.
- **`archived`** — replaced by a newer document of the same type for the same entity.

## Document Rules

### One Active Document per Type per Entity

Each entity may have only one active document for each document type at any time.

- A provider may have only one active `tax_id` document.
- An employee may have only one active `government_id` document.
- An employee may have only one active `driver_license` document.
- A vehicle may have only one active `vehicle_registration` document.
- An employee may have only one active `employment_contract` document.

When a new document of the same type is uploaded for the same entity, the previous active document is automatically archived (status changes to `archived`). The new document becomes active.

### Document Type to Entity Mapping

| Document Type           | Owner Entity      | Expires |
| ----------------------- | ----------------- | ------- |
| `tax_id`                | ServiceProvider   | No      |
| `government_id`         | Employee          | Optional|
| `driver_license`        | Employee          | Yes     |
| `employment_contract`   | Employee          | Optional|
| `vehicle_registration`  | Vehicle           | Yes     |

### Document Expiration

Documents that expire (driver license, vehicle registration) must have a non-null `expires_at` field set on upload. Other document types may or may not have an expiration date depending on jurisdiction; the API accepts either case.

A scheduled job runs daily and transitions any active document whose `expires_at` is in the past to the `expired` status. This is the only automatic status transition in the system.

## Compliance Rules

A provider is considered **compliant** when all of the following conditions are met:

1. The provider has an `active` `tax_id` document.
2. Every `active` employee linked to the provider has an `active` `government_id` document.
3. Every `active` employee linked to the provider has an `active` `driver_license` document with `expires_at` in the future.
4. Every `active` employee linked to the provider has an `active` `employment_contract` document.
5. Every `active` vehicle linked to the provider has an `active` `vehicle_registration` document with `expires_at` in the future.

The compliance status is computed on demand by the endpoint `GET /providers/:id/compliance`, which returns:

- `is_compliant` — boolean
- `missing_documents` — list of required documents not present
- `expired` — list of documents that have already expired
- `expiring_soon` — list of documents whose `expires_at` is within the next 30 days

Compliance is computed in real time; it is not stored as a column on the provider. The single exception is that the daily job marks documents as `expired`, which affects subsequent compliance computations.

## Permission Rules

| Action                                | Admin | Provider (own resources) | Provider (other resources) |
| ------------------------------------- | :---: | :----------------------: | :------------------------: |
| List all providers                    |   ✓   |            ✗             |              ✗             |
| Read own provider                     |   ✓   |            ✓             |              ✗             |
| Create provider                       |   ✓   |            ✗             |              ✗             |
| Approve / deactivate provider         |   ✓   |            ✗             |              ✗             |
| Manage employees                      |   ✓   |            ✓             |              ✗             |
| Manage vehicles                       |   ✓   |            ✓             |              ✗             |
| Upload documents                      |   ✓   |            ✓             |              ✗             |
| View compliance status                |   ✓   |            ✓             |              ✗             |

All write operations on a provider, employee, vehicle, or document are scoped to the authenticated provider's own `service_provider_id`. Administrators bypass this scope.

## Soft Delete Policy

Records are never physically deleted from the database. Deactivation is represented by status fields (`inactive` for provider, employee, vehicle; `archived` for documents). This preserves auditability and historical context, and supports the rule that deleting a provider must not remove its documents.
