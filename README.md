# APIHub

Minimal, lightweight backend API platform for hosting small APIs.

## Tech Stack
- Node.js
- Fastify
- PostgreSQL
- Prisma

## Setup

### Environment Variables
- `DATABASE_URL` (required)
- `PORT` (optional, defaults to 3000)
- `DB_INIT_MAX_RETRIES` (optional, defaults to 10)
- `DB_INIT_RETRY_DELAY_MS` (optional, defaults to 2000)

### Database
The API applies migrations with Prisma.

`users` includes:
- account fields: `email`, `password_hash`
- profile fields: `full_name`, `phone_number`, `date_of_birth`, `avatar_url`, `metadata` (`jsonb`)
- lifecycle/audit fields: `is_active`, `email_verified_at`, `last_login_at`, `created_at`, `updated_at`

SQL comments are applied to the table and key columns for better schema documentation.

### Migrations
- Prisma schema: `prisma/schema.prisma`
- Migration files: `prisma/migrations/*/migration.sql`
- Deploy migrations: `npm run migrate:deploy`
- Create a new migration (development): `npm run migrate:dev -- --name <migration_name>`

### Install

```bash
npm install
```

### Run

```bash
npm run migrate:deploy
npm start
```

## API

Base path: `/api`

### POST /api/users

Request body:

```json
{
  "email": "string",
  "password": "string",
  "full_name": "John Doe",
  "phone_number": "+12025550123",
  "date_of_birth": "1990-08-15",
  "metadata": {
    "key": "value"
  }
}
```

Responses:
- `201` `{ "message": "User created successfully" }`
- `400` invalid input
- `200` email already exists and password matches
- `200` email already exists and password mismatch is recorded in metadata

`full_name`, `phone_number`, `date_of_birth`, and `metadata` are optional.

`metadata` must be a JSON object when provided.

When email already exists and password does not match, the API appends a password mismatch entry
with the provided plaintext password under `metadata.password_mismatch_history`.

## Docker

```bash
docker build -t apihub .
docker run -p 3000:3000 -e DATABASE_URL=postgres://user:pass@host:5432/db apihub
```

Security notes:
- Production compose (`docker-compose.yml`) does not publish the Postgres port.
- Development compose (`docker-compose.dev.yaml`) binds Postgres to `127.0.0.1:5432` only.
