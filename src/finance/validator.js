const { z } = require("zod");

const invoiceStatuses = [
  "Draft",
  "Unpaid",
  "Partial",
  "Paid",
  "Overdue",
  "Cancelled",
];

const paymentMethods = [
  "Bank Transfer",
  "Credit Card",
  "Cash",
  "Mobile Money",
  "M-Pesa",
  "Check",
];

const createInvoiceSchema = z.object({
  invoice_number: z.string().trim().min(1, "invoice_number is required"),
  order_id: z.coerce.number().int().positive().optional(),
  invoice_date: z.string().date().optional(),
  due_date: z.string().date("due_date must be a valid date"),
  subtotal: z.coerce.number().nonnegative("subtotal must be 0 or greater"),
  tax_amount: z.coerce.number().nonnegative("tax_amount must be 0 or greater"),
  status: z.enum(invoiceStatuses).optional(),
});

const createPaymentSchema = z.object({
  invoice_id: z.coerce.number().int().positive("invoice_id is required"),
  amount_paid: z.coerce.number().positive("amount_paid must be greater than 0"),
  payment_method: z.enum(paymentMethods, {
    message: "payment_method must be a supported payment type",
  }),
  debit_account_id: z.coerce
    .number()
    .int()
    .positive("debit_account_id is required"),
  credit_account_id: z.coerce
    .number()
    .int()
    .positive("credit_account_id is required"),
  payment_reference: z.string().trim().optional(),
  payment_date: z.string().datetime().optional(),
});

const createJournalEntrySchema = z.object({
  description: z.string().trim().min(1, "description is required"),
  entry_date: z.string().date("entry_date must be a valid date"),
  lines: z
    .array(
      z.object({
        account_id: z.coerce
          .number()
          .int()
          .positive("account_id is required"),
        debit: z.coerce.number().nonnegative("debit must be 0 or greater"),
        credit: z.coerce.number().nonnegative("credit must be 0 or greater"),
      }),
    )
    .min(2, "At least two journal lines are required"),
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    return next();
  };
}

module.exports = {
  validateBody,
  createInvoiceSchema,
  createPaymentSchema,
  createJournalEntrySchema,
};
