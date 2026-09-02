import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { test } from "node:test";
import { calculateFreshness } from "../src/services/freshness.js";
import { prepareSnapshot } from "../src/services/snapshot-store.js";
import { isSourceApproved } from "../src/services/source-registry.js";
test("freshness thresholds match the reference",()=>{const now=new Date("2026-01-01T02:00:00Z");assert.equal(calculateFreshness("2026-01-01T01:30:00Z",null,45,90,now),"fresh");assert.equal(calculateFreshness("2026-01-01T01:00:00Z",null,45,90,now),"stale_warning");assert.equal(calculateFreshness("2026-01-01T00:00:00Z",null,45,90,now),"stale_critical");});
test("approval requires database evidence",()=>{assert.equal(isSourceApproved({enabled:1,terms_reviewed_at:new Date(),approved_at:new Date(),second_reviewer:"Ana",licensing_terms:"Pending permission",robots_txt:"Allowed"}),false);assert.equal(isSourceApproved({enabled:1,terms_reviewed_at:new Date(),approved_at:new Date(),second_reviewer:"Ana",licensing_terms:"Permission confirmed",robots_txt:"Reviewed and allowed"}),true);});
test("snapshots are compressed after quota checks",async()=>{const db={execute:async()=>[[{used_bytes:0}]]};const config={SNAPSHOT_MAX_RAW_BYTES:100,SNAPSHOT_MAX_COMPRESSED_BYTES:100,SNAPSHOT_DATABASE_QUOTA_BYTES:100};const snap=await prepareSnapshot(Buffer.from("hello"),config,db);assert.equal(gunzipSync(snap.compressed).toString(),"hello");await assert.rejects(()=>prepareSnapshot(Buffer.alloc(101),config,db),/raw body/);});
