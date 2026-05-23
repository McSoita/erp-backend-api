const express = require("express");

const auth = require("../middleware/auth");
const dashboardController = require("./controller");

const router = express.Router();

router.get("/metrics", auth, dashboardController.getMetrics);

module.exports = router;
