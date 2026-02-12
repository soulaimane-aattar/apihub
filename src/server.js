const fastify = require("fastify")({ logger: true });
const { initDatabase } = require("./db");
const usersRoutes = require("./modules/users/routes");

const PORT = Number(process.env.PORT) || 3000;

if (!process.env.DATABASE_URL) {
  fastify.log.error("DATABASE_URL is required");
  process.exit(1);
}

fastify.register(usersRoutes, { prefix: "/api" });

const start = async () => {
  try {
    await initDatabase({ logger: fastify.log });
    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    fastify.log.info(`APIHub listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
