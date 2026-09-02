import { createHash, randomUUID } from "node:crypto";
import { getPool } from "../db.js";
import { parsePdrrmoSnapshot } from "../parsers/pdrrmo.js";
import { prepareSnapshot, storeSnapshot } from "./snapshot-store.js";
import { getApprovedSource } from "./source-registry.js";
const activeKey = (station, metric, observed) => createHash("sha256").update(`${station}|${metric}|${observed ?? "none"}`).digest("hex");
async function ensureStation(db, source, id, name, kind, unit) {
  const [found] = await db.execute("SELECT * FROM station WHERE source_id=? AND source_station_id=?", [source.id, id]); if (found[0]) return found[0];
  const station = { id: randomUUID() }, now = new Date(); await db.execute("INSERT INTO station (id,created_at,updated_at,source_id,source_station_id,name,kind,unit) VALUES (?,?,?,?,?,?,?,?)", [station.id, now, now, source.id, id, name, kind, unit]); return station;
}
async function persistObservation(db, source, snapshot, record, spec, fetchedAt) {
  const station = await ensureStation(db, source, spec.stationId, spec.name, spec.kind, spec.unit); const key = activeKey(station.id, spec.metric, record.observed_at), serialized = JSON.stringify(record), thresholds = spec.thresholds ? JSON.stringify(spec.thresholds) : null;
  const [old] = await db.execute("SELECT * FROM observation WHERE active_key=? FOR UPDATE", [key]);
  const sameValue = old[0] && (old[0].value === null && spec.value === null || Number(old[0].value) === Number(spec.value));
  if (sameValue && old[0].thresholds_json === thresholds && old[0].raw_text === serialized) return false;
  if (old[0]) await db.execute("UPDATE observation SET active_key=NULL,updated_at=? WHERE id=?", [fetchedAt, old[0].id]); const id = randomUUID();
  await db.execute(`INSERT INTO observation (id,created_at,updated_at,station_id,snapshot_id,metric,value,unit,observed_at,fetched_at,source_url,parser_version,quality_state,thresholds_json,raw_text,supersedes_id,active_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [id, fetchedAt, fetchedAt, station.id, snapshot, spec.metric, spec.value, spec.unit, record.observed_at ? new Date(record.observed_at) : null, fetchedAt, source.canonical_url, source.parser_version, record.observed_at ? "valid" : "parse_error", thresholds, serialized, old[0]?.id ?? null, key]);
  await db.execute("INSERT INTO audit_log (id,created_at,updated_at,actor,action,entity_type,entity_id,`before`,`after`,reason,`timestamp`) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [randomUUID(), fetchedAt, fetchedAt, "collector:pdrrmo", old[0] ? "correct" : "create", "observation", id, old[0] ? JSON.stringify(old[0]) : null, serialized, old[0] ? "source value changed" : "source observation ingested", fetchedAt]); return true;
}
function observations(p) { return [
  ...p.tides.flatMap((r) => [{ record:r,stationId:`tide:${r.label.toLowerCase()}`,name:r.label,kind:"tide",metric:"tide_height",value:r.height_m,unit:"m"},{ record:r,stationId:`tide:${r.label.toLowerCase()}`,name:r.label,kind:"tide",metric:"tide_height_ft",value:r.height_ft,unit:"ft"}]),
  ...p.dams.map((r)=>({record:r,stationId:`dam:${r.dam}`,name:r.dam,kind:"dam",metric:"dam_level",value:r.current_level,unit:"m",thresholds:{normal:r.normal_level,spilling:r.spilling_level}})),
  ...p.rainfall.map((r)=>({record:r,stationId:`rainfall:${r.station}`,name:r.station,kind:"rainfall_daily",metric:"rainfall",value:r.rainfall_mm,unit:"mm"})),
  ...p.flooding.map((r)=>({record:r,stationId:`flooding:${r.municipality}`,name:r.municipality,kind:"flooding",metric:"flood_level",value:null,unit:null,thresholds:{description:r.flood_level}})),
  ...p.rivers.map((r)=>({record:r,stationId:`river:${r.station}`,name:r.station,kind:"river",metric:"river_level",value:r.actual,unit:"m",thresholds:{alert:r.alert,alarm:r.alarm,critical:r.critical}})) ]; }
async function fetchRetry(url, options, retries) { let last; for (let n=0;n<=retries;n++) try { const response=await fetch(url,options); if(response.status>=500&&n<retries) continue; return response; } catch(error){last=error;} throw last; }
export async function collectSource(name, config, db = getPool(config)) {
  if (name !== "pdrrmo") throw Object.assign(new Error("Only pdrrmo source is available"), { statusCode: 400 }); const source = await getApprovedSource(name, config, db);
  if (!source) throw Object.assign(new Error("source is disabled or approval evidence is incomplete"), { statusCode: 409 });
  const [recent] = await db.execute("SELECT fetched_at FROM source_snapshot WHERE source_id=? ORDER BY fetched_at DESC LIMIT 1", [source.id]); if (recent[0] && Date.now()-new Date(recent[0].fetched_at).valueOf()<source.cadence_minutes*60000) return {status:"skipped",reason:"cadence",source:name};
  const fetchedAt=new Date(), controller=new AbortController(), timer=setTimeout(()=>controller.abort(),config.HTTP_TIMEOUT_SECONDS*1000); let response,body;
  try { response=await fetchRetry(source.canonical_url,{headers:{"user-agent":config.COLLECTOR_USER_AGENT,...(source.last_etag?{"if-none-match":source.last_etag}:{}),...(source.last_modified?{"if-modified-since":source.last_modified}:{})},signal:controller.signal},config.HTTP_MAX_RETRIES); body=Buffer.from(await response.arrayBuffer()); } finally { clearTimeout(timer); }
  const snap=await prepareSnapshot(body,config,db), connection=await db.getConnection();
  try { await connection.beginTransaction(); await storeSnapshot(connection,source,snap,{fetchedAt,status:response.status,contentType:response.headers.get("content-type"),error:response.ok||response.status===304?null:`HTTP ${response.status}`});
    if(response.status===304){await connection.commit();return{status:"not_modified",snapshot_id:snap.id};} if(!response.ok)throw new Error(`HTTP ${response.status}`); const parsed=parsePdrrmoSnapshot(body); if(parsed.errors.length)throw new Error(`parser failed: ${parsed.errors.map(e=>e.message).join("; ")}`);
    let inserted=0; for(const {record,...spec} of observations(parsed)) if(await persistObservation(connection,source,snap.id,record,spec,fetchedAt)) inserted++;
    await connection.execute("UPDATE source_registry SET last_etag=?,last_modified=?,updated_at=? WHERE id=?",[response.headers.get("etag"),response.headers.get("last-modified"),fetchedAt,source.id]); await connection.commit(); return{status:"ok",source:name,snapshot_id:snap.id,observations_written:inserted,warnings:parsed.warnings.map(x=>x.message)};
  } catch(error){await connection.rollback();await storeSnapshot(db,source,snap,{fetchedAt,status:response.status,contentType:response.headers.get("content-type"),error:error.message});throw error;} finally{connection.release();}
}
