const { query } = require("../config/db");

const CUSTOMER_STATUSES = new Set(["Lead", "Active", "Inactive", "Churned"]);
const OPPORTUNITY_STAGES = new Set([
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
]);
const QUOTATION_STATUSES = new Set([
  "Draft",
  "Sent",
  "Accepted",
  "Expired",
  "Rejected",
]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRequiredText(value, fieldName) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    throw createHttpError(400, `${fieldName} is required`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || null;
}

function normalizePositiveInteger(value, fieldName) {
  const normalizedValue = Number(value);

  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }

  return normalizedValue;
}

function normalizeMoney(value, fieldName) {
  const normalizedValue = Number(value);

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    throw createHttpError(400, `${fieldName} must be a valid amount`);
  }

  return Number(normalizedValue.toFixed(2));
}

function normalizePercentage(value, fieldName) {
  const normalizedValue = normalizeMoney(value, fieldName);

  if (normalizedValue > 100) {
    throw createHttpError(400, `${fieldName} must be between 0 and 100`);
  }

  return normalizedValue;
}

function normalizeEnum(value, allowedValues, fieldName) {
  const normalizedValue = String(value ?? "").trim();

  if (!allowedValues.has(normalizedValue)) {
    throw createHttpError(
      400,
      `${fieldName} must be one of: ${Array.from(allowedValues).join(", ")}`
    );
  }

  return normalizedValue;
}

async function getCustomers() {
  const result = await query(
    `
      SELECT *
      FROM customers
      ORDER BY id DESC
    `
  );

  return result.rows;
}

async function createCustomer(payload) {
  const result = await query(
    `
      INSERT INTO customers (
        company_name,
        industry,
        primary_contact_name,
        primary_email,
        primary_phone,
        billing_address,
        shipping_address,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      normalizeRequiredText(payload.company_name, "company_name"),
      normalizeOptionalText(payload.industry),
      normalizeOptionalText(payload.primary_contact_name),
      normalizeOptionalText(payload.primary_email),
      normalizeOptionalText(payload.primary_phone),
      normalizeOptionalText(payload.billing_address),
      normalizeOptionalText(payload.shipping_address),
      normalizeEnum(payload.status || "Lead", CUSTOMER_STATUSES, "status"),
    ]
  );

  return result.rows[0];
}

async function updateCustomer(customerId, payload) {
  const result = await query(
    `
      UPDATE customers
      SET company_name = $2,
          industry = $3,
          primary_contact_name = $4,
          primary_email = $5,
          primary_phone = $6,
          billing_address = $7,
          shipping_address = $8,
          status = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
    [
      customerId,
      normalizeRequiredText(payload.company_name, "company_name"),
      normalizeOptionalText(payload.industry),
      normalizeOptionalText(payload.primary_contact_name),
      normalizeOptionalText(payload.primary_email),
      normalizeOptionalText(payload.primary_phone),
      normalizeOptionalText(payload.billing_address),
      normalizeOptionalText(payload.shipping_address),
      normalizeEnum(payload.status || "Lead", CUSTOMER_STATUSES, "status"),
    ]
  );

  return result.rows[0] || null;
}

async function getCustomerDetails(customerId) {
  const [customerResult, opportunitiesResult, quotationsResult] = await Promise.all([
    query(
      `
        SELECT *
        FROM customers
        WHERE id = $1
      `,
      [customerId]
    ),
    query(
      `
        SELECT *
        FROM opportunities
        WHERE customer_id = $1
        ORDER BY expected_close_date ASC NULLS LAST
      `,
      [customerId]
    ),
    query(
      `
        SELECT *
        FROM quotations
        WHERE customer_id = $1
        ORDER BY created_at DESC
      `,
      [customerId]
    ),
  ]);

  return {
    customer: customerResult.rows[0] || null,
    opportunities: opportunitiesResult.rows,
    quotations: quotationsResult.rows,
  };
}

async function getOpportunities() {
  const result = await query(
    `
      SELECT
        o.*,
        c.company_name AS customer_name
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.expected_close_date ASC NULLS LAST
    `
  );

  return result.rows;
}

async function createOpportunity(payload) {
  const customerId = normalizePositiveInteger(payload.customer_id, "customer_id");
  const title = normalizeRequiredText(payload.title, "title");
  const stage = normalizeEnum(payload.stage, OPPORTUNITY_STAGES, "stage");
  const estimatedValue = normalizeMoney(payload.estimated_value, "estimated_value");
  const expectedCloseDate = payload.expected_close_date || null;

  const result = await query(
    `
      INSERT INTO opportunities (
        customer_id,
        title,
        stage,
        estimated_value,
        expected_close_date
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [customerId, title, stage, estimatedValue, expectedCloseDate]
  );

  return result.rows[0];
}

async function updateOpportunityStage(opportunityId, stage) {
  const normalizedStage = normalizeEnum(stage, OPPORTUNITY_STAGES, "stage");

  const result = await query(
    `
      UPDATE opportunities o
      SET stage = $2
      WHERE o.id = $1
      RETURNING o.*
    `,
    [opportunityId, normalizedStage]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const detailsResult = await query(
    `
      SELECT
        o.*,
        c.company_name AS customer_name
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `,
    [opportunityId]
  );

  return detailsResult.rows[0] || null;
}

async function getQuotations() {
  const result = await query(
    `
      SELECT
        q.*,
        c.company_name AS customer_name
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      ORDER BY q.created_at DESC
    `
  );

  return result.rows;
}

async function createQuotation(payload) {
  const result = await query(
    `
      INSERT INTO quotations (
        customer_id,
        quote_number,
        valid_until,
        status,
        total_amount
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      normalizePositiveInteger(payload.customer_id, "customer_id"),
      normalizeRequiredText(payload.quote_number, "quote_number"),
      payload.valid_until || null,
      normalizeEnum(payload.status || "Draft", QUOTATION_STATUSES, "status"),
      normalizeMoney(payload.total_amount, "total_amount"),
    ]
  );

  const quotationResult = await query(
    `
      SELECT
        q.*,
        c.company_name AS customer_name
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `,
    [result.rows[0].id]
  );

  return quotationResult.rows[0];
}

async function updateQuotationStatus(quotationId, status) {
  const normalizedStatus = normalizeEnum(
    status,
    QUOTATION_STATUSES,
    "status"
  );

  const result = await query(
    `
      UPDATE quotations q
      SET status = $2
      WHERE q.id = $1
      RETURNING q.*
    `,
    [quotationId, normalizedStatus]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const quotationResult = await query(
    `
      SELECT
        q.*,
        c.company_name AS customer_name
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = $1
    `,
    [quotationId]
  );

  return quotationResult.rows[0] || null;
}

async function getPricingRules() {
  const result = await query(
    `
      SELECT
        pr.*,
        p.name AS product_name
      FROM pricing_rules pr
      LEFT JOIN products p ON pr.product_id = p.id
      ORDER BY pr.rule_name ASC
    `
  );

  return result.rows;
}

async function createPricingRule(payload) {
  const result = await query(
    `
      INSERT INTO pricing_rules (
        rule_name,
        product_id,
        min_quantity,
        discount_percentage,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      normalizeRequiredText(payload.rule_name, "rule_name"),
      normalizePositiveInteger(payload.product_id, "product_id"),
      normalizePositiveInteger(payload.min_quantity, "min_quantity"),
      normalizePercentage(payload.discount_percentage, "discount_percentage"),
      payload.is_active ?? true,
    ]
  );

  return result.rows[0];
}

async function updatePricingRule(pricingRuleId, payload) {
  const result = await query(
    `
      UPDATE pricing_rules
      SET rule_name = $2,
          product_id = $3,
          min_quantity = $4,
          discount_percentage = $5,
          is_active = $6
      WHERE id = $1
      RETURNING *
    `,
    [
      pricingRuleId,
      normalizeRequiredText(payload.rule_name, "rule_name"),
      normalizePositiveInteger(payload.product_id, "product_id"),
      normalizePositiveInteger(payload.min_quantity, "min_quantity"),
      normalizePercentage(payload.discount_percentage, "discount_percentage"),
      Boolean(payload.is_active),
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const pricingRuleResult = await query(
    `
      SELECT
        pr.*,
        p.name AS product_name
      FROM pricing_rules pr
      LEFT JOIN products p ON pr.product_id = p.id
      WHERE pr.id = $1
    `,
    [pricingRuleId]
  );

  return pricingRuleResult.rows[0] || null;
}

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  getCustomerDetails,
  getOpportunities,
  createOpportunity,
  updateOpportunityStage,
  getQuotations,
  createQuotation,
  updateQuotationStatus,
  getPricingRules,
  createPricingRule,
  updatePricingRule,
};
