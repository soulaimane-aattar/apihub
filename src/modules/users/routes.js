const { createUser } = require("./service");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function isValidMetadata(metadata) {
  if (metadata === undefined) {
    return true;
  }

  return metadata !== null && typeof metadata === "object" && !Array.isArray(metadata);
}

async function routes(fastify) {
  fastify.post("/users", async (request, reply) => {
    const { email, password, metadata } = request.body || {};

    // if (!isValidEmail(email)) {
    //   return reply.code(400).send({ message: "Invalid email format" });
    // }

    // if (!isValidPassword(password)) {
    //   return reply.code(400).send({ message: "Password must be at least 8 characters" });
    // }

    if (!isValidMetadata(metadata)) {
      return reply.code(400).send({ message: "Metadata must be a JSON object" });
    }

    try {
      await createUser(email, password, metadata);
      return reply.code(201).send({ message: "User created successfully" });
    } catch (err) {
      if (err && err.code === "23505") {
        return reply.code(409).send({ message: "Email already exists" });
      }

      request.log.error({ err }, "Failed to create user");
      return reply.code(500).send({ message: "Internal server error" });
    }
  });
}

module.exports = routes;
