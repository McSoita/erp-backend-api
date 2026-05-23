const biService = require("./service");

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

async function getKPIs(req, res) {
  try {
    const result = await biService.getKPIs();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getRevenueTrend(req, res) {
  try {
    const result = await biService.getRevenueTrend();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getAuditLogs(req, res) {
  try {
    const result = await biService.getAuditLogs();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

async function exportModuleCsv(req, res) {
  try {
    const exportData = await biService.getModuleExportData(req.params.module);
    const headers = exportData.columns.join(",");
    const rows = exportData.rows.map((row) =>
      exportData.columns.map((column) => escapeCsvValue(row[column])).join(",")
    );
    const csv = [headers, ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${exportData.fileName}"`
    );

    return res.status(200).send(csv);
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  getKPIs,
  getRevenueTrend,
  getAuditLogs,
  exportModuleCsv,
};
