import { MembershipRole } from "@prisma/client";

export type Permission =
  // Tenant Governance
  | "tenancy:settings:update"
  | "tenancy:members:view"
  | "tenancy:members:invite_owner"
  | "tenancy:members:invite_partner"
  | "tenancy:members:invite_staff"
  | "tenancy:members:manage_roles"
  | "tenancy:members:revoke"
  | "tenancy:audit:view"
  // Core Finance
  | "finance:transactions:view"
  | "finance:transactions:create"
  | "finance:transactions:approve"
  | "finance:capital:manage"
  | "finance:capital:view"
  | "finance:drawings:request"
  | "finance:drawings:approve"
  | "finance:loans:manage"
  | "finance:loans:view"
  | "finance:rules:manage"
  | "finance:rules:view"
  | "finance:period:close"
  | "finance:reports:view"
  // Core Inventory & Commerce
  | "inventory:products:view"
  | "inventory:products:manage"
  | "inventory:stock:adjust"
  | "purchases:view"
  | "purchases:manage"
  | "sales:orders:view"
  | "sales:orders:manage"
  | "contacts:manage"
  // Mushroom Cultivation
  | "mushroom:recipes:view"
  | "mushroom:recipes:manage"
  | "mushroom:batches:view"
  | "mushroom:batches:create"
  | "mushroom:batches:advance_phase"
  | "mushroom:harvest:log"
  | "mushroom:waste:log"
  | "mushroom:drying:process"
  | "mushroom:reports:view"
  // Reports, Schedules & Notifications
  | "reports:view"
  | "reports:export"
  | "reports:schedule:manage"
  | "notifications:preferences:manage";

export type SuperAdminPermission =
  | "superadmin:business:create"
  | "superadmin:business:read"
  | "superadmin:business:suspend"
  | "superadmin:business:archive"
  | "superadmin:owner:assign"
  | "superadmin:platform:audit"
  | "superadmin:platform:settings";

const ROLE_PERMISSIONS: Record<MembershipRole, Set<Permission>> = {
  OWNER: new Set<Permission>([
    // All tenant capabilities
    "tenancy:settings:update",
    "tenancy:members:view",
    "tenancy:members:invite_owner",
    "tenancy:members:invite_partner",
    "tenancy:members:invite_staff",
    "tenancy:members:manage_roles",
    "tenancy:members:revoke",
    "tenancy:audit:view",
    "finance:transactions:view",
    "finance:transactions:create",
    "finance:transactions:approve",
    "finance:capital:manage",
    "finance:capital:view",
    "finance:drawings:request",
    "finance:drawings:approve",
    "finance:loans:manage",
    "finance:loans:view",
    "finance:rules:manage",
    "finance:rules:view",
    "finance:period:close",
    "finance:reports:view",
    "inventory:products:view",
    "inventory:products:manage",
    "inventory:stock:adjust",
    "purchases:view",
    "purchases:manage",
    "sales:orders:view",
    "sales:orders:manage",
    "contacts:manage",
    "mushroom:recipes:view",
    "mushroom:recipes:manage",
    "mushroom:batches:view",
    "mushroom:batches:create",
    "mushroom:batches:advance_phase",
    "mushroom:harvest:log",
    "mushroom:waste:log",
    "mushroom:drying:process",
    "mushroom:reports:view",
    "reports:view",
    "reports:export",
    "reports:schedule:manage",
    "notifications:preferences:manage",
  ]),

  PARTNER_FINANCE: new Set<Permission>([
    "tenancy:members:view",
    "finance:transactions:view",
    "finance:transactions:create",
    "finance:capital:view",
    "finance:drawings:request",
    "finance:loans:view",
    "finance:rules:view",
    "finance:reports:view",
    "inventory:products:view",
    "purchases:view",
    "sales:orders:view",
    "mushroom:batches:view",
    "mushroom:reports:view",
    "reports:view",
    "reports:export",
    "reports:schedule:manage",
    "notifications:preferences:manage",
  ]),

  PARTNER_OPERATIONS: new Set<Permission>([
    "tenancy:members:view",
    "finance:transactions:create", // Can log operational expenses
    "inventory:products:view",
    "inventory:products:manage",
    "inventory:stock:adjust",
    "purchases:view",
    "purchases:manage",
    "sales:orders:view",
    "sales:orders:manage",
    "contacts:manage",
    "mushroom:recipes:view",
    "mushroom:recipes:manage",
    "mushroom:batches:view",
    "mushroom:batches:create",
    "mushroom:batches:advance_phase",
    "mushroom:harvest:log",
    "mushroom:waste:log",
    "mushroom:drying:process",
    "mushroom:reports:view",
    "reports:view",
    "reports:export",
    "reports:schedule:manage",
    "notifications:preferences:manage",
  ]),

  STAFF: new Set<Permission>([
    "inventory:products:view",
    "mushroom:batches:view",
    "mushroom:batches:create",
    "mushroom:batches:advance_phase",
    "mushroom:harvest:log",
    "mushroom:waste:log",
    "mushroom:drying:process",
    "reports:view",
  ]),

  VIEWER: new Set<Permission>([
    "tenancy:members:view",
    "finance:transactions:view",
    "finance:capital:view",
    "finance:loans:view",
    "finance:rules:view",
    "finance:reports:view",
    "inventory:products:view",
    "purchases:view",
    "sales:orders:view",
    "mushroom:batches:view",
    "mushroom:reports:view",
    "reports:view",
  ]),
};

/**
 * Checks whether a given role holds the requested business permission.
 */
export function hasPermission(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/**
 * Validates whether an action can be performed by an active Super Admin.
 */
export function hasSuperAdminPermission(isSuperAdmin: boolean, permission: SuperAdminPermission): boolean {
  if (!isSuperAdmin) return false;
  return true; // Super admins hold platform administrative rights
}
