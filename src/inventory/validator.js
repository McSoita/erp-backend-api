const { z } = require("zod");

const createProductSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  price: z.coerce.number().nonnegative("price must be 0 or greater"),
  stock_quantity: z.coerce.number().int().nonnegative().default(0),
});

const updateProductSchema = z
  .object({
    sku: z.string().trim().min(1, "sku is required").optional(),
    name: z.string().trim().min(1, "name is required").optional(),
    unit_price: z.coerce
      .number()
      .nonnegative("unit_price must be 0 or greater")
      .optional(),
    cost_price: z.coerce
      .number()
      .nonnegative("cost_price must be 0 or greater")
      .optional(),
    category_id: z.coerce.number().int().positive().optional(),
    description: z.string().trim().optional(),
    stock_quantity: z.coerce.number().int().nonnegative().optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one product field is required for update",
  });

const createWarehouseSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  location_address: z.string().trim().min(1, "location_address is required"),
  manager_id: z.coerce.number().int().positive().optional(),
  is_active: z.coerce.boolean().optional(),
});

const updateWarehouseSchema = createWarehouseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one warehouse field is required for update",
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
  createProductSchema,
  updateProductSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
};
