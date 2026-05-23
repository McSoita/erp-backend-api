const { z } = require("zod");

const createSalesOrderSchema = z.object({
  customer_id: z.coerce.number().int().positive("customer_id is required"),
  order_date: z.string().datetime().optional(),
  status: z.string().trim().min(1).optional(),
  order_lines: z
    .array(
      z.object({
        product_id: z.coerce.number().int().positive("product_id is required"),
        quantity: z.coerce.number().int().min(1, "quantity must be at least 1"),
        unit_price: z.coerce
          .number()
          .nonnegative("unit_price must be 0 or greater"),
      })
    )
    .min(1, "order_lines must contain at least one item"),
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
  createSalesOrderSchema,
};
