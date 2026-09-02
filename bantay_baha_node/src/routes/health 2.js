export async function healthRoutes(app) {
  app.get("/health", async () => ({
    status: "ok",
    service: "bantay-baha",
    timestamp: new Date().toISOString(),
  }));
}

