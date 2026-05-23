const express = require("express");

const auth = require("../middleware/auth");
const { requirePermission } = require("../middleware/auth");
const salesController = require("./controller");
const { validateBody, createSalesOrderSchema } = require("./validator");

const router = express.Router();

router.get("/", auth, salesController.listOrders);
router.get("/customers", auth, salesController.listCustomers);
router.post(
  "/",
  auth,
  requirePermission("sales:write"),
  validateBody(createSalesOrderSchema),
  salesController.createOrder
);
router.post(
  "/orders",
  auth,
  requirePermission("sales:write"),
  validateBody(createSalesOrderSchema),
  salesController.createOrder
);
router.get("/orders/:id", auth, salesController.getOrder);
router.patch(
  "/orders/:id/status",
  auth,
  requirePermission("sales:write"),
  salesController.updateOrderStatus
);

module.exports = router;
