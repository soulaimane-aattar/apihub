const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const MIGRATION_LOCK_KEY = 84732019;
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const MIGRATION_FILE_REGEX = /^(\d{8}_\d{3}_[a-z0-9_]+)\.sql$/i;
const DESCRIPTION_REGEX = /^\s*--\s*description:\s*(.+)\s*$/im;

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      description TEXT NOT NULL DEFAULT '',
      checksum TEXT,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await client.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS description TEXT");
  await client.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT");
  await client.query("UPDATE schema_migrations SET description = '' WHERE description IS NULL");
  await client.query("ALTER TABLE schema_migrations ALTER COLUMN description SET NOT NULL");
}

function getDescription(sql, fallback) {
  const match = sql.match(DESCRIPTION_REGEX);
  if (!match) {
    return fallback;
  }

  return match[1].trim();
}

function getChecksum(sql) {
  return crypto.createHash("sha256").update(sql, "utf8").digest("hex");
}

async function loadMigrations() {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && MIGRATION_FILE_REGEX.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const migrations = [];

  for (const filename of files) {
    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const sql = await fs.readFile(fullPath, "utf8");
    const version = filename.replace(/\.sql$/i, "");

    migrations.push({
      filename,
      version,
      description: getDescription(sql, `Migration ${version}`),
      checksum: getChecksum(sql),
      sql,
    });
  }

  return migrations;
}

async function applyMigration(client, migration) {
  const existingResult = await client.query(
    "SELECT checksum FROM schema_migrations WHERE version = $1",
    [migration.version]
  );

  if (existingResult.rowCount > 0) {
    const existingChecksum = existingResult.rows[0].checksum;

    if (existingChecksum && existingChecksum !== migration.checksum) {
      throw new Error(`Checksum mismatch for migration ${migration.version}`);
    }

    if (!existingChecksum) {
      await client.query(
        "UPDATE schema_migrations SET checksum = $2, description = $3 WHERE version = $1",
        [migration.version, migration.checksum, migration.description]
      );
    }

    return { applied: false };
  }

  await client.query(migration.sql);
  await client.query(
    "INSERT INTO schema_migrations (version, description, checksum) VALUES ($1, $2, $3)",
    [migration.version, migration.description, migration.checksum]
  );

  return { applied: true };
}

async function applyFileMigrations(client, { logger } = {}) {
  await ensureMigrationsTable(client);
  await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_KEY]);

  const migrations = await loadMigrations();

  for (const migration of migrations) {
    const result = await applyMigration(client, migration);

    if (!logger) {
      continue;
    }

    if (result.applied) {
      logger.info({ version: migration.version }, "Applied migration");
    } else {
      logger.debug({ version: migration.version }, "Migration already applied");
    }
  }
}

module.exports = {
  applyFileMigrations,
};
