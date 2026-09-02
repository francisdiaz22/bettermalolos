import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "../src/config.js";
test("production requires an operations token",()=>assert.throws(()=>loadConfig({NODE_ENV:"production"}),/OPS_API_TOKEN/));
test("Node database URLs require the mysql protocol",()=>assert.throws(()=>loadConfig({APP_ENV:"test",DATABASE_URL:"mysql+pymysql://user:pass@localhost/database"}),/mysql:\/\//));
test("database URLs reject unencoded query or fragment delimiters",()=>{
  assert.throws(()=>loadConfig({APP_ENV:"test",DATABASE_URL:"mysql://user:pass@localhost/database?word"}),/percent-encode/);
  assert.throws(()=>loadConfig({APP_ENV:"test",DATABASE_URL:"mysql://user:pass@localhost/database#word"}),/percent-encode/);
});
test("configuration parses limits and restricted origins",()=>{const c=loadConfig({APP_ENV:"test",CORS_ALLOW_ORIGINS:"https://bettermalolos.org",SNAPSHOT_MAX_RAW_BYTES:"42"});assert.equal(c.SNAPSHOT_MAX_RAW_BYTES,42);assert.deepEqual(c.CORS_ALLOW_ORIGINS,["https://bettermalolos.org"]);});
