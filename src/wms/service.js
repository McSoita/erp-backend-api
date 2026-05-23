const { query } = require("../config/db");

async function recordMovement(data) {
  const result = await query(
    `
      INSERT INTO stock_movements (
        product_id,
        from_bin_id,
        to_bin_id,
        quantity,
        movement_type,
        moved_by,
        reference_type,
        reference_id,
        movement_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      data.product_id,
      data.from_bin_id || null,
      data.to_bin_id || null,
      data.quantity,
      data.movement_type,
      data.moved_by || null,
      data.reference_type || null,
      data.reference_id || null,
      data.movement_date || new Date().toISOString(),
    ]
  );

  return result.rows[0];
}

async function getBinInventory(warehouseId) {
  const result = await query(
    `
      SELECT
        bi.id,
        bi.bin_id,
        bi.product_id,
        bi.quantity,
        bi.last_counted_at,
        bi.created_at,
        bi.updated_at,
        sb.warehouse_id,
        sb.zone,
        sb.barcode AS bin_barcode,
        sb.max_weight,
        p.sku AS product_sku,
        p.name AS product_name,
        p.description AS product_description,
        p.unit_price,
        p.stock_quantity
      FROM bin_inventory bi
      INNER JOIN storage_bins sb ON sb.id = bi.bin_id
      INNER JOIN products p ON p.id = bi.product_id
      WHERE sb.warehouse_id = $1
      ORDER BY sb.zone ASC, p.name ASC, bi.id ASC
    `,
    [warehouseId]
  );

  return result.rows;
}

module.exports = {
  recordMovement,
  getBinInventory,
};
