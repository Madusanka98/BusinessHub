import { describe, it, expect } from "vitest";
import { hasPermission, hasSuperAdminPermission } from "@/lib/tenant/permissions";

describe("Multi-Tenant Role & Permissions Matrix", () => {
  it("grants OWNER full administrative and financial permissions", () => {
    expect(hasPermission("OWNER", "tenancy:members:invite_owner")).toBe(true);
    expect(hasPermission("OWNER", "finance:transactions:approve")).toBe(true);
    expect(hasPermission("OWNER", "finance:period:close")).toBe(true);
    expect(hasPermission("OWNER", "mushroom:harvest:log")).toBe(true);
    expect(hasPermission("OWNER", "tenancy:settings:update")).toBe(true);
  });

  it("restricts PARTNER_FINANCE from operational and owner-only settings", () => {
    // Allowed
    expect(hasPermission("PARTNER_FINANCE", "finance:transactions:view")).toBe(true);
    expect(hasPermission("PARTNER_FINANCE", "finance:reports:view")).toBe(true);
    expect(hasPermission("PARTNER_FINANCE", "finance:drawings:request")).toBe(true);

    // Strictly Restricted
    expect(hasPermission("PARTNER_FINANCE", "tenancy:members:invite_owner")).toBe(false);
    expect(hasPermission("PARTNER_FINANCE", "tenancy:settings:update")).toBe(false);
    expect(hasPermission("PARTNER_FINANCE", "finance:period:close")).toBe(false);
    expect(hasPermission("PARTNER_FINANCE", "mushroom:harvest:log")).toBe(false);
  });

  it("restricts PARTNER_OPERATIONS from partner capital and dividend distribution", () => {
    // Allowed
    expect(hasPermission("PARTNER_OPERATIONS", "mushroom:batches:create")).toBe(true);
    expect(hasPermission("PARTNER_OPERATIONS", "mushroom:harvest:log")).toBe(true);
    expect(hasPermission("PARTNER_OPERATIONS", "inventory:stock:adjust")).toBe(true);
    expect(hasPermission("PARTNER_OPERATIONS", "finance:transactions:create")).toBe(true); // Can record farm expense

    // Strictly Restricted
    expect(hasPermission("PARTNER_OPERATIONS", "finance:capital:view")).toBe(false);
    expect(hasPermission("PARTNER_OPERATIONS", "finance:period:close")).toBe(false);
    expect(hasPermission("PARTNER_OPERATIONS", "tenancy:members:invite_owner")).toBe(false);
  });

  it("strictly bars STAFF from financial and partner data", () => {
    // Allowed
    expect(hasPermission("STAFF", "mushroom:harvest:log")).toBe(true);
    expect(hasPermission("STAFF", "mushroom:batches:view")).toBe(true);

    // Strictly Restricted
    expect(hasPermission("STAFF", "finance:transactions:view")).toBe(false);
    expect(hasPermission("STAFF", "finance:reports:view")).toBe(false);
    expect(hasPermission("STAFF", "tenancy:members:invite_staff")).toBe(false);
    expect(hasPermission("STAFF", "tenancy:audit:view")).toBe(false);
  });

  it("evaluates Super Admin platform scoping correctly", () => {
    expect(hasSuperAdminPermission(true, "superadmin:business:create")).toBe(true);
    expect(hasSuperAdminPermission(true, "superadmin:owner:assign")).toBe(true);
    expect(hasSuperAdminPermission(false, "superadmin:business:create")).toBe(false);
  });
});
