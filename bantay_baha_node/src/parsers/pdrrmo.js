import * as cheerio from "cheerio";

export const PDRRMO_PARSER_VERSION = "1.0.0";
const clean = (node) => node.text().trim();
const decimal = (raw) => {
  const value = String(raw ?? "").trim();
  if (["", "-", "—", "N/A", "NA"].includes(value)) return null;
  return value.replaceAll(",", "").match(/[-+]?\d+(?:\.\d+)?/)?.[0] ?? null;
};
const iso = (date, time = "00:00") => {
  const d = date.trim().match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  const t = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!d || !t) return null;
  const result = new Date(Date.UTC(+d[3], +d[1] - 1, +d[2], +t[1] - 8, +t[2], +(t[3] ?? 0)));
  return Number.isNaN(result.valueOf()) ? null : result.toISOString().replace(".000Z", "+00:00");
};
const norm = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const cells = ($, row, selector) => row.find(selector).toArray().map((cell) => clean($(cell)));

function tableAfter($, heading) {
  const header = $("h1,h2,h3").filter((_, el) => clean($(el)).toLowerCase().includes(heading.toLowerCase())).first();
  if (!header.length) return null;
  const boxed = header.closest("div.box-item").find("table").first();
  return boxed.length ? boxed : header.nextAll("table").first();
}

function valid($, table, expected, result, message, name) {
  const headers = cells($, table, "thead th,thead td").map(norm);
  if (expected.every((item) => headers.includes(norm(item)))) return true;
  result.errors.push({ message, table: name }); return false;
}

export function parsePdrrmoSnapshot(content) {
  const $ = cheerio.load(Buffer.isBuffer(content) ? content.toString("utf8") : content);
  const result = { tides: [], dams: [], rainfall: [], flooding: [], rivers: [], warnings: [], errors: [], source_published_at: null };
  if (!$("body").text().match(/Hydrological Information|Tide Schedule|Status of Dams|Observed Rainfall|River Status/i)) {
    result.errors.push({ message: "Hydrological Information section not found — page layout changed or fetch returned wrong page", table: null }); return result;
  }
  const definitions = [["Tide Schedule", "tide"], ["Status of Dams", "dam"], ["Observed Rainfall", "rainfall"], ["Flooding Situation", "flooding"], ["River Status", "river"]];
  const tables = Object.fromEntries(definitions.map(([heading, key]) => [key, tableAfter($, heading)]));
  for (const [heading, key] of definitions) if (!tables[key]?.length) result.errors.push({ message: `${heading}${key === "river" ? " Stations" : ""} table not found`, table: key });
  const rows = (table) => table.find("tbody tr").toArray().map((row) => $(row));

  if (tables.tide?.length && valid($, tables.tide, ["Date", "Time", "Ht/m"], result, "Tide table header mismatch: missing Date/Time/Ht/m", "tide")) for (const row of rows(tables.tide)) {
    const c = cells($, row, "th,td"); if (c.length < 5) continue;
    const observed_at = iso(c[1], c[2]); const height_m = decimal(c[3]); const height_ft = decimal(c[4]);
    if (!c[1] || !c[2]) result.warnings.push({ message: `Tide row missing date/time: ${JSON.stringify(c)}`, table: "tide" });
    else if (height_m === null || height_ft === null || !observed_at) result.warnings.push({ message: `Tide row invalid values: ${JSON.stringify(c)}`, table: "tide" });
    if (height_m !== null && (+height_m < 0 || +height_m > 10)) result.warnings.push({ message: `Tide height out of range: ${height_m} m`, table: "tide" });
    result.tides.push({ label: c[0], date: c[1], time: c[2], height_m, height_ft, observed_at });
  }
  if (tables.dam?.length && valid($, tables.dam, ["Dam", "Current Level"], result, "Dam table header mismatch", "dam")) for (const row of rows(tables.dam)) {
    const name = clean(row.find("th").first()); const c = cells($, row, "td"); if (!name || c.length < 4) continue;
    const observed_at = iso(c[3]); if (!observed_at) result.warnings.push({ message: `Dam date unparseable: ${c[3]}`, table: "dam" });
    result.dams.push({ dam: name, current_level: decimal(c[0]), normal_level: decimal(c[1]), spilling_level: decimal(c[2]), date: c[3], observed_at });
  }
  if (tables.rainfall?.length && valid($, tables.rainfall, ["Station", "Rainfall"], result, "Rainfall table header mismatch", "rainfall")) for (const row of rows(tables.rainfall)) {
    const station = clean(row.find("th").first()); const c = cells($, row, "td"); if (!station || c.length < 2) continue;
    const observed_at = iso(c[1]); if (!observed_at) result.warnings.push({ message: `Rainfall date unparseable: ${c[1]}`, table: "rainfall" });
    result.rainfall.push({ station, rainfall_mm: decimal(c[0]), date: c[1], observed_at });
  }
  if (tables.flooding?.length && valid($, tables.flooding, ["Municipality", "Flood Level"], result, "Flooding table header mismatch", "flooding") && !clean(tables.flooding).includes("No Record")) for (const row of rows(tables.flooding)) {
    const c = cells($, row, "th,td"); if (c.length < 3) continue;
    const observed_at = iso(c[2]); if (!observed_at) result.warnings.push({ message: `Flooding date unparseable: ${c[2]}`, table: "flooding" });
    result.flooding.push({ municipality: c[0], flood_level: c[1], date: c[2], observed_at });
  }
  if (tables.river?.length && valid($, tables.river, ["Station", "Actual Level", "Alert"], result, "River table header mismatch", "river")) for (const row of rows(tables.river)) {
    const station = clean(row.find("th").first()); const c = cells($, row, "td"); if (!station || c.length < 5) continue;
    const observed_at = iso(c[4]); if (!observed_at) result.warnings.push({ message: `River date unparseable: ${c[4]}`, table: "river" });
    result.rivers.push({ station, actual: decimal(c[0]), alert: decimal(c[1]), alarm: decimal(c[2]), critical: decimal(c[3]), date: c[4], observed_at });
  }
  const dates = [...result.tides, ...result.dams, ...result.rainfall, ...result.flooding, ...result.rivers].map((item) => item.observed_at).filter(Boolean);
  result.source_published_at = dates.sort().at(-1) ?? null; return result;
}

export const parsedResultToDict = (result) => ({ parser_version: PDRRMO_PARSER_VERSION, tides: result.tides, dams: result.dams, rainfall: result.rainfall, flooding: result.flooding, rivers: result.rivers, warnings: result.warnings.map((item) => item.message), errors: result.errors.map((item) => item.message) });
