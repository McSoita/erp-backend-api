const express = require("express");

const auth = require("../middleware/auth");
const biController = require("./controller");

const router = express.Router();

router.get("/kpis", auth, biController.getKPIs);
router.get("/revenue-trend", auth, biController.getRevenueTrend);
router.get("/audit-logs", auth, biController.getAuditLogs);
router.get("/export/:module", auth, biController.exportModuleCsv);

module.exports = router;
