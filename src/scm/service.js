const { query, withTransaction } = require("../config/db");

const VENDOR_STATUSES = new Set(["Active", "On Hold", "Terminated"]);
const PURCHASE_ORDER_STATUSES = new Set([
  "Draft",
  "Submitted",
  "Partially Received",
  "Received",
  "Cancelled",
]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeMoney(value, fieldName) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw createHttpError(400, `Invalid ${fieldName}`);
  }

  return Number(amount.toFixed(2));
}

function normalizeRequiredText(value, fieldName) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw createHttpError(400, `${fieldName} is required`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || null;
}

function normalizeStatus(value, allowedValues, fieldName) {
  const normalizedValue = String(value ?? "").trim();

  if (!allowedValues.has(normalizedValue)) {
    throw createHttpError(
      400,
      `${fieldName} must be one of: ${Array.from(allowedValues).join(", ")}`
    );
  }

  return normalizedValue;
}

async function getVendors() {
  const result = await query(
    `
      SELECT
        id,
        company_name AS name,
        email,
        payment_terms,
        status,
        created_at,
        updated_at
      FROM suppliers
      ORDER BY company_name ASC
    `
  );

  return result.rows;
}

async function createVendor(data) {
  const result = await query(
    `
      INSERT INTO suppliers (
        company_name,
        contact_name,
        email,
        phone,
        payment_terms,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        company_name AS name,
        contact_name,
        email,
        phone,
        payment_terms,
        status,
        created_at,
        updated_at
    `,
    [
      normalizeRequiredText(data.company_name, "company_name"),
      normalizeOptionalText(data.contact_name),
      normalizeOptionalText(data.email),
      normalizeOptionalText(data.phone),
      normalizeOptionalText(data.payment_terms),
      "Active",
    ]
  );

  return result.rows[0];
}

async function updateVendor(vendorId, data) {
  const result = await query(
    `
      UPDATE suppliers
      SET
        company_name = $1,
        contact_name = $2,
        email = $3,
        phone = $4,
        payment_terms = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING
        id,
        company_name AS name,
        contact_name,
        email,
        phone,
        payment_terms,
        status,
        created_at,
        updated_at
    `,
    [
      normalizeRequiredText(data.company_name, "company_name"),
      normalizeOptionalText(data.contact_name),
      normalizeOptionalText(data.email),
      normalizeOptionalText(data.phone),
      normalizeOptionalText(data.payment_terms),
      vendorId,
    ]
  );

  return result.rows[0] || null;
}

async function updateVendorStatus(vendorId, status) {
  const normalizedStatus = normalizeStatus(status, VENDOR_STATUSES, "status");

  const result = await query(
    `
      UPDATE suppliers
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        company_name AS name,
        contact_name,
        email,
        phone,
        payment_terms,
        status,
        created_at,
        updated_at
    `,
    [normalizedStatus, vendorId]
  );

  return result.rows[0] || null;
}

async function getPurchaseOrders() {
  const result = await query(
    `
      SELECT
        po.*,
        COALESCE(s.company_name, v.name) AS supplier_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.supplier_id = v.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `
  );

  return result.rows;
}

async function updatePurchaseOrderStatus(purchaseOrderId, status) {
  const normalizedStatus = normalizeStatus(
    status,
    PURCHASE_ORDER_STATUSES,
    "status"
  );

  const result = await query(
    `
      UPDATE purchase_orders po
      SET status = $1,
          updated_at = NOW()
      WHERE po.id = $2
      RETURNING
        po.*,
        (
          SELECT COALESCE(s.company_name, v.name)
          FROM suppliers s
          LEFT JOIN vendors v ON v.id = s.id
          WHERE s.id = po.supplier_id
          LIMIT 1
        ) AS supplier_name
    `,
    [normalizedStatus, purchaseOrderId]
  );

  return result.rows[0] || null;
}

async function getShipments() {
  const result = await query(
    `
      SELECT *
      FROM shipments
      ORDER BY estimated_arrival ASC
    `
  );

  return result.rows;
}

async function updateShipmentStatus(shipmentId, status) {
  const normalizedStatus = String(status ?? "").trim();

  if (!normalizedStatus) {
    throw createHttpError(400, "status is required");
  }

  const result = await query(
    `
      UPDATE shipments
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [normalizedStatus, shipmentId]
  );

  return result.rows[0] || null;
}

async function getForecast() {
  const result = await query(
    `
      SELECT
        p.id,
        p.name AS product_name,
        p.stock_quantity,
        COALESCE(SUM(ol.quantity), 0) AS velocity,
        CASE
          WHEN COALESCE(SUM(ol.quantity), 0) > 0 THEN ROUND(
            p.stock_quantity::numeric / COALESCE(SUM(ol.quantity), 0),
            1
          )
          ELSE NULL
        END AS days_until_stockout
      FROM products p
      LEFT JOIN order_lines ol ON ol.product_id = p.id
      GROUP BY p.id, p.name, p.stock_quantity
      ORDER BY
        CASE
          WHEN COALESCE(SUM(ol.quantity), 0) > 0 THEN p.stock_quantity::numeric / COALESCE(SUM(ol.quantity), 0)
          ELSE NULL
        END ASC NULLS LAST,
        p.name ASC
    `
  );

  return result.rows;
}

async function createPurchaseOrder(data) {
  const poNumber = String(data.po_number ?? "").trim();
  const supplierId = Number(data.supplier_id);
  const expectedDeliveryDate = data.expected_delivery_date || null;
  const lines = Array.isArray(data.lines) ? data.lines : [];

  if (!poNumber) {
    throw createHttpError(400, "po_number is required");
  }

  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    throw createHttpError(400, "supplier_id must be a valid vendor id");
  }

  if (lines.length === 0) {
    throw createHttpError(400, "At least one line item is required");
  }

  const normalizedLines = lines.map((line, index) => {
    const productId = Number(line.product_id);
    const quantityOrdered = Number(line.quantity_ordered);
    const unitCost = normalizeMoney(line.unit_cost, `unit_cost for line ${index + 1}`);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw createHttpError(400, `product_id is invalid for line ${index + 1}`);
    }

    if (!Number.isInteger(quantityOrdered) || quantityOrdered <= 0) {
      throw createHttpError(
        400,
        `quantity_ordered must be a positive integer for line ${index + 1}`
      );
    }

    const subtotal = Number((quantityOrdered * unitCost).toFixed(2));

    return {
      product_id: productId,
      quantity_ordered: quantityOrdered,
      unit_cost: unitCost,
      subtotal,
    };
  });

  const totalAmount = Number(
    normalizedLines
      .reduce((sum, line) => sum + line.subtotal, 0)
      .toFixed(2)
  );

  return withTransaction(async (client) => {
    const purchaseOrderResult = await client.query(
      `
        INSERT INTO purchase_orders (
          po_number,
          supplier_id,
          expected_delivery_date,
          status,
          total_amount
        )
        VALUES ($1, $2, $3, 'Submitted', $4)
        RETURNING id
      `,
      [poNumber, supplierId, expectedDeliveryDate, totalAmount]
    );

    const purchaseOrderId = purchaseOrderResult.rows[0].id;

    for (const line of normalizedLines) {
      await client.query(
        `
          INSERT INTO purchase_order_lines (
            purchase_order_id,
            product_id,
            quantity_ordered,
            quantity_received,
            unit_cost
          )
          VALUES ($1, $2, $3, 0, $4)
        `,
        [
          purchaseOrderId,
          line.product_id,
          line.quantity_ordered,
          line.unit_cost,
        ]
      );
    }

    const createdPurchaseOrderResult = await client.query(
      `
        SELECT
          po.*,
          COALESCE(s.company_name, v.name) AS supplier_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.supplier_id = v.id
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.id = $1
      `,
      [purchaseOrderId]
    );

    return createdPurchaseOrderResult.rows[0];
  });
}

module.exports = {
  getVendors,
  createVendor,
  updateVendor,
  updateVendorStatus,
  getPurchaseOrders,
  updatePurchaseOrderStatus,
  getShipments,
  updateShipmentStatus,
  getForecast,
  createPurchaseOrder,
};
