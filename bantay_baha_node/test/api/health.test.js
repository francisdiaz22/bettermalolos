import assert from "node:assert/strict";
import { test } from "node:test";

import { buildApp } from "../../src/server.js";

test("GET /health reports liveness without exposing configuration", async (t) => {
  const app = await buildApp({
    config: {
      CORS_ALLOW_ORIGINS: ["https://bettermalolos.org"],
    },
  });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);

  const body = response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.service, "bantay-baha");
  assert.ok(!response.body.includes("DATABASE_URL"));
  assert.ok(!response.body.includes("OPS_API_TOKEN"));
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
});

test("the public API is not exposed", async (t) => {
  const app = await buildApp({
    config: { CORS_ALLOW_ORIGINS: ["https://bettermalolos.org"] },
  });
  t.after(() => app.close());

  const response = await app.inject({ method: "GET", url: "/v1/public/status" });
  assert.equal(response.statusCode, 404);
});

