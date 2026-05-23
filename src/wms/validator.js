const { z } = require("zod");

const movementTypes = [
  "Receiving",
  "Putaway",
  "Transfer",
  "Picking",
  "Shipping",
  "Adjustment",
];

const createMovementSchema = z
  .object({
    product_id: z.coerce.number().int().positive("product_id is required"),
    from_bin_id: z.coerce.number().int().positive().optional(),
    to_bin_id: z.coerce.number().int().positive().optional(),
    quantity: z.coerce.number().int().positive("quantity must be greater than 0"),
    movement_type: z.enum(movementTypes, {
      message: "movement_type must be a supported warehouse movement",
    }),
    moved_by: z.coerce.number().int().positive().optional(),
    reference_type: z.string().trim().optional(),
    reference_id: z.coerce.number().int().positive().optional(),
    movement_date: z.string().datetime().optional(),
  })
  .refine((value) => value.from_bin_id || value.to_bin_id, {
    message: "At least one of from_bin_id or to_bin_id is required",
    path: ["from_bin_id"],
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
  createMovementSchema,
};
