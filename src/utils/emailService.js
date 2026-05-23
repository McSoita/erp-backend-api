const nodemailer = require("nodemailer");

let transporterPromise;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const testAccount = await nodemailer.createTestAccount();

      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    })();
  }

  return transporterPromise;
}

async function sendInvoiceEmail(customerEmail, pdfBuffer, orderId) {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: '"ERP Systems Inc." <invoices@erp-systems.test>',
    to: customerEmail,
    subject: `Your Invoice #${orderId}`,
    text: "Thank you for your business. Please find your invoice attached.",
    attachments: [
      {
        filename: `Invoice-${orderId}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  if (previewUrl) {
    console.log(`Invoice email preview for order ${orderId}: ${previewUrl}`);
  }

  return info;
}

module.exports = {
  sendInvoiceEmail,
};
