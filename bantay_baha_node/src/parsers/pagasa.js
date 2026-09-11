import * as cheerio from "cheerio";

export const PAGASA_PARSER_VERSION = "1.0.0";

function decimal(value) {
  const match = String(value ?? "").replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function parsePagasaSnapshot(content, sourceUrl) {
  const $ = cheerio.load(content);
  const result = { basins: [], dams: [], advisories: [], errors: [], warnings: [] };
  const published = text($("h1,h2,h3,h4,h5,h6,p,div").toArray().map((node) => $(node).text()).find((value) => /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*20\d{2}/i.test(value)));
  const publishedAt = published ? new Date(published) : null;

  $("table").each((_, table) => {
    const tableText = text($(table).text()).toLowerCase();
    if (!tableText.includes("river basins") && !tableText.includes("sub-basin")) return;
    $(table).find("tr").each((__, row) => {
      const cells = $(row).find("th,td").toArray().map((cell) => text($(cell).text()));
      if (cells.length < 2 || ["basin", "dams/reservoir (sub basin)"].includes(cells[0].toLowerCase())) return;
      if (!cells[0] || !cells[1].toLowerCase().includes("flood")) return;
      const href = $(row).find("a[href]").attr("href");
      const source = href ? new URL(href, sourceUrl).href : sourceUrl;
      result.basins.push({ area: cells[0], status: cells[1], source_url: source });
      result.advisories.push({ area: cells[0], level: cells[1], source_url: source, raw_text: `${cells[0]}: ${cells[1]}` });
    });
  });

  const damTable = $("table").toArray().find((table) => {
    const value = text($(table).text()).toLowerCase();
    return value.includes("dam name") && value.includes("reservoir water level");
  });
  if (!damTable) result.errors.push({ message: "Dam water-level table not found", table: "dam" });
  else $(damTable).find("tr").each((_, row) => {
    const values = $(row).find("th,td").toArray().map((cell) => text($(cell).text()));
    if (values.length < 3 || ["dam name", "hr"].includes(values[0].toLowerCase())) return;
    const level = decimal(values[2]);
    if (level === null) return;
    result.dams.push({ name: values[0], observed_at: publishedAt?.toISOString() ?? null, reservoir_level_m: level, nhwl_m: decimal(values[4]), raw_text: values.join(" | ") });
    if (!publishedAt) result.warnings.push({ message: `No published date for dam: ${values[0]}`, table: "dam" });
  });
  if (!result.basins.length) result.errors.push({ message: "Basin/sub-basin flood-status table not found or unrecognizable", table: "basin" });
  return result;
}
