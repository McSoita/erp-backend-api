const { query, withTransaction } = require("../config/db");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw createHttpError(400, "Invalid monetary amount");
  }

  return Number(amount.toFixed(2));
}

async function createInvoice(data) {
  const invoiceDate = data.invoice_date || new Date().toISOString().slice(0, 10);
  const status = data.status || "Unpaid";
  const subtotal = normalizeMoney(data.subtotal || 0);
  const taxAmount = normalizeMoney(data.tax_amount || 0);

  const result = await query(
    `
      INSERT INTO invoices (
        invoice_number,
        order_id,
        invoice_date,
        due_date,
        subtotal,
        tax_amount,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      data.invoice_number,
      data.order_id || null,
      invoiceDate,
      data.due_date,
      subtotal,
      taxAmount,
      status,
    ]
  );

  return result.rows[0];
}

async function registerPayment(paymentData) {
  return withTransaction(async (client) => {
    const amountPaid = normalizeMoney(paymentData.amount_paid);
    const debitAmount = amountPaid;
    const creditAmount = amountPaid;
    const paymentMethod =
      paymentData.payment_method === "M-Pesa"
        ? "Mobile Money"
        : paymentData.payment_method;

    if (debitAmount !== creditAmount) {
      throw createHttpError(400, "Debit amount must equal credit amount");
    }

    const invoiceResult = await client.query(
      `
        SELECT id, invoice_number, status, total_amount
        FROM invoices
        WHERE id = $1
        FOR UPDATE
      `,
      [Number(paymentData.invoice_id)]
    );

    if (invoiceResult.rows.length === 0) {
      throw createHttpError(404, "Invoice not found");
    }

    const invoice = invoiceResult.rows[0];

    const accountsResult = await client.query(
      `
        SELECT id, name, is_active
        FROM accounts
        WHERE id = ANY($1::int[])
      `,
      [[Number(paymentData.debit_account_id), Number(paymentData.credit_account_id)]]
    );

    if (accountsResult.rows.length !== 2) {
      throw createHttpError(400, "Invalid debit_account_id or credit_account_id");
    }

    if (accountsResult.rows.some((account) => account.is_active !== true)) {
      throw createHttpError(400, "All journal accounts must be active");
    }

    const paymentDate = paymentData.payment_date || new Date().toISOString();

    const paymentResult = await client.query(
      `
        INSERT INTO payments (
          invoice_id,
          payment_reference,
          amount_paid,
          payment_date,
          payment_method
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        Number(paymentData.invoice_id),
        paymentData.payment_reference || null,
        amountPaid,
        paymentDate,
        paymentMethod,
      ]
    );

    const payment = paymentResult.rows[0];

    const journalEntryResult = await client.query(
      `
        INSERT INTO journal_entries (
          entry_date,
          description,
          reference_type,
          reference_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        paymentDate,
        `Payment received for Invoice ${invoice.invoice_number}`,
        "Payment",
        payment.id,
      ]
    );

    const journalEntryId = journalEntryResult.rows[0].id;

    await client.query(
      `
        INSERT INTO journal_entry_lines (
          journal_entry_id,
          account_id,
          debit,
          credit
        )
        VALUES ($1, $2, $3, $4)
      `,
      [journalEntryId, Number(paymentData.debit_account_id), debitAmount, 0]
    );

    await client.query(
      `
        INSERT INTO journal_entry_lines (
          journal_entry_id,
          account_id,
          debit,
          credit
        )
        VALUES ($1, $2, $3, $4)
      `,
      [journalEntryId, Number(paymentData.credit_account_id), 0, creditAmount]
    );

    const refreshedInvoiceResult = await client.query(
      `
        SELECT id, invoice_number, status, total_amount
        FROM invoices
        WHERE id = $1
      `,
      [invoice.id]
    );

    return {
      payment,
      journal_entry_id: journalEntryId,
      invoice: refreshedInvoiceResult.rows[0],
    };
  });
}

async function getAccounts() {
  const result = await query(
    `
      SELECT *
      FROM accounts
      ORDER BY account_code ASC
    `
  );

  return result.rows;
}

async function createAccount(data) {
  const accountCode = String(data.account_code ?? "").trim();
  const name = String(data.name ?? "").trim();
  const type = String(data.type ?? "").trim();
  const isActive = data.is_active ?? true;

  if (!accountCode) {
    throw createHttpError(400, "account_code is required");
  }

  if (!name) {
    throw createHttpError(400, "name is required");
  }

  if (!type) {
    throw createHttpError(400, "type is required");
  }

  const result = await query(
    `
      INSERT INTO accounts (account_code, name, type, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [accountCode, name, type, isActive]
  );

  return result.rows[0];
}

async function updateAccount(accountId, data) {
  const accountCode = String(data.account_code ?? "").trim();
  const name = String(data.name ?? "").trim();
  const type = String(data.type ?? "").trim();

  if (!accountCode) {
    throw createHttpError(400, "account_code is required");
  }

  if (!name) {
    throw createHttpError(400, "name is required");
  }

  if (!type) {
    throw createHttpError(400, "type is required");
  }

  const result = await query(
    `
      UPDATE accounts
      SET
        account_code = $1,
        name = $2,
        type = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [accountCode, name, type, accountId]
  );

  return result.rows[0] || null;
}

async function updateAccountStatus(accountId, isActive) {
  if (typeof isActive !== "boolean") {
    throw createHttpError(400, "is_active must be a boolean value");
  }

  const result = await query(
    `
      UPDATE accounts
      SET is_active = $1
      WHERE id = $2
      RETURNING *
    `,
    [isActive, accountId]
  );

  return result.rows[0] || null;
}

async function getAssets() {
  const result = await query(
    `
      SELECT
        id,
        asset_tag,
        name,
        category,
        purchase_date,
        initial_cost,
        salvage_value,
        useful_life_years,
        status,
        ROUND(
          (initial_cost - COALESCE(salvage_value, 0)) / NULLIF(useful_life_years, 0),
          2
        ) AS annual_depreciation
      FROM assets
      ORDER BY purchase_date DESC
    `
  );

  return result.rows;
}

async function createAsset(data) {
  const assetTag = String(data.asset_tag ?? "").trim();
  const name = String(data.name ?? "").trim();
  const category = String(data.category ?? "").trim();
  const purchaseDate = data.purchase_date || null;
  const initialCost = normalizeMoney(data.initial_cost || 0);
  const usefulLifeYears = Number(data.useful_life_years ?? 0);
  const status = String(data.status ?? "").trim() || "Operational";

  if (!assetTag) {
    throw createHttpError(400, "asset_tag is required");
  }

  if (!name) {
    throw createHttpError(400, "name is required");
  }

  if (!category) {
    throw createHttpError(400, "category is required");
  }

  if (!purchaseDate) {
    throw createHttpError(400, "purchase_date is required");
  }

  if (!Number.isInteger(usefulLifeYears) || usefulLifeYears <= 0) {
    throw createHttpError(400, "useful_life_years must be a positive integer");
  }

  const result = await query(
    `
      INSERT INTO assets (
        asset_tag,
        name,
        category,
        purchase_date,
        initial_cost,
        useful_life_years,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [assetTag, name, category, purchaseDate, initialCost, usefulLifeYears, status]
  );

  return result.rows[0];
}

async function updateAsset(assetId, data) {
  const assetTag = String(data.asset_tag ?? "").trim();
  const name = String(data.name ?? "").trim();
  const category = String(data.category ?? "").trim();
  const purchaseDate = data.purchase_date || null;
  const initialCost = normalizeMoney(data.initial_cost || 0);
  const usefulLifeYears = Number(data.useful_life_years ?? 0);
  const status = String(data.status ?? "").trim() || "Operational";

  if (!assetTag) {
    throw createHttpError(400, "asset_tag is required");
  }

  if (!name) {
    throw createHttpError(400, "name is required");
  }

  if (!category) {
    throw createHttpError(400, "category is required");
  }

  if (!purchaseDate) {
    throw createHttpError(400, "purchase_date is required");
  }

  if (!Number.isInteger(usefulLifeYears) || usefulLifeYears <= 0) {
    throw createHttpError(400, "useful_life_years must be a positive integer");
  }

  const result = await query(
    `
      UPDATE assets
      SET
        asset_tag = $1,
        name = $2,
        category = $3,
        purchase_date = $4,
        initial_cost = $5,
        useful_life_years = $6,
        status = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `,
    [
      assetTag,
      name,
      category,
      purchaseDate,
      initialCost,
      usefulLifeYears,
      status,
      assetId,
    ]
  );

  return result.rows[0] || null;
}

async function updateAssetStatus(assetId, status) {
  const normalizedStatus = String(status ?? "").trim();

  if (!normalizedStatus) {
    throw createHttpError(400, "status is required");
  }

  const result = await query(
    `
      UPDATE assets
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [normalizedStatus, assetId]
  );

  return result.rows[0] || null;
}

async function getBudgets() {
  const result = await query(
    `
      SELECT *
      FROM budgets
      ORDER BY allocated_amount DESC
    `
  );

  return result.rows;
}

async function createBudget(data) {
  const department = String(data.department ?? "").trim();
  const fiscalYear = String(data.fiscal_year ?? "").trim();
  const allocatedAmount = normalizeMoney(data.allocated_amount || 0);
  const spentAmount = normalizeMoney(data.spent_amount || 0);

  if (!department) {
    throw createHttpError(400, "department is required");
  }

  if (!fiscalYear) {
    throw createHttpError(400, "fiscal_year is required");
  }

  const result = await query(
    `
      INSERT INTO budgets (
        department,
        fiscal_year,
        allocated_amount,
        spent_amount
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [department, fiscalYear, allocatedAmount, spentAmount]
  );

  return result.rows[0];
}

async function updateBudget(budgetId, data) {
  const department = String(data.department ?? "").trim();
  const fiscalYear = String(data.fiscal_year ?? "").trim();
  const allocatedAmount = normalizeMoney(data.allocated_amount || 0);
  const spentAmount = normalizeMoney(data.spent_amount || 0);

  if (!department) {
    throw createHttpError(400, "department is required");
  }

  if (!fiscalYear) {
    throw createHttpError(400, "fiscal_year is required");
  }

  const result = await query(
    `
      UPDATE budgets
      SET
        department = $1,
        fiscal_year = $2,
        allocated_amount = $3,
        spent_amount = $4
      WHERE id = $5
      RETURNING *
    `,
    [department, fiscalYear, allocatedAmount, spentAmount, budgetId]
  );

  return result.rows[0] || null;
}

async function getTaxSummary() {
  const [taxCollectedResult, taxPaidResult, totalRemittedResult, taxPaymentsResult] =
    await Promise.all([
      query(
        `
          SELECT COALESCE(SUM(tax_amount), 0) AS total
          FROM invoices
        `
      ),
      query(
        `
          SELECT COALESCE(SUM(tax_amount), 0) AS total
          FROM bills
        `
      ),
      query(
        `
          SELECT COALESCE(SUM(amount_paid), 0) AS total
          FROM tax_payments
        `
      ),
      query(
        `
          SELECT *
          FROM tax_payments
          ORDER BY payment_date DESC
        `
      ),
    ]);

  const taxCollected = Number(taxCollectedResult.rows[0]?.total ?? 0);
  const taxPaid = Number(taxPaidResult.rows[0]?.total ?? 0);
  const totalRemitted = Number(totalRemittedResult.rows[0]?.total ?? 0);
  const netLiability = taxCollected - taxPaid - totalRemitted;

  return {
    taxCollected,
    taxPaid,
    totalRemitted,
    netLiability,
    tax_payments: taxPaymentsResult.rows,
  };
}

async function createTaxPayment(data) {
  const amountPaid = normalizeMoney(data.amount_paid);

  const result = await query(
    `
      INSERT INTO tax_payments (
        tax_period,
        amount_paid,
        payment_date,
        reference_number
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [
      data.tax_period,
      amountPaid,
      data.payment_date,
      data.reference_number,
    ]
  );

  return result.rows[0];
}

async function getJournalEntries() {
  const result = await query(
    `
      SELECT
        je.id,
        je.entry_date,
        je.description,
        je.reference_type,
        je.reference_id,
        SUM(jel.debit) AS total
      FROM journal_entries je
      JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
      GROUP BY
        je.id,
        je.entry_date,
        je.description,
        je.reference_type,
        je.reference_id
      ORDER BY je.entry_date DESC
    `
  );

  return result.rows;
}

async function getJournalEntryById(journalEntryId, client = null) {
  const executor = client || { query };

  const headerResult = await executor.query(
    `
      SELECT
        je.id,
        je.entry_date,
        je.description,
        je.reference_type,
        je.reference_id,
        je.created_at,
        je.created_by
      FROM journal_entries je
      WHERE je.id = $1
    `,
    [journalEntryId]
  );

  if (headerResult.rows.length === 0) {
    return null;
  }

  const linesResult = await executor.query(
    `
      SELECT
        jel.id,
        jel.account_id,
        jel.debit,
        jel.credit,
        a.account_code,
        a.name AS account_name,
        a.type AS account_type
      FROM journal_entry_lines jel
      LEFT JOIN accounts a ON a.id = jel.account_id
      WHERE jel.journal_entry_id = $1
      ORDER BY jel.id ASC
    `,
    [journalEntryId]
  );

  return {
    ...headerResult.rows[0],
    lines: linesResult.rows,
  };
}

async function createJournalEntry(data) {
  const normalizedLines = data.lines.map((line) => ({
    account_id: Number(line.account_id),
    debit: normalizeMoney(line.debit || 0),
    credit: normalizeMoney(line.credit || 0),
  }));

  const totalDebits = normalizedLines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredits = normalizedLines.reduce((sum, line) => sum + line.credit, 0);

  if (Number(totalDebits.toFixed(2)) !== Number(totalCredits.toFixed(2))) {
    throw createHttpError(400, "Debits must equal Credits");
  }

  if (Number(totalDebits.toFixed(2)) <= 0) {
    throw createHttpError(400, "Journal entry total must be greater than 0");
  }

  if (normalizedLines.some((line) => line.debit <= 0 && line.credit <= 0)) {
    throw createHttpError(400, "Each journal line must include a debit or credit amount");
  }

  return withTransaction(async (client) => {
    const headerResult = await client.query(
      `
        INSERT INTO journal_entries (description, entry_date, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [data.description, data.entry_date, data.created_by]
    );

    const journalEntryId = headerResult.rows[0].id;

    for (const line of normalizedLines) {
      await client.query(
        `
          INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
          VALUES ($1, $2, $3, $4)
        `,
        [journalEntryId, line.account_id, line.debit, line.credit]
      );
    }

    return {
      id: journalEntryId,
    };
  });
}

async function reverseJournalEntry(journalEntryId, createdBy) {
  return withTransaction(async (client) => {
    const originalEntry = await getJournalEntryById(journalEntryId, client);

    if (!originalEntry) {
      throw createHttpError(404, "Journal entry not found");
    }

    if (!Array.isArray(originalEntry.lines) || originalEntry.lines.length === 0) {
      throw createHttpError(400, "Journal entry has no lines to reverse");
    }

    const existingReversalResult = await client.query(
      `
        SELECT id
        FROM journal_entries
        WHERE reference_type = 'JournalReversal'
          AND reference_id = $1
        LIMIT 1
      `,
      [journalEntryId]
    );

    if (existingReversalResult.rows.length > 0) {
      throw createHttpError(409, "This journal entry has already been reversed");
    }

    const reversalDescription = `Reversal of JE #${journalEntryId} - ${originalEntry.description}`;
    const reversalDate = new Date().toISOString().slice(0, 10);

    const reversalHeaderResult = await client.query(
      `
        INSERT INTO journal_entries (
          entry_date,
          description,
          reference_type,
          reference_id,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        reversalDate,
        reversalDescription,
        "JournalReversal",
        journalEntryId,
        createdBy,
      ]
    );

    const reversalJournalEntryId = reversalHeaderResult.rows[0].id;

    for (const line of originalEntry.lines) {
      await client.query(
        `
          INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            debit,
            credit
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          reversalJournalEntryId,
          Number(line.account_id),
          normalizeMoney(line.credit || 0),
          normalizeMoney(line.debit || 0),
        ]
      );
    }

    return getJournalEntryById(reversalJournalEntryId, client);
  });
}

async function getARInvoices() {
  const result = await query(
    `
      SELECT
        i.id,
        i.invoice_number,
        i.total_amount,
        i.amount_paid,
        i.due_date,
        i.status,
        c.company_name AS customer_name
      FROM invoices i
      JOIN sales_orders so ON i.order_id = so.id
      JOIN customers c ON so.customer_id = c.id
      ORDER BY i.due_date ASC
    `
  );

  return result.rows;
}

async function markInvoicePaid(invoiceId) {
  const result = await query(
    `
      UPDATE invoices
      SET
        status = 'Paid',
        amount_paid = total_amount,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [invoiceId]
  );

  return result.rows[0] || null;
}

async function getAPBills() {
  const result = await query(
    `
      SELECT
        b.id,
        b.total_amount,
        b.amount_paid,
        b.status,
        b.due_date,
        v.name AS vendor_name
      FROM bills b
      JOIN vendors v ON b.vendor_id = v.id
      ORDER BY b.due_date ASC
    `
  );

  return result.rows;
}

async function createBill(data) {
  const vendorId = Number(data.vendor_id);
  const totalAmount = normalizeMoney(data.total_amount || 0);
  const amountPaid = normalizeMoney(data.amount_paid || 0);
  const taxAmount = normalizeMoney(data.tax_amount || 0);
  const issueDate = data.issue_date || null;
  const dueDate = data.due_date || null;
  const status = String(data.status ?? "").trim() || "Draft";

  if (!Number.isInteger(vendorId) || vendorId <= 0) {
    throw createHttpError(400, "vendor_id must be a valid vendor id");
  }

  if (!issueDate) {
    throw createHttpError(400, "issue_date is required");
  }

  if (!dueDate) {
    throw createHttpError(400, "due_date is required");
  }

  const result = await query(
    `
      INSERT INTO bills (
        vendor_id,
        total_amount,
        amount_paid,
        status,
        issue_date,
        due_date,
        tax_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [vendorId, totalAmount, amountPaid, status, issueDate, dueDate, taxAmount]
  );

  return result.rows[0];
}

async function markBillPaid(billId) {
  const result = await query(
    `
      UPDATE bills
      SET amount_paid = total_amount, status = 'Paid'
      WHERE id = $1
      RETURNING *
    `,
    [billId]
  );

  return result.rows[0] || null;
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
