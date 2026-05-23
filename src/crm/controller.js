const crmService = require("./service");

function handleError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: error.message || "Internal server error",
  });
}

async function getCustomers(req, res) {
  try {
    const result = await crmService.getCustomers();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createCustomer(req, res) {
  try {
    const result = await crmService.createCustomer(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateCustomer(req, res) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const result = await crmService.updateCustomer(customerId, req.body);

    if (!result) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getCustomerDetails(req, res) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const result = await crmService.getCustomerDetails(customerId);

    if (!result.customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getOpportunities(req, res) {
  try {
    const result = await crmService.getOpportunities();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createOpportunity(req, res) {
  try {
    const result = await crmService.createOpportunity(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateOpportunityStage(req, res) {
  try {
    const opportunityId = Number(req.params.id);

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      return res.status(400).json({ message: "Invalid opportunity id" });
    }

    const result = await crmService.updateOpportunityStage(
      opportunityId,
      req.body?.stage
    );

    if (!result) {
      return res.status(404).json({ message: "Opportunity not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getQuotations(req, res) {
  try {
    const result = await crmService.getQuotations();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createQuotation(req, res) {
  try {
    const result = await crmService.createQuotation(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateQuotationStatus(req, res) {
  try {
    const quotationId = Number(req.params.id);

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return res.status(400).json({ message: "Invalid quotation id" });
    }

    const result = await crmService.updateQuotationStatus(
      quotationId,
      req.body?.status
    );

    if (!result) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getPricingRules(req, res) {
  try {
    const result = await crmService.getPricingRules();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createPricingRule(req, res) {
  try {
    const result = await crmService.createPricingRule(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updatePricingRule(req, res) {
  try {
    const pricingRuleId = Number(req.params.id);

    if (!Number.isInteger(pricingRuleId) || pricingRuleId <= 0) {
      return res.status(400).json({ message: "Invalid pricing rule id" });
    }

    const result = await crmService.updatePricingRule(pricingRuleId, req.body);

    if (!result) {
      return res.status(404).json({ message: "Pricing rule not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
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
