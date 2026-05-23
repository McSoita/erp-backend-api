const { query } = require("../config/db");

async function getMetrics() {
  const [
    totalRevenueResult,
    employeeCountResult,
    lowStockCountResult,
    recentSalesResult,
  ] = await Promise.all([
    query(
      `
        SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
        FROM sales_orders
      `
    ),
    query(
      `
        SELECT COUNT(*)::int AS employee_count
        FROM users
      `
    ),
    query(
      `
        SELECT COUNT(*)::int AS low_stock_count
        FROM products
        WHERE stock_quantity < 10
      `
    ),
    query(
      `
        SELECT
          so.total_amount,
          so.created_at,
          c.company_name AS customer_name
        FROM sales_orders so
        JOIN customers c ON so.customer_id = c.id
        ORDER BY so.created_at DESC
        LIMIT 5
      `
    ),
  ]);

  return {
    totalRevenue: Number(totalRevenueResult.rows[0]?.total_revenue ?? 0),
    employeeCount: Number(employeeCountResult.rows[0]?.employee_count ?? 0),
    lowStockCount: Number(lowStockCountResult.rows[0]?.low_stock_count ?? 0),
    recentSales: recentSalesResult.rows,
  };
}

module.exports = {
  getMetrics,
};
