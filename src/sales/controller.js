const salesService = require("./service");
const { sendInvoiceEmail } = require("../utils/emailService");
const { generateInvoicePDF } = require("../utils/pdfGenerator");

function handleError(res, error) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      message: "Invalid customer_id or product_id reference",
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      message: "Request violates a database validation rule",
    });
  }

  if (error.code === "22P02") {
    return res.status(400).json({
      message: "Invalid input format",
    });
  }

  return res.status(500).json({
    message: error.message || "Internal server error",
  });
}

async function createOrder(req, res) {
  try {
    const result = await salesService.createSalesOrder(req.body);

    try {
      const customer = await salesService.getCustomerInvoiceRecipient(
        result.customer_id
      );

      if (customer?.email) {
        const invoiceOrderData = {
          id: result.id,
          date: result.order_date || result.created_at,
          customerName: customer.name || result.customer_company_name,
          lines: Array.isArray(result.order_lines)
            ? result.order_lines.map((line) => ({
                product_id: line.product_id,
                quantity: line.quantity,
                unit_price: line.unit_price,
                subtotal: line.subtotal,
              }))
            : [],
        };

        const pdfBuffer = await generateInvoicePDF(invoiceOrderData);
        await sendInvoiceEmail(customer.email, pdfBuffer, result.id);
      } else {
        console.warn(
          `Invoice email skipped for order ${result.id}: customer email not found.`
        );
      }
    } catch (emailError) {
      console.error(
        `Failed to generate or send invoice email for order ${result.id}:`,
        emailError
      );
    }

    return res.status(201).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listCustomers(req, res) {
  try {
    const result = await salesService.listCustomers();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listOrders(req, res) {
  try {
    const result = await salesService.listSalesOrders();
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getOrder(req, res) {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const result = await salesService.getSalesOrderById(orderId);

    if (!result) {
      return res.status(404).json({ message: "Sales order not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateOrderStatus(req, res) {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const result = await salesService.updateSalesOrderStatus(
      orderId,
      req.body?.status
    );

    if (!result) {
      return res.status(404).json({ message: "Sales order not found" });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
}

module.exports = {
  createOrder,
  listCustomers,
  listOrders,
  getOrder,
  updateOrderStatus,
};
