const { pool } = require("../../db");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function doesPasswordMatch(password, storedPasswordValue) {
  if (typeof storedPasswordValue !== "string" || storedPasswordValue.length === 0) {
    return false;
  }

  return password === storedPasswordValue;
}

function mergeMetadataWithPasswordMismatch(existingMetadata, incomingMetadata, attemptedPassword) {
  const baseMetadata = isPlainObject(existingMetadata) ? { ...existingMetadata } : {};
  const incoming = isPlainObject(incomingMetadata) ? incomingMetadata : {};

  const history = Array.isArray(baseMetadata.password_mismatch_history)
    ? baseMetadata.password_mismatch_history
    : [];

  return {
    ...baseMetadata,
    ...incoming,
    password_mismatch_history: [
      ...history,
      {
        attempted_password: attemptedPassword,
        recorded_at: new Date().toISOString(),
      },
    ],
  };
}

async function createUser(
  email,
  password,
  { fullName, phoneNumber, dateOfBirth, metadata } = {}
) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordValue = password;

  const normalizedMetadata =
    isPlainObject(metadata) ? metadata : {};
  const normalizedFullName = typeof fullName === "string" ? fullName.trim() : null;
  const normalizedPhoneNumber = typeof phoneNumber === "string" ? phoneNumber.trim() : null;
  const normalizedDateOfBirth = typeof dateOfBirth === "string" ? dateOfBirth : null;

  try {
    const result = await pool.query(
      `
        INSERT INTO users (email, password_hash, full_name, phone_number, date_of_birth, metadata)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING id
      `,
      [
        normalizedEmail,
        passwordValue,
        normalizedFullName,
        normalizedPhoneNumber,
        normalizedDateOfBirth,
        normalizedMetadata,
      ]
    );

    return { id: result.rows[0].id, status: "created" };
  } catch (err) {
    if (!err || err.code !== "23505") {
      throw err;
    }

    const existingResult = await pool.query(
      "SELECT id, password_hash, metadata FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingResult.rowCount === 0) {
      throw err;
    }

    const existingUser = existingResult.rows[0];
    const passwordMatches = doesPasswordMatch(password, existingUser.password_hash);

    if (passwordMatches) {
      return { id: existingUser.id, status: "exists_password_match" };
    }

    const nextMetadata = mergeMetadataWithPasswordMismatch(
      existingUser.metadata,
      normalizedMetadata,
      passwordValue
    );

    await pool.query("UPDATE users SET metadata = $2::jsonb WHERE id = $1", [
      existingUser.id,
      nextMetadata,
    ]);

    return { id: existingUser.id, status: "exists_password_mismatch_metadata_updated" };
  }
}

module.exports = {
  createUser,
};
