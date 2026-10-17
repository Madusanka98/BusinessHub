import { describe, it, expect } from "vitest";

describe("Business Owner Quota Enforcement Logic (1-10 Limit)", () => {
  function checkOwnerQuota(
    maxOwners: number,
    activeOwners: number,
    pendingUnexpiredInvites: number,
    roleToAssign: string
  ): { allowed: boolean; error?: string } {
    if (roleToAssign !== "OWNER") {
      return { allowed: true };
    }

    if (maxOwners < 1 || maxOwners > 10) {
      return { allowed: false, error: "Business maxOwners must be between 1 and 10." };
    }

    const totalReserved = activeOwners + pendingUnexpiredInvites;
    if (totalReserved >= maxOwners) {
      return {
        allowed: false,
        error: `Cannot add owner: Business reached quota of ${maxOwners} owners (${activeOwners} active, ${pendingUnexpiredInvites} pending).`,
      };
    }

    return { allowed: true };
  }

  it("permits adding an owner when active + pending < maxOwners", () => {
    const res = checkOwnerQuota(3, 1, 1, "OWNER");
    expect(res.allowed).toBe(true);
  });

  it("strictly rejects adding an owner when active + pending equals maxOwners", () => {
    const res = checkOwnerQuota(3, 2, 1, "OWNER");
    expect(res.allowed).toBe(false);
    expect(res.error).toContain("reached quota of 3 owners");
  });

  it("allows non-owner roles (e.g. PARTNER_FINANCE, STAFF) even when owner quota is full", () => {
    const resPartner = checkOwnerQuota(3, 3, 0, "PARTNER_FINANCE");
    expect(resPartner.allowed).toBe(true);

    const resStaff = checkOwnerQuota(3, 3, 0, "STAFF");
    expect(resStaff.allowed).toBe(true);
  });

  it("frees a seat when a pending invite expires or is revoked", () => {
    // Before: 2 active + 1 pending = 3 (full)
    expect(checkOwnerQuota(3, 2, 1, "OWNER").allowed).toBe(false);

    // After invite revoked: 2 active + 0 pending = 2 < 3 (available)
    expect(checkOwnerQuota(3, 2, 0, "OWNER").allowed).toBe(true);
  });
});
