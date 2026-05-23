const express = require("express");

const auth = require("../middleware/auth");
const crmController = require("./controller");

const router = express.Router();

router.get("/customers", auth, crmController.getCustomers);
router.post("/customers", auth, crmController.createCustomer);
router.patch("/customers/:id", auth, crmController.updateCustomer);
router.get("/customers/:id/details", auth, crmController.getCustomerDetails);
router.get("/opportunities", auth, crmController.getOpportunities);
router.post("/opportunities", auth, crmController.createOpportunity);
router.patch("/opportunities/:id/stage", auth, crmController.updateOpportunityStage);
router.get("/quotations", auth, crmController.getQuotations);
router.post("/quotations", auth, crmController.createQuotation);
router.patch("/quotations/:id/status", auth, crmController.updateQuotationStatus);
router.get("/pricing-rules", auth, crmController.getPricingRules);
router.post("/pricing-rules", auth, crmController.createPricingRule);
router.patch("/pricing-rules/:id", auth, crmController.updatePricingRule);

module.exports = router;
