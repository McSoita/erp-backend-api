const express = require("express");

const auth = require("../middleware/auth");
const financeController = require("./controller");
const {
  validateBody,
  createPaymentSchema,
  createInvoiceSchema,
  createJournalEntrySchema,
} = require("./validator");

const router = express.Router();

router.get("/accounts", auth, financeController.getAccounts);
router.post("/accounts", auth, financeController.createAccount);
router.patch("/accounts/:id", auth, financeController.updateAccount);
router.patch("/accounts/:id/status", auth, financeController.updateAccountStatus);
router.get("/assets", auth, financeController.getAssets);
router.post("/assets", auth, financeController.createAsset);
router.patch("/assets/:id", auth, financeController.updateAsset);
router.patch("/assets/:id/status", auth, financeController.updateAssetStatus);
router.get("/reports/budgets", auth, financeController.getBudgets);
router.post("/reports/budgets", auth, financeController.createBudget);
router.patch("/reports/budgets/:id", auth, financeController.updateBudget);
router.get("/taxes/summary", auth, financeController.getTaxSummary);
router.post("/taxes/payments", auth, financeController.createTaxPayment);
router.get("/journal-entries", auth, financeController.getJournalEntries);
router.get("/journal-entries/:id", auth, financeController.getJournalEntryById);
router.post(
  "/journal-entries",
  auth,
  validateBody(createJournalEntrySchema),
  financeController.createJournalEntry
);
router.post(
  "/journal-entries/:id/reverse",
  auth,
  financeController.reverseJournalEntry
);
router.get("/ar/invoices", auth, financeController.getARInvoices);
router.patch("/invoices/:id/pay", auth, financeController.markInvoicePaid);
router.get("/ap/bills", auth, financeController.getAPBills);
router.post("/ap/bills", auth, financeController.createBill);
router.patch("/bills/:id/pay", auth, financeController.markBillPaid);
router.post(
  "/invoices",
  auth,
  validateBody(createInvoiceSchema),
  financeController.createInvoice
);
router.post(
  "/payments",
  validateBody(createPaymentSchema),
  financeController.registerPayment
);

module.exports = router;
