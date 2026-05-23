const dashboardService = require("./service");

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

async function getMetrics(req, res) {
  try {
    const result = await dashboardService.getMetrics();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getMetrics,
};
