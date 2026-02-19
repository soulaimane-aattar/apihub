const { pool } = require("../../db");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
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

async function backfillMissingProfileFields(
  userId,
  { fullName, phoneNumber, dateOfBirth } = {}
) {
  if (!fullName && !phoneNumber && !dateOfBirth) {
    return false;
  }

  const result = await pool.query(
    `
      UPDATE users
      SET
        full_name = CASE
          WHEN (full_name IS NULL OR BTRIM(full_name) = '') AND $2::text IS NOT NULL THEN $2::text
          ELSE full_name
        END,
        phone_number = CASE
          WHEN (phone_number IS NULL OR BTRIM(phone_number) = '') AND $3::text IS NOT NULL THEN $3::text
          ELSE phone_number
        END,
        date_of_birth = CASE
          WHEN date_of_birth IS NULL AND $4::date IS NOT NULL THEN $4::date
          ELSE date_of_birth
        END
      WHERE id = $1
        AND (
          ((full_name IS NULL OR BTRIM(full_name) = '') AND $2::text IS NOT NULL)
          OR ((phone_number IS NULL OR BTRIM(phone_number) = '') AND $3::text IS NOT NULL)
          OR (date_of_birth IS NULL AND $4::date IS NOT NULL)
        )
    `,
    [userId, fullName, phoneNumber, dateOfBirth]
  );

  return result.rowCount > 0;
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
  const normalizedFullName = normalizeOptionalText(fullName);
  const normalizedPhoneNumber = normalizeOptionalText(phoneNumber);
  const normalizedDateOfBirth = normalizeOptionalText(dateOfBirth);

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
    const didBackfillProfile = await backfillMissingProfileFields(existingUser.id, {
      fullName: normalizedFullName,
      phoneNumber: normalizedPhoneNumber,
      dateOfBirth: normalizedDateOfBirth,
    });

    const passwordMatches = doesPasswordMatch(password, existingUser.password_hash);

    if (passwordMatches) {
      return { id: existingUser.id, status: "exists_password_match" };
    }

    if (!didBackfillProfile) {
      return { id: existingUser.id, status: "exists_password_mismatch_no_profile_update" };
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
