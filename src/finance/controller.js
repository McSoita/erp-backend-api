const financeService = require("./service");

function handleError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error.constraint === "assets_category_check") {
    return res.status(400).json({
      message:
        "Category must be one of: Vehicle, Machinery, IT Equipment, HVAC, Facility",
    });
  }

  if (error.constraint === "assets_status_check") {
    return res.status(400).json({
      message:
        "Status must be one of: Operational, Degraded, Under Repair, Decommissioned",
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      message: "Invalid foreign key reference in finance request",
    });
  }

  if (error.code === "23505") {
    return res.status(409).json({
      message: "A unique finance record already exists with these values",
    });
  }

  if (error.code === "23514" || error.code === "22P02") {
    return res.status(400).json({
      message: "Finance request failed database validation",
    });
  }

  if (error.code === "42P01") {
    return res.status(500).json({
      message: "Required journal tables are missing in the database",
    });
  }

  return res.status(500).json({
    message: error.message || "Internal server error",
  });
}

async function createInvoice(req, res) {
  try {
    const result = await financeService.createInvoice(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAccounts(req, res) {
  try {
    const result = await financeService.getAccounts();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createAccount(req, res) {
  try {
    const result = await financeService.createAccount(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateAccountStatus(req, res) {
  try {
    const accountId = Number(req.params.id);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return res.status(400).json({ message: "Invalid account id" });
    }

    const result = await financeService.updateAccountStatus(
      accountId,
      req.body?.is_active
    );

    if (!result) {
      return res.status(404).json({ message: "Account not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateAccount(req, res) {
  try {
    const accountId = Number(req.params.id);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      return res.status(400).json({ message: "Invalid account id" });
    }

    const result = await financeService.updateAccount(accountId, req.body);

    if (!result) {
      return res.status(404).json({ message: "Account not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAssets(req, res) {
  try {
    const result = await financeService.getAssets();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createAsset(req, res) {
  try {
    const result = await financeService.createAsset(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateAssetStatus(req, res) {
  try {
    const assetId = Number(req.params.id);

    if (!Number.isInteger(assetId) || assetId <= 0) {
      return res.status(400).json({ message: "Invalid asset id" });
    }

    const result = await financeService.updateAssetStatus(
      assetId,
      req.body?.status
    );

    if (!result) {
      return res.status(404).json({ message: "Asset not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateAsset(req, res) {
  try {
    const assetId = Number(req.params.id);

    if (!Number.isInteger(assetId) || assetId <= 0) {
      return res.status(400).json({ message: "Invalid asset id" });
    }

    const result = await financeService.updateAsset(assetId, req.body);

    if (!result) {
      return res.status(404).json({ message: "Asset not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getBudgets(req, res) {
  try {
    const result = await financeService.getBudgets();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createBudget(req, res) {
  try {
    const result = await financeService.createBudget(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateBudget(req, res) {
  try {
    const budgetId = Number(req.params.id);

    if (!Number.isInteger(budgetId) || budgetId <= 0) {
      return res.status(400).json({ message: "Invalid budget id" });
    }

    const result = await financeService.updateBudget(budgetId, req.body);

    if (!result) {
      return res.status(404).json({ message: "Budget not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getTaxSummary(req, res) {
  try {
    const result = await financeService.getTaxSummary();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createTaxPayment(req, res) {
  try {
    const result = await financeService.createTaxPayment(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getJournalEntries(req, res) {
  try {
    const result = await financeService.getJournalEntries();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getJournalEntryById(req, res) {
  try {
    const journalEntryId = Number(req.params.id);

    if (!Number.isInteger(journalEntryId) || journalEntryId <= 0) {
      return res.status(400).json({ message: "Invalid journal entry id" });
    }

    const result = await financeService.getJournalEntryById(journalEntryId);

    if (!result) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createJournalEntry(req, res) {
  try {
    const totalDebits = req.body.lines.reduce(
      (sum, line) => sum + Number(line.debit ?? 0),
      0
    );
    const totalCredits = req.body.lines.reduce(
      (sum, line) => sum + Number(line.credit ?? 0),
      0
    );

    if (Number(totalDebits.toFixed(2)) !== Number(totalCredits.toFixed(2))) {
      return res.status(400).json({
        message: "Debits must equal Credits",
      });
    }

    const result = await financeService.createJournalEntry({
      ...req.body,
      created_by: req.user?.user_id || null,
    });

    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function reverseJournalEntry(req, res) {
  try {
    const journalEntryId = Number(req.params.id);

    if (!Number.isInteger(journalEntryId) || journalEntryId <= 0) {
      return res.status(400).json({ message: "Invalid journal entry id" });
    }

    const result = await financeService.reverseJournalEntry(
      journalEntryId,
      req.user?.user_id || null
    );

    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getARInvoices(req, res) {
  try {
    const result = await financeService.getARInvoices();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function markInvoicePaid(req, res) {
  try {
    const invoiceId = Number(req.params.id);

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({ message: "Invalid invoice id" });
    }

    const result = await financeService.markInvoicePaid(invoiceId);

    if (!result) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAPBills(req, res) {
  try {
    const result = await financeService.getAPBills();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createBill(req, res) {
  try {
    const result = await financeService.createBill(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function markBillPaid(req, res) {
  try {
    const billId = Number(req.params.id);

    if (!Number.isInteger(billId) || billId <= 0) {
      return res.status(400).json({ message: "Invalid bill id" });
    }

    const result = await financeService.markBillPaid(billId);

    if (!result) {
      return res.status(404).json({ message: "Bill not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function registerPayment(req, res) {
  try {
    const result = await financeService.registerPayment(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createInvoice,
  getAccounts,
  createAccount,
  updateAccount,
  updateAccountStatus,
  getAssets,
  createAsset,
  updateAsset,
  updateAssetStatus,
  getBudgets,
  createBudget,
  updateBudget,
  getTaxSummary,
  createTaxPayment,
  getJournalEntries,
  getJournalEntryById,
  createJournalEntry,
  reverseJournalEntry,
  getARInvoices,
  markInvoicePaid,
  getAPBills,
  createBill,
  markBillPaid,
  registerPayment,
};
