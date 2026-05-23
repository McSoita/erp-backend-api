const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

function auth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authorization token is required",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "JWT_SECRET is not configured",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token",
    });
  }
}

function requirePermission(requiredAction) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role_id) {
        return res.status(403).json({
          message: "User role is missing",
        });
      }

      const result = await query(
        `
          SELECT permissions
          FROM roles
          WHERE id = $1
        `,
        [req.user.role_id]
      );

      const role = result.rows[0];

      if (!role) {
        return res.status(403).json({
          message: "Role not found",
        });
      }

      const permissions = Array.isArray(role.permissions) ? role.permissions : [];

      if (
        permissions.includes("*") ||
        permissions.includes(requiredAction)
      ) {
        return next();
      }

      return res.status(403).json({
        message: "Forbidden: insufficient permissions",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to verify permissions",
      });
    }
  };
}

module.exports = auth;
module.exports.requirePermission = requirePermission;
