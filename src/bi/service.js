const { query } = require("../config/db");

const EXPORT_CONFIG = {
  finance: {
    fileName: "finance-export.csv",
    query: `
      SELECT
        invoice_number,
        status,
        invoice_date,
        due_date,
        total_amount
      FROM invoices
      ORDER BY invoice_date DESC NULLS LAST, id DESC
    `,
    columns: [
      "invoice_number",
      "status",
      "invoice_date",
      "due_date",
      "total_amount",
    ],
  },
  hr: {
    fileName: "hr-export.csv",
    query: `
      SELECT
        e.id AS employee_id,
        e.first_name,
        e.last_name,
        u.email,
        d.name AS department_name,
        e.job_title,
        e.hire_date,
        u.is_active
      FROM employees e
      LEFT JOIN users u ON u.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      ORDER BY e.id ASC
    `,
    columns: [
      "employee_id",
      "first_name",
      "last_name",
      "email",
      "department_name",
      "job_title",
      "hire_date",
      "is_active",
    ],
  },
  scm: {
    fileName: "scm-export.csv",
    query: `
      SELECT
        po.po_number,
        COALESCE(s.company_name, v.name) AS supplier_name,
        po.order_date,
        po.expected_delivery_date,
        po.status,
        po.total_amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN vendors v ON v.id = po.supplier_id
      ORDER BY po.created_at DESC
    `,
    columns: [
      "po_number",
      "supplier_name",
      "order_date",
      "expected_delivery_date",
      "status",
      "total_amount",
    ],
  },
  crm: {
    fileName: "crm-export.csv",
    query: `
      SELECT
        company_name,
        primary_contact_name,
        primary_email,
        primary_phone,
        industry,
        status
      FROM customers
      ORDER BY id DESC
    `,
    columns: [
      "company_name",
      "primary_contact_name",
      "primary_email",
      "primary_phone",
      "industry",
      "status",
    ],
  },
};

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getKPIs() {
  const [revenueResult, pipelineResult, inventoryValueResult] = await Promise.all([
    query(
      `
        SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
        FROM invoices
        WHERE status != 'Draft'
      `
    ),
    query(
      `
        SELECT COALESCE(SUM(estimated_value), 0) AS total_pipeline
        FROM opportunities
        WHERE stage NOT IN ('Closed Won', 'Closed Lost')
      `
    ),
    query(
      `
        SELECT
          COALESCE(SUM(batch_values.product_total_valuation), 0) AS inventory_value
        FROM (
          SELECT
            p.id,
            COALESCE(SUM(ib.quantity_remaining * ib.unit_cost), 0) AS product_total_valuation
          FROM products p
          LEFT JOIN inventory_batches ib
            ON ib.product_id = p.id
           AND ib.status = 'Available'
          GROUP BY p.id
        ) AS batch_values
      `
    ),
  ]);

  return {
    totalRevenue: Number(revenueResult.rows[0]?.total_revenue ?? 0),
    totalPipeline: Number(pipelineResult.rows[0]?.total_pipeline ?? 0),
    inventoryValue: Number(inventoryValueResult.rows[0]?.inventory_value ?? 0),
  };
}

async function getRevenueTrend() {
  const result = await query(
    `
      SELECT
        DATE_TRUNC('month', invoice_date)::date AS month_start,
        TO_CHAR(DATE_TRUNC('month', invoice_date), 'Mon YYYY') AS month_label,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM invoices
      WHERE status != 'Draft'
        AND DATE_TRUNC('year', invoice_date) = DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', invoice_date)
      ORDER BY month_start ASC
    `
  );

  return result.rows;
}

async function getAuditLogs() {
  const result = await query(
    `
      SELECT
        a.*,
        u.first_name,
        u.last_name
      FROM audit_logs a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `
  );

  return result.rows;
}

async function getModuleExportData(moduleName) {
  const normalizedModuleName = String(moduleName ?? "").trim().toLowerCase();
  const config = EXPORT_CONFIG[normalizedModuleName];

  if (!config) {
    throw createHttpError(404, "Unsupported export module");
  }

  const result = await query(config.query);

  return {
    fileName: config.fileName,
    columns: config.columns,
    rows: result.rows,
  };
}

module.exports = {
  getKPIs,
  getRevenueTrend,
  getAuditLogs,
  getModuleExportData,
};
