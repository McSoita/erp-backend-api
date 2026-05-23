const express = require("express");

const wmsController = require("./controller");
const { validateBody, createMovementSchema } = require("./validator");

const router = express.Router();

router.post(
  "/movements",
  validateBody(createMovementSchema),
  wmsController.recordMovement
);
router.get(
  "/warehouses/:warehouseId/bin-inventory",
  wmsController.getBinInventory
);

module.exports = router;
