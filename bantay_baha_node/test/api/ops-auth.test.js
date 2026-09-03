import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "../../src/server.js";
const config={CORS_ALLOW_ORIGINS:["https://bettermalolos.org"],OPS_API_TOKEN:"secret"};
test("all ops routes require a token",async(t)=>{const app=await buildApp({config});t.after(()=>app.close());for(const url of ["/v1/ops/snapshots","/v1/ops/observations","/v1/ops/health/sources"]){const response=await app.inject({url});assert.equal(response.statusCode,401);}});
test("collection route rejects a missing operations token",async(t)=>{const app=await buildApp({config});t.after(()=>app.close());const response=await app.inject({method:"POST",url:"/v1/ops/collect"});assert.equal(response.statusCode,401);});
test("CORS permits only the configured origin",async(t)=>{const app=await buildApp({config});t.after(()=>app.close());const ok=await app.inject({url:"/health",headers:{origin:"https://bettermalolos.org"}});assert.equal(ok.headers["access-control-allow-origin"],"https://bettermalolos.org");const denied=await app.inject({url:"/health",headers:{origin:"https://evil.example"}});assert.equal(denied.headers["access-control-allow-origin"],undefined);});
