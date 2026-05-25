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

const ROLE_RECORDS = {
  Admin: [
    { id: 113, name: "Admin", preferred: true },
    { id: 1, name: "SuperAdmin" },
  ],
  Accountant: [{ id: 122, name: "Accountant", preferred: true }],
  Auditor: [
    { id: 123, name: "Auditor", preferred: true },
    { id: 114, name: "Executive Board" },
  ],
  "Sales executive": [{ id: 115, name: "Sales executive", preferred: true }],
  "Human Resource": [
    { id: 120, name: "Human Resource", preferred: true },
    { id: 121, name: "HR Assistant" },
  ],
  "Inventory Manager": [{ id: 124, name: "Inventory Manager", preferred: true }],
  "Logistics manager": [{ id: 119, name: "Logistics manager", preferred: true }],
  "Warehouse manager": [{ id: 118, name: "Warehouse manager", preferred: true }],
  "Junior sales": [
    { id: 116, name: "Junior sales", preferred: true },
    { id: 2, name: "Sales Viewer" },
    { id: 117, name: "Customer Support" },
  ],
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
const PREFERRED_ROLE_IDS = Object.fromEntries(
  Object.entries(ROLE_RECORDS).map(([roleName, records]) => [
    roleName,
    records.find((record) => record.preferred)?.id ?? records[0]?.id ?? null,
  ])
);

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

  const permissions = buildPermissions(ROLE_MODULE_ACCESS[normalizedRoleName]);

  if (normalizedRoleName === "Admin") {
    return ["*", ...permissions];
  }

  return permissions;
}

function createRoleResolutionError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function ensureRoleCatalog(executor) {
  const query =
    typeof executor === "function" ? executor : executor?.query?.bind(executor);

  if (!query) {
    throw new Error("A database query function is required to ensure the role catalog");
  }

  const roleRows = [];

  for (const roleName of CANONICAL_ROLE_NAMES) {
    const permissions = JSON.stringify(getRolePermissions(roleName));
    const roleRecords = ROLE_RECORDS[roleName] ?? [];

    for (const roleRecord of roleRecords) {
      const result = await query(
        `
          INSERT INTO roles (id, name, permissions)
          OVERRIDING SYSTEM VALUE
          VALUES ($1, $2, $3::jsonb)
          ON CONFLICT (id)
          DO UPDATE SET
            name = EXCLUDED.name,
            permissions = EXCLUDED.permissions,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, name
        `,
        [roleRecord.id, roleRecord.name, permissions]
      );

      roleRows.push({
        ...result.rows[0],
        canonical_name: roleName,
      });
    }
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
    throw createRoleResolutionError("Unsupported role");
  }

  await ensureRoleCatalog(client);

  const roleId = PREFERRED_ROLE_IDS[normalizedRoleName];

  if (!roleId) {
    throw createRoleResolutionError("Role not found");
  }

  const result = await client.query(
    `
      SELECT id
      FROM roles
      WHERE id = $1
    `,
    [roleId]
  );

  if (result.rowCount === 0) {
    throw createRoleResolutionError("Role not found");
  }

  return roleId;
}

module.exports = {
  ROLE_MODULE_ACCESS,
  CANONICAL_ROLE_NAMES,
  normalizeRoleName,
  getRolePermissions,
  ensureRoleCatalog,
  resolveRoleId,
};
