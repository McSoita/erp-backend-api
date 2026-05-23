const scmService = require("./service");

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

async function getVendors(req, res) {
  try {
    const result = await scmService.getVendors();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createVendor(req, res) {
  try {
    const result = await scmService.createVendor(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateVendor(req, res) {
  try {
    const vendorId = Number(req.params.id);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
      return res.status(400).json({ message: "Invalid vendor id" });
    }

    const result = await scmService.updateVendor(vendorId, req.body);

    if (!result) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateVendorStatus(req, res) {
  try {
    const vendorId = Number(req.params.id);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
      return res.status(400).json({ message: "Invalid vendor id" });
    }

    const result = await scmService.updateVendorStatus(vendorId, req.body?.status);

    if (!result) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getPurchaseOrders(req, res) {
  try {
    const result = await scmService.getPurchaseOrders();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updatePurchaseOrderStatus(req, res) {
  try {
    const purchaseOrderId = Number(req.params.id);

    if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) {
      return res.status(400).json({ message: "Invalid purchase order id" });
    }

    const result = await scmService.updatePurchaseOrderStatus(
      purchaseOrderId,
      req.body?.status
    );

    if (!result) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getShipments(req, res) {
  try {
    const result = await scmService.getShipments();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateShipmentStatus(req, res) {
  try {
    const shipmentId = Number(req.params.id);

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return res.status(400).json({ message: "Invalid shipment id" });
    }

    const result = await scmService.updateShipmentStatus(shipmentId, req.body?.status);

    if (!result) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getForecast(req, res) {
  try {
    const result = await scmService.getForecast();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function createPurchaseOrder(req, res) {
  try {
    const result = await scmService.createPurchaseOrder(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getVendors,
  createVendor,
  updateVendor,
  updateVendorStatus,
  getPurchaseOrders,
  updatePurchaseOrderStatus,
  getShipments,
  updateShipmentStatus,
  getForecast,
  createPurchaseOrder,
};
