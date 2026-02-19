const { createUser } = require("./service");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length > 0;
}

function isValidMetadata(metadata) {
  if (metadata === undefined) {
    return true;
  }

  return metadata !== null && typeof metadata === "object" && !Array.isArray(metadata);
}

async function routes(fastify) {
  fastify.post("/users", async (request, reply) => {
    const {
      email,
      password,
      full_name: fullName,
      phone_number: phoneNumber,
      date_of_birth: dateOfBirth,
      metadata,
    } = request.body || {};

    if (!isValidEmail(email)) {
      return reply.code(400).send({ message: "Invalid email format" });
    }

    if (!isValidPassword(password)) {
      return reply.code(400).send({ message: "Password is required" });
    }

    if (!isValidMetadata(metadata)) {
      return reply.code(400).send({ message: "Metadata must be a JSON object" });
    }

    try {
      const result = await createUser(email, password, {
        fullName,
        phoneNumber,
        dateOfBirth,
        metadata,
      });

      if (result.status === "created") {
        return reply.code(201).send({ message: "User created successfully" });
      }

      if (result.status === "exists_password_match") {
        return reply.code(200).send({ message: "Email already exists and password matches" });
      }

      if (result.status === "exists_password_mismatch_metadata_updated") {
        return reply.code(200).send({
          message: "Email already exists; password mismatch recorded in metadata",
        });
      }

      if (result.status === "exists_password_mismatch_no_profile_update") {
        return reply.code(200).send({
          message: "Email already exists; profile is already filled so no update was applied",
        });
      }

      return reply.code(500).send({ message: "Unexpected user creation state" });
    } catch (err) {
      request.log.error({ err }, "Failed to create user");
      return reply.code(500).send({ message: "Internal server error" });
    }
  });
}

module.exports = routes;
