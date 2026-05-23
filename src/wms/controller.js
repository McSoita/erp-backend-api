const wmsService = require("./service");

function handleError(res, error) {
  if (error.code === "23503") {
    return res.status(400).json({
      message: "Invalid product, bin, or employee reference",
    });
  }

  if (error.code === "23514" || error.code === "22P02") {
    return res.status(400).json({
      message: "Warehouse movement failed database validation",
    });
  }

  return res.status(500).json({
    message: error.message || "Internal server error",
  });
}

async function recordMovement(req, res) {
  try {
    const result = await wmsService.recordMovement(req.body);
    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getBinInventory(req, res) {
  try {
    const warehouseId = Number(req.params.warehouseId);

    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      return res.status(400).json({ message: "Invalid warehouse id" });
    }

    const result = await wmsService.getBinInventory(warehouseId);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  recordMovement,
  getBinInventory,
};
