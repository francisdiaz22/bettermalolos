export async function opsRoutes(app) {
  app.all("/v1/ops/*", async (_request, reply) =>
    reply.code(501).send({
      error: "not_implemented",
      message: "Operational routes are implemented in Phase 2.",
    }),
  );
}

