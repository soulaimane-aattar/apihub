const bcrypt = require("bcrypt");
const { pool } = require("../../db");

const parsedSaltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
const SALT_ROUNDS = Number.isInteger(parsedSaltRounds) && parsedSaltRounds >= 10 ? parsedSaltRounds : 12;

async function createUser(email, password, metadata = {}) {
  const normalizedEmail = email.trim().toLowerCase();
  // const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const normalizedMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  const result = await pool.query(
    "INSERT INTO users (email, password_hash, metadata) VALUES ($1, $2, $3::jsonb) RETURNING id",
    [normalizedEmail, password, normalizedMetadata]
  );

  return result.rows[0];
}

module.exports = {
  createUser,
};
