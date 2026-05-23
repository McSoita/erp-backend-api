const { query, withTransaction } = require("../config/db");

const SALES_ORDER_STATUSES = new Set([
  "Draft",
  "Confirmed",
  "Shipped",
  "Cancelled",
]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeOrderLine(line) {
  const quantity = Number(line.quantity);
  const unitPrice = Number(line.unit_price);

  return {
    product_id: Number(line.product_id),
    quantity,
    unit_price: unitPrice,
    subtotal: quantity * unitPrice,
  };
}

function normalizeStatus(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!SALES_ORDER_STATUSES.has(normalizedValue)) {
    throw createHttpError(
      400,
      `status must be one of: ${Array.from(SALES_ORDER_STATUSES).join(", ")}`
    );
  }

  return normalizedValue;
}

async function createSalesOrder(orderData) {
  return withTransaction(async (client) => {
    const orderLines = Array.isArray(orderData.order_lines)
      ? orderData.order_lines.map(normalizeOrderLine)
      : [];

    if (orderLines.length === 0) {
      throw createHttpError(400, "order_lines must contain at least one item");
    }

    const totalAmount = orderLines.reduce((sum, line) => sum + line.subtotal, 0);
    const orderDate = orderData.order_date || new Date().toISOString();
    const status = orderData.status || "Draft";

    const orderInsertResult = await client.query(
      `
        INSERT INTO sales_orders (customer_id, order_date, status, total_amount)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [Number(orderData.customer_id), orderDate, status, totalAmount]
    );

    const orderId = orderInsertResult.rows[0].id;

    for (const line of orderLines) {
      await client.query(
        `
          INSERT INTO order_lines (order_id, product_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, line.product_id, line.quantity, line.unit_price]
      );
    }

    const createdOrder = await getSalesOrderById(orderId, client);
    return createdOrder;
  });
}

async function listCustomers() {
  const result = await query(
    `
      SELECT
        id,
        company_name AS name
      FROM customers
      ORDER BY company_name ASC, id ASC
    `
  );

  return result.rows;
}

async function getCustomerInvoiceRecipient(customerId) {
  const result = await query(
    `
      SELECT
        id,
        company_name AS name,
        primary_email AS email
      FROM customers
      WHERE id = $1
    `,
    [customerId]
  );

  return result.rows[0] || null;
}

async function listSalesOrders() {
  const result = await query(
    `
      SELECT
        so.id,
        so.customer_id,
        so.order_date,
        so.status,
        so.total_amount,
        so.created_at,
        so.updated_at,
        c.company_name AS customer_company_name
      FROM sales_orders so
      INNER JOIN customers c ON c.id = so.customer_id
      ORDER BY so.created_at DESC, so.id DESC
    `
  );

  return result.rows;
}

async function getSalesOrderById(id, client = null) {
  const executor = client || { query };

  const orderResult = await executor.query(
    `
      SELECT
        so.id,
        so.customer_id,
        so.order_date,
        so.status,
        so.total_amount,
        so.created_at,
        so.updated_at,
        c.company_name AS customer_company_name,
        c.primary_contact_name,
        c.primary_email
      FROM sales_orders so
      INNER JOIN customers c ON c.id = so.customer_id
      WHERE so.id = $1
    `,
    [id]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const orderLinesResult = await executor.query(
    `
      SELECT
        ol.id,
        ol.order_id,
        ol.product_id,
        ol.quantity,
        ol.unit_price,
        ol.subtotal,
        ol.created_at,
        p.sku AS product_sku,
        p.name AS product_name
      FROM order_lines ol
      INNER JOIN products p ON p.id = ol.product_id
      WHERE ol.order_id = $1
      ORDER BY ol.id ASC
    `,
    [id]
  );

  return {
    ...orderResult.rows[0],
    order_lines: orderLinesResult.rows,
  };
}

async function updateSalesOrderStatus(orderId, status) {
  const normalizedStatus = normalizeStatus(status);

  const result = await query(
    `
      UPDATE sales_orders
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `,
    [normalizedStatus, orderId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getSalesOrderById(orderId);
}

module.exports = {
  createSalesOrder,
  getCustomerInvoiceRecipient,
  listCustomers,
  listSalesOrders,
  getSalesOrderById,
  updateSalesOrderStatus,
};
