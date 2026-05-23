const PDFDocument = require("pdfkit");

async function generateInvoicePDF(orderData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });
    const chunks = [];
    const lines = Array.isArray(orderData.lines)
      ? orderData.lines
      : Array.isArray(orderData.order_lines)
        ? orderData.order_lines
        : [];
    const orderId = orderData.id || orderData.order_id || "N/A";
    const orderDate =
      orderData.date ||
      orderData.order_date ||
      orderData.created_at ||
      new Date().toISOString();
    const customerName =
      orderData.customerName ||
      orderData.customer_name ||
      orderData.customer_company_name ||
      "Customer";

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(24).fillColor("#0f172a").text("ERP Systems Inc.", 50, 50);
    doc
      .fontSize(11)
      .fillColor("#64748b")
      .text("Modern ERP solutions for growing operations.", 50, 82);

    doc
      .fontSize(20)
      .fillColor("#0f172a")
      .text("Invoice", 50, 130, { align: "right" });
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`Invoice / Order ID: ${orderId}`, 50, 160, { align: "right" });
    doc
      .fontSize(11)
      .fillColor("#334155")
      .text(`Date: ${new Date(orderDate).toLocaleDateString()}`, 50, 178, {
        align: "right",
      });

    doc
      .fontSize(12)
      .fillColor("#0f172a")
      .text("Bill To", 50, 150)
      .fontSize(14)
      .text(customerName, 50, 170);

    const tableTop = 240;
    const columnX = {
      productId: 50,
      quantity: 230,
      unitPrice: 320,
      lineTotal: 440,
    };

    doc
      .moveTo(50, tableTop - 12)
      .lineTo(545, tableTop - 12)
      .strokeColor("#cbd5e1")
      .stroke();

    doc
      .fontSize(11)
      .fillColor("#475569")
      .text("Product ID", columnX.productId, tableTop)
      .text("Quantity", columnX.quantity, tableTop)
      .text("Unit Price", columnX.unitPrice, tableTop)
      .text("Line Total", columnX.lineTotal, tableTop);

    let y = tableTop + 28;
    let grandTotal = 0;

    for (const line of lines) {
      const quantity = Number(line.quantity ?? 0);
      const unitPrice = Number(line.unit_price ?? line.unitPrice ?? 0);
      const lineTotal = Number(
        line.subtotal ?? quantity * unitPrice
      );

      grandTotal += lineTotal;

      doc
        .fontSize(11)
        .fillColor("#0f172a")
        .text(String(line.product_id ?? line.productId ?? "N/A"), columnX.productId, y)
        .text(String(quantity), columnX.quantity, y)
        .text(unitPrice.toFixed(2), columnX.unitPrice, y)
        .text(lineTotal.toFixed(2), columnX.lineTotal, y);

      y += 24;

      doc
        .moveTo(50, y - 6)
        .lineTo(545, y - 6)
        .strokeColor("#e2e8f0")
        .stroke();
    }

    if (y < 360) {
      y = 360;
    }

    doc
      .fontSize(14)
      .fillColor("#0f172a")
      .text(`Grand Total: ${grandTotal.toFixed(2)}`, 50, y + 20, {
        align: "right",
      });

    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text(
        "Thank you for your business.",
        50,
        760,
        { align: "center", width: 495 }
      );

    doc.end();
  });
}

module.exports = {
  generateInvoicePDF,
};
