const { z } = require("zod");

const { CANONICAL_ROLE_NAMES } = require("../utils/roleCatalog");

const registerEmployeeSchema = z.object({
  username: z.string().trim().min(3, "username is required"),
  password: z.string().min(8, "password must be at least 8 characters"),
  email: z.string().trim().email("email must be valid"),
  first_name: z.string().trim().min(1, "first_name is required"),
  last_name: z.string().trim().min(1, "last_name is required"),
  hire_date: z.string().date("hire_date must be a valid date"),
  role: z.enum(CANONICAL_ROLE_NAMES).optional(),
  role_id: z.coerce.number().int().positive().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  job_title: z.string().trim().optional(),
  base_salary: z.coerce.number().nonnegative().optional(),
  is_active: z.coerce.boolean().optional(),
}).superRefine((data, context) => {
  if (!data.role && !data.role_id) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["role"],
      message: "role is required",
    });
  }
});

const loginSchema = z.object({
  username: z.string().trim().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
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
  registerEmployeeSchema,
  loginSchema,
};
