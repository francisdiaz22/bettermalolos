import { getPool } from "../../db.js";

export const PUBLIC_WISHLIST_STATUSES = [
  "published",
  "gathering_support",
  "community_priority",
  "prepared_for_lgu",
  "forwarded_to_lgu",
  "lgu_acknowledged",
  "under_consideration",
  "planned",
  "implemented",
];

const PUBLIC_STATUS_PLACEHOLDERS = PUBLIC_WISHLIST_STATUSES.map(() => "?").join(",");

function toItem(row) {
  return {
    id: row.public_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category_slug,
    categoryName: row.category_name,
    barangay: row.barangay,
    locationDescription: row.location_description,
    beneficiary: row.beneficiary,
    impactStatement: row.impact_statement,
    status: row.status,
    supportCount: Number(row.support_count),
    submitted: new Date(row.created_at).toISOString(),
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
  };
}

function queryParts({ category, barangay, sort, page, pageSize }) {
  const where = [`wi.status IN (${PUBLIC_STATUS_PLACEHOLDERS})`];
  const params = [...PUBLIC_WISHLIST_STATUSES];

  if (category) {
    where.push("wc.slug = ?");
    params.push(category);
  }
  if (barangay) {
    where.push("wi.barangay = ?");
    params.push(barangay);
  }

  const orderBy = sort === "newest" ? "wi.created_at DESC, wi.id DESC" : "wi.support_count DESC, wi.created_at DESC, wi.id DESC";
  const offset = (page - 1) * pageSize;
  return { where: where.join(" AND "), params, orderBy, offset, pageSize };
}

export function createWishlistRepository({ config, database } = {}) {
  const db = database ?? getPool(config);

  return {
    async list(filters) {
      const parts = queryParts(filters);
      const base = `FROM wishlist_items wi INNER JOIN wishlist_categories wc ON wc.id = wi.category_id WHERE ${parts.where}`;
      const [rows] = await db.execute(
        `SELECT wi.public_id, wi.slug, wi.title, wi.description, wc.slug category_slug, wc.name category_name,
          wi.barangay, wi.location_description, wi.beneficiary, wi.impact_statement, wi.status,
          wi.support_count, wi.created_at, wi.published_at ${base} ORDER BY ${parts.orderBy} LIMIT ? OFFSET ?`,
        [...parts.params, parts.pageSize, parts.offset],
      );
      const [countRows] = await db.execute(`SELECT COUNT(*) total ${base}`, parts.params);
      return { data: rows.map(toItem), total: Number(countRows[0].total) };
    },

    async findBySlug(slug) {
      const [rows] = await db.execute(
        `SELECT wi.public_id, wi.slug, wi.title, wi.description, wc.slug category_slug, wc.name category_name,
          wi.barangay, wi.location_description, wi.beneficiary, wi.impact_statement, wi.status,
          wi.support_count, wi.created_at, wi.published_at
         FROM wishlist_items wi INNER JOIN wishlist_categories wc ON wc.id = wi.category_id
         WHERE wi.slug = ? AND wi.status IN (${PUBLIC_STATUS_PLACEHOLDERS}) LIMIT 1`,
        [slug, ...PUBLIC_WISHLIST_STATUSES],
      );
      return rows[0] ? toItem(rows[0]) : null;
    },

    async categories() {
      const [rows] = await db.execute(
        "SELECT slug, name, icon, sort_order FROM wishlist_categories WHERE is_active = 1 ORDER BY sort_order, name",
      );
      return rows;
    },

    async stats() {
      const [rows] = await db.execute(
        `SELECT COUNT(*) ideas, COALESCE(SUM(wi.support_count), 0) supporters,
          COUNT(DISTINCT NULLIF(wi.barangay, 'Whole City')) barangaysRepresented,
          SUM(wi.status = 'community_priority') communityPriorities
         FROM wishlist_items wi WHERE wi.status IN (${PUBLIC_STATUS_PLACEHOLDERS})`,
        PUBLIC_WISHLIST_STATUSES,
      );
      const row = rows[0];
      return {
        ideas: Number(row.ideas),
        supporters: Number(row.supporters),
        barangaysRepresented: Number(row.barangaysRepresented),
        communityPriorities: Number(row.communityPriorities),
      };
    },
  };
}
