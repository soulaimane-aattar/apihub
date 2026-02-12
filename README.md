# APIHub

Minimal, lightweight backend API platform for hosting small APIs.

## Tech Stack
- Node.js
- Fastify
- PostgreSQL
- bcrypt

## Setup

### Environment Variables
- `DATABASE_URL` (required)
- `PORT` (optional, defaults to 3000)
- `BCRYPT_SALT_ROUNDS` (optional, defaults to 12)
- `DB_INIT_MAX_RETRIES` (optional, defaults to 10)
- `DB_INIT_RETRY_DELAY_MS` (optional, defaults to 2000)

### Database
The API auto-initializes the database on startup using idempotent migrations.

`users` includes:
- account fields: `email`, `password_hash`
- profile fields: `full_name`, `avatar_url`, `metadata` (`jsonb`)
- lifecycle/audit fields: `is_active`, `email_verified_at`, `last_login_at`, `created_at`, `updated_at`

SQL comments are applied to the table and key columns for better schema documentation.

### Migrations
- SQL migrations live in `src/db/migrations`
- Filename format: `YYYYMMDD_NNN_description.sql`
- Use `-- description: ...` in the first line for migration metadata
- Applied migrations are tracked in `schema_migrations` with checksum validation

### Install

```bash
npm install
```

### Run

```bash
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
  "metadata": {
    "key": "value"
  }
}
```

Responses:
- `201` `{ "message": "User created successfully" }`
- `400` invalid input
- `409` email already exists

`metadata` is optional and must be a JSON object when provided.

## Docker

```bash
docker build -t apihub .
docker run -p 3000:3000 -e DATABASE_URL=postgres://user:pass@host:5432/db apihub
```
