const ROLE_MODULE_ACCESS = {
  Admin: {
    Finance: "write",
    BI: "write",
    CRM: "write",
    Inventory: "write",
    SCM: "write",
    "Sales Orders": "write",
    HR: "write",
  },
  Accountant: {
    Finance: "write",
  },
  Auditor: {
    BI: "write",
    CRM: "read",
    Inventory: "read",
    SCM: "read",
    "Sales Orders": "read",
    HR: "read",
  },
  "Sales executive": {
    BI: "write",
    SCM: "write",
    "Sales Orders": "write",
    CRM: "write",
  },
  "Human Resource": {
    HR: "write",
  },
  "Inventory Manager": {
    Inventory: "write",
    SCM: "write",
  },
  "Logistics manager": {
    "Sales Orders": "write",
    SCM: "write",
    Inventory: "read",
  },
  "Warehouse manager": {
    Inventory: "write",
  },
  "Junior sales": {
    "Sales Orders": "write",
  },
};

const CANONICAL_ROLE_NAME_LOOKUP = Object.fromEntries(
  Object.keys(ROLE_MODULE_ACCESS).map((roleName) => [roleName.toLowerCase(), roleName])
);

const ROLE_NAME_ALIASES = {
  "executive board": "Auditor",
  superadmin: "Admin",
  "super administrator": "Admin",
  "sales viewer": "Junior sales",
  "sales manager": "Sales executive",
  "sales representative": "Junior sales",
  "customer support": "Junior sales",
  "finance controller": "Accountant",
  "financial auditor": "Auditor",
  "hr director": "Human Resource",
  "hr assistant": "Human Resource",
  "logistics coordinator": "Logistics manager",
};

const MODULE_PERMISSION_KEYS = {
  Finance: "finance",
  BI: "bi",
  CRM: "crm",
  Inventory: "inventory",
  SCM: "scm",
  "Sales Orders": "sales",
  HR: "hr",
};

const CANONICAL_ROLE_NAMES = Object.keys(ROLE_MODULE_ACCESS);

function normalizeRoleName(roleName) {
  const normalizedValue = String(roleName ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  if (ROLE_MODULE_ACCESS[normalizedValue]) {
    return normalizedValue;
  }

  const normalizedLookupValue = normalizedValue.toLowerCase();

  return (
    CANONICAL_ROLE_NAME_LOOKUP[normalizedLookupValue] ??
    ROLE_NAME_ALIASES[normalizedLookupValue] ??
    null
  );
}

function buildPermissions(accessMap) {
  return Object.entries(accessMap).flatMap(([moduleName, accessLevel]) => {
    const permissionKey = MODULE_PERMISSION_KEYS[moduleName];

    if (!permissionKey) {
      return [];
    }

    if (accessLevel === "write") {
      return [`${permissionKey}:read`, `${permissionKey}:write`];
    }

    return [`${permissionKey}:read`];
  });
}

function getRolePermissions(roleName) {
  const normalizedRoleName = normalizeRoleName(roleName);

  if (!normalizedRoleName) {
    return null;
  }

  return buildPermissions(ROLE_MODULE_ACCESS[normalizedRoleName]);
}

async function ensureRoleCatalog(executor) {
  const query =
    typeof executor === "function" ? executor : executor?.query?.bind(executor);

  if (!query) {
    throw new Error("A database query function is required to ensure the role catalog");
  }

  const roleRows = [];

  for (const roleName of CANONICAL_ROLE_NAMES) {
    const permissions = getRolePermissions(roleName);
    const result = await query(
      `
        INSERT INTO roles (name, permissions)
        VALUES ($1, $2)
        ON CONFLICT (name)
        DO UPDATE SET permissions = EXCLUDED.permissions
        RETURNING id, name
      `,
      [roleName, permissions]
    );

    roleRows.push(result.rows[0]);
  }

  return roleRows;
}

async function resolveRoleId(client, roleInput) {
  if (roleInput == null || roleInput === "") {
    return null;
  }

  if (Number.isInteger(roleInput) && roleInput > 0) {
    return roleInput;
  }

  const numericRoleId = Number(roleInput);

  if (Number.isInteger(numericRoleId) && numericRoleId > 0) {
    return numericRoleId;
  }

  const normalizedRoleName = normalizeRoleName(roleInput);

  if (!normalizedRoleName) {
    throw new Error("Unsupported role");
  }

  await ensureRoleCatalog(client);

  const result = await client.query(
    `
      SELECT id
      FROM roles
      WHERE name = $1
    `,
    [normalizedRoleName]
  );

  if (result.rowCount === 0) {
    throw new Error("Role not found");
  }

  return result.rows[0].id;
}

module.exports = {
  ROLE_MODULE_ACCESS,
  CANONICAL_ROLE_NAMES,
  normalizeRoleName,
  getRolePermissions,
  ensureRoleCatalog,
  resolveRoleId,
};
