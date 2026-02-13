const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_INIT_RETRIES = 10;
const DEFAULT_RETRY_DELAY_MS = 2000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function initDatabase(
  {
    maxRetries = parsePositiveInt(process.env.DB_INIT_MAX_RETRIES, DEFAULT_INIT_RETRIES),
    retryDelayMs = parsePositiveInt(process.env.DB_INIT_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS),
    logger,
  } = {}
) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    let client;

    try {
      client = await pool.connect();
      await client.query("SELECT 1");
      return;
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries) {
        if (logger) {
          logger.warn(
            { attempt, maxRetries, retryDelayMs, err },
            "Database initialization failed, retrying"
          );
        }
        await wait(retryDelayMs);
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  throw lastError;
}

module.exports = {
  pool,
  initDatabase,
};
