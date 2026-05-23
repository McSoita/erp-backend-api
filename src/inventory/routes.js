const express = require("express");

const auth = require("../middleware/auth");
const inventoryController = require("./controller");
const {
  validateBody,
  createProductSchema,
  updateProductSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
} = require("./validator");

const router = express.Router();

router.get("/categories", inventoryController.listCategories);
router.get("/categories/:id", inventoryController.getCategoryById);
router.post("/categories", inventoryController.createCategory);
router.patch("/categories/:id", inventoryController.updateCategory);
router.delete("/categories/:id", inventoryController.deleteCategory);

router.get("/products", auth, inventoryController.listProducts);
router.get("/alerts", auth, inventoryController.listInventoryAlerts);
router.get("/valuation", auth, inventoryController.getInventoryValuation);
router.get("/products/:id", inventoryController.getProductById);
router.post(
  "/products",
  auth,
  validateBody(createProductSchema),
  inventoryController.createProduct
);
router.post("/receive", auth, inventoryController.receiveInventory);
router.patch(
  "/products/:id",
  validateBody(updateProductSchema),
  inventoryController.updateProduct
);
router.delete("/products/:id", inventoryController.deleteProduct);

router.get("/warehouses", auth, inventoryController.listWarehouses);
router.get("/warehouses/:id", inventoryController.getWarehouseById);
router.get("/warehouses/:id/bins", inventoryController.listWarehouseBins);
router.post(
  "/warehouses",
  validateBody(createWarehouseSchema),
  inventoryController.createWarehouse
);
router.patch(
  "/warehouses/:id",
  validateBody(updateWarehouseSchema),
  inventoryController.updateWarehouse
);
router.delete("/warehouses/:id", inventoryController.deleteWarehouse);

router.get("/bins", inventoryController.listStorageBins);
router.get("/bins/:id", inventoryController.getStorageBinById);
router.post("/warehouses/:warehouseId/bins", inventoryController.createStorageBin);
router.patch("/bins/:id", inventoryController.updateStorageBin);
router.delete("/bins/:id", inventoryController.deleteStorageBin);

module.exports = router;
