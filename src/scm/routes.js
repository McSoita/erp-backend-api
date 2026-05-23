const express = require("express");

const auth = require("../middleware/auth");
const scmController = require("./controller");

const router = express.Router();

router.get("/vendors", auth, scmController.getVendors);
router.post("/vendors", auth, scmController.createVendor);
router.patch("/vendors/:id", auth, scmController.updateVendor);
router.patch("/vendors/:id/status", auth, scmController.updateVendorStatus);
router.get("/purchase-orders", auth, scmController.getPurchaseOrders);
router.post("/purchase-orders", auth, scmController.createPurchaseOrder);
router.patch("/purchase-orders/:id/status", auth, scmController.updatePurchaseOrderStatus);
router.get("/shipments", auth, scmController.getShipments);
router.patch("/shipments/:id/status", auth, scmController.updateShipmentStatus);
router.get("/forecast", auth, scmController.getForecast);

module.exports = router;
