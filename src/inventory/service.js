const { query, withTransaction } = require("../config/db");

const CATEGORY_FIELDS = ["name", "description"];
const PRODUCT_FIELDS = [
  "category_id",
  "sku",
  "name",
  "description",
  "unit_price",
  "cost_price",
  "stock_quantity",
];
const WAREHOUSE_FIELDS = [
  "name",
  "location_address",
  "manager_id",
  "is_active",
];
const STORAGE_BIN_FIELDS = [
  "warehouse_id",
  "zone",
  "barcode",
  "max_weight",
];

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildInsertStatement(tableName, payload, allowedFields) {
  const entries = Object.entries(payload).filter(
    ([field, value]) => allowedFields.includes(field) && value !== undefined
  );

  if (entries.length === 0) {
    throw createHttpError(400, `No valid fields provided for ${tableName}.`);
  }

  const columns = entries.map(([field]) => `"${field}"`).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);

  return {
    text: `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values,
  };
}

function buildUpdateStatement(tableName, id, payload, allowedFields) {
  const entries = Object.entries(payload).filter(
    ([field, value]) => allowedFields.includes(field) && value !== undefined
  );

  if (entries.length === 0) {
    throw createHttpError(400, `No valid fields provided for ${tableName} update.`);
  }

  const assignments = entries
    .map(([field], index) => `"${field}" = $${index + 1}`)
    .join(", ");
  const values = entries.map(([, value]) => value);
  values.push(id);

  return {
    text: `UPDATE ${tableName} SET ${assignments} WHERE id = $${
      values.length
    } RETURNING *`,
    values,
  };
}

async function listCategories() {
  const result = await query("SELECT * FROM categories ORDER BY id ASC");
  return result.rows;
}

async function getCategoryById(id) {
  const result = await query("SELECT * FROM categories WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function createCategory(payload) {
  return withTransaction(async (client) => {
    const statement = buildInsertStatement("categories", payload, CATEGORY_FIELDS);
    const result = await client.query(statement.text, statement.values);
    return result.rows[0];
  });
}

async function updateCategory(id, payload) {
  return withTransaction(async (client) => {
    const statement = buildUpdateStatement("categories", id, payload, CATEGORY_FIELDS);
    const result = await client.query(statement.text, statement.values);
    return result.rows[0] || null;
  });
}

async function deleteCategory(id) {
  return withTransaction(async (client) => {
    const result = await client.query(
      "DELETE FROM categories WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  });
}

async function listProducts() {
  const result = await query("SELECT * FROM products ORDER BY name ASC, id ASC");
  return result.rows;
}

async function listInventoryAlerts() {
  const result = await query(
    `
      SELECT
        id,
        sku,
        name,
        unit_price,
        cost_price,
        stock_quantity,
        reorder_point,
        optimal_reorder_quantity
      FROM products
      WHERE reorder_point IS NOT NULL
        AND stock_quantity <= reorder_point
      ORDER BY stock_quantity ASC, name ASC
    `
  );

  return result.rows;
}

async function getProductById(id) {
  const result = await query("SELECT * FROM products WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function createProduct(payload) {
  return withTransaction(async (client) => {
    const statement = buildInsertStatement("products", payload, PRODUCT_FIELDS);
    const result = await client.query(statement.text, statement.values);
    return result.rows[0];
  });
}

async function updateProduct(id, payload) {
  return withTransaction(async (client) => {
    const statement = buildUpdateStatement("products", id, payload, PRODUCT_FIELDS);
    const result = await client.query(statement.text, statement.values);
    return result.rows[0] || null;
  });
}

async function receiveInventory(productId, quantity) {
  const result = await query(
    `
      UPDATE products
      SET stock_quantity = stock_quantity + $1
      WHERE id = $2
      RETURNING *
    `,
    [quantity, productId]
  );

  return result.rows[0] || null;
}

async function deleteProduct(id) {
  return withTransaction(async (client) => {
    const result = await client.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  });
}

async function listWarehouses() {
  const result = await query(
    `
      SELECT
        w.*,
        u.first_name,
        u.last_name
      FROM warehouses w
      LEFT JOIN users u ON w.manager_id = u.id
      ORDER BY w.name ASC
    `
  );
  return result.rows;
}

async function getInventoryValuation() {
  const result = await query(
    `
      SELECT
        p.id,
        p.sku,
        p.name,
        COALESCE(SUM(ib.quantity_remaining), 0) AS total_remaining_quantity,
        COALESCE(
          SUM(ib.quantity_remaining * ib.unit_cost),
          0
        ) AS total_valuation
      FROM products p
      LEFT JOIN inventory_batches ib
        ON ib.product_id = p.id
       AND ib.status = 'Available'
      GROUP BY p.id, p.sku, p.name
      ORDER BY total_valuation DESC, p.name ASC
    `
  );

  return result.rows;
}

async function getWarehouseById(id) {
  const result = await query("SELECT * FROM warehouses WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function createWarehouse(payload) {
  return withTransaction(async (client) => {
    const statement = buildInsertStatement("warehouses", payload, WAREHOUSE_FIELDS);
    const result = await client.query(statement.text, statement.values);
    return result.rows[0];
  });
}

async function updateWarehouse(id, payload) {
  return withTransaction(async (client) => {
    const statement = buildUpdateStatement("warehouses", id, payload, WAREHOUSE_FIELDS);
    const result = await client.query(statement.text, statement.values);
    return result.rows[0] || null;
  });
}

async function deleteWarehouse(id) {
  return withTransaction(async (client) => {
    const result = await client.query(
      "DELETE FROM warehouses WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  });
}

async function listStorageBins() {
  const result = await query("SELECT * FROM storage_bins ORDER BY id ASC");
  return result.rows;
}

async function getStorageBinById(id) {
  const result = await query("SELECT * FROM storage_bins WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function listWarehouseBins(warehouseId) {
  const result = await query(
    "SELECT * FROM storage_bins WHERE warehouse_id = $1 ORDER BY id ASC",
    [warehouseId]
  );
  return result.rows;
}

async function createStorageBin(payload) {
  return withTransaction(async (client) => {
    const statement = buildInsertStatement(
      "storage_bins",
      payload,
      STORAGE_BIN_FIELDS
    );
    const result = await client.query(statement.text, statement.values);
    return result.rows[0];
  });
}

async function updateStorageBin(id, payload) {
  return withTransaction(async (client) => {
    const statement = buildUpdateStatement(
      "storage_bins",
      id,
      payload,
      STORAGE_BIN_FIELDS
    );
    const result = await client.query(statement.text, statement.values);
    return result.rows[0] || null;
  });
}

async function deleteStorageBin(id) {
  return withTransaction(async (client) => {
    const result = await client.query(
      "DELETE FROM storage_bins WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0] || null;
  });
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  listInventoryAlerts,
  getProductById,
  createProduct,
  updateProduct,
  receiveInventory,
  deleteProduct,
  listWarehouses,
  getInventoryValuation,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  listStorageBins,
  getStorageBinById,
  listWarehouseBins,
  createStorageBin,
  updateStorageBin,
  deleteStorageBin,
};
