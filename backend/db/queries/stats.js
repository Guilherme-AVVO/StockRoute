import sql from '../pool.js';

export async function getDashboardStats() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM orders WHERE status = 'PENDING')      AS orders_pending,
      (SELECT COUNT(*)::int FROM orders WHERE status = 'IN_PROGRESS')  AS orders_in_progress,
      (SELECT COUNT(*)::int FROM orders WHERE status = 'COMPLETED')    AS orders_completed,
      (SELECT COUNT(*)::int FROM orders WHERE status = 'CANCELLED')    AS orders_cancelled,
      (SELECT COUNT(*)::int FROM products)                             AS total_products,
      (SELECT COUNT(*)::int FROM ignored_dav_items WHERE active = true AND deleted_at IS NULL) AS active_ignored_rules
  `;
  return rows[0];
}
