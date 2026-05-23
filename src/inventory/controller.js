const { query } = require("../config/db");
const inventoryService = require("./service");

function parsePositiveInteger(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
}

async function listCategories(req, res) {
  try {
    const result = await inventoryService.listCategories();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getCategoryById(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "category id");
    const result = await inventoryService.getCategoryById(id);

    if (!result) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createCategory(req, res) {
  try {
    const result = await inventoryService.createCategory(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateCategory(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "category id");
    const result = await inventoryService.updateCategory(id, req.body);

    if (!result) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteCategory(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "category id");
    const result = await inventoryService.deleteCategory(id);

    if (!result) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listProducts(req, res) {
  try {
    const result = await inventoryService.listProducts();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listInventoryAlerts(req, res) {
  try {
    const result = await inventoryService.listInventoryAlerts();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getProductById(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "product id");
    const result = await inventoryService.getProductById(id);

    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createProduct(req, res) {
  try {
    const { name, price, stock_quantity } = req.body;
    const skuBase =
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 12) || "PRD";
    const generatedSku = `${skuBase}-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 1000
    )
      .toString()
      .padStart(3, "0")}`;

    const result = await query(
      `
        INSERT INTO products (sku, name, unit_price, cost_price, stock_quantity)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [generatedSku, name, price, price, stock_quantity]
    )

    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateProduct(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "product id");
    const result = await inventoryService.updateProduct(id, req.body);

    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function receiveInventory(req, res) {
  try {
    const productId = parsePositiveInteger(req.body.product_id, "product id");
    const quantity = parsePositiveInteger(req.body.quantity, "quantity");
    const result = await inventoryService.receiveInventory(productId, quantity);

    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteProduct(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "product id");
    const result = await inventoryService.deleteProduct(id);

    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listWarehouses(req, res) {
  try {
    const result = await inventoryService.listWarehouses();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getInventoryValuation(req, res) {
  try {
    const result = await inventoryService.getInventoryValuation();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getWarehouseById(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "warehouse id");
    const result = await inventoryService.getWarehouseById(id);

    if (!result) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createWarehouse(req, res) {
  try {
    const result = await inventoryService.createWarehouse(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateWarehouse(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "warehouse id");
    const result = await inventoryService.updateWarehouse(id, req.body);

    if (!result) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteWarehouse(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "warehouse id");
    const result = await inventoryService.deleteWarehouse(id);

    if (!result) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listStorageBins(req, res) {
  try {
    const result = await inventoryService.listStorageBins();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getStorageBinById(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "storage bin id");
    const result = await inventoryService.getStorageBinById(id);

    if (!result) {
      return res.status(404).json({ message: "Storage bin not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listWarehouseBins(req, res) {
  try {
    const warehouseId = parsePositiveInteger(req.params.id, "warehouse id");
    const result = await inventoryService.listWarehouseBins(warehouseId);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createStorageBin(req, res) {
  try {
    const warehouseId = parsePositiveInteger(
      req.params.warehouseId,
      "warehouse id"
    );
    const result = await inventoryService.createStorageBin({
      ...req.body,
      warehouse_id: warehouseId,
    });

    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateStorageBin(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "storage bin id");
    const result = await inventoryService.updateStorageBin(id, req.body);

    if (!result) {
      return res.status(404).json({ message: "Storage bin not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function deleteStorageBin(req, res) {
  try {
    const id = parsePositiveInteger(req.params.id, "storage bin id");
    const result = await inventoryService.deleteStorageBin(id);

    if (!result) {
      return res.status(404).json({ message: "Storage bin not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
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
