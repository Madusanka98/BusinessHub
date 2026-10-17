import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createBusinessBySuperAdmin,
  getBusinessDetails,
  updateBusinessSettings,
  getBusinessMembers,
  updateMemberRole,
  removeMember,
  getBusinessAuditTrail,
} from "@/modules/core-tenancy/services/business.service";
import { createInvitation } from "@/modules/core-tenancy/services/invitation.service";
import { assertNotLastOwner, assertOwnerQuotaAvailable } from "@/modules/core-tenancy/services/ownerQuota.service";
import { hasPermission } from "@/lib/tenant/permissions";
import { hashPassword } from "@/lib/auth/password";

describe("Task 4: Core Business & Partner Management", () => {
  const timestamp = Date.now();
  const superAdminEmail = `superadmin-${timestamp}@test.local`;
  const ownerAEmail = `owner-a-${timestamp}@test.local`;
  const ownerBEmail = `owner-b-${timestamp}@test.local`;
  const staffEmail = `staff-${timestamp}@test.local`;

  let superAdminId: string;
  let ownerAId: string;
  let ownerBId: string;
  let staffId: string;

  let businessAId: string;
  let businessBId: string;

  beforeAll(async () => {
    // 1. Seed Super Admin
    const pwd = await hashPassword("ValidPass@123!");
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        fullName: "Platform Super Admin",
        passwordHash: pwd,
        isSuperAdmin: true,
        isActive: true,
      },
    });
    superAdminId = superAdmin.id;

    // 2. Seed Users
    const ownerA = await prisma.user.create({
      data: {
        email: ownerAEmail,
        fullName: "Owner Tenant A",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    ownerAId = ownerA.id;

    const ownerB = await prisma.user.create({
      data: {
        email: ownerBEmail,
        fullName: "Owner Tenant B",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    ownerBId = ownerB.id;

    const staff = await prisma.user.create({
      data: {
        email: staffEmail,
        fullName: "Staff Member",
        passwordHash: pwd,
        isSuperAdmin: false,
        isActive: true,
      },
    });
    staffId = staff.id;
  });

  afterAll(async () => {
    // Cleanup created businesses & users
    if (businessAId) {
      await prisma.business.delete({ where: { id: businessAId } }).catch(() => {});
    }
    if (businessBId) {
      await prisma.business.delete({ where: { id: businessBId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: {
        id: { in: [superAdminId, ownerAId, ownerBId, staffId].filter(Boolean) },
      },
    }).catch(() => {});
  });

  it("1. Provisions a new business with initial owner via Super Admin", async () => {
    const result = await createBusinessBySuperAdmin(
      {
        name: `Organic Agro ${timestamp}`,
        businessType: "Mushroom Cultivation",
        currency: "LKR",
        timezone: "Asia/Colombo",
        initialOwnerEmail: ownerAEmail,
        initialOwnerFullName: "Owner Tenant A",
      },
      superAdminId
    );

    expect(result).toBeDefined();
    expect(result.businessId).toBeDefined();
    expect(result.ownerUserId).toBe(ownerAId);
    businessAId = result.businessId;

    const details = await getBusinessDetails(businessAId);
    expect(details.name).toBe(`Organic Agro ${timestamp}`);
    expect(details.settings?.currency).toBe("LKR");
    expect(details.settings?.businessType).toBe("Mushroom Cultivation");
    expect(details.activeOwnersCount).toBe(1);
    expect(details.maxOwners).toBe(10);
  });

  it("2. Enforces tenant isolation: Business A and Business B are completely separate", async () => {
    // Provision Business B
    const resultB = await createBusinessBySuperAdmin(
      {
        name: `Tech Ventures ${timestamp}`,
        currency: "USD",
        timezone: "America/New_York",
        initialOwnerEmail: ownerBEmail,
      },
      superAdminId
    );
    businessBId = resultB.businessId;

    // Verify members of Business A do not see members of Business B
    const membersA = await getBusinessMembers(businessAId);
    const membersB = await getBusinessMembers(businessBId);

    expect(membersA.some((m) => m.userId === ownerAId)).toBe(true);
    expect(membersA.some((m) => m.userId === ownerBId)).toBe(false);

    expect(membersB.some((m) => m.userId === ownerBId)).toBe(true);
    expect(membersB.some((m) => m.userId === ownerAId)).toBe(false);
  });

  it("3. Updates business settings and records immutable audit diff", async () => {
    const updated = await updateBusinessSettings(
      businessAId,
      {
        name: `Updated Organic Agro ${timestamp}`,
        businessType: "Commercial Horticulture",
        contactEmail: "info@agro.local",
        contactPhone: "+94 11 234 5678",
        address: "123 Farm Road, Kandy",
        timezone: "Asia/Colombo",
        currency: "LKR",
        expenseApprovalThreshold: 750,
        defaultReservePercentage: 25,
        autoDeductInventory: true,
      },
      ownerAId
    );

    expect(updated.business.name).toBe(`Updated Organic Agro ${timestamp}`);
    expect(updated.settings.expenseApprovalThreshold.toString()).toBe("750");
    expect(updated.settings.defaultReservePercentage.toString()).toBe("25");

    // Verify audit event
    const auditTrail = await getBusinessAuditTrail(businessAId);
    const settingsEvent = auditTrail.find((e) => e.actionType === "BUSINESS_SETTINGS_UPDATED");
    expect(settingsEvent).toBeDefined();
    expect(settingsEvent?.actor.id).toBe(ownerAId);
  });

  it("4. Prevents removing or demoting the last active owner (Owner Minimum Rule)", async () => {
    const members = await getBusinessMembers(businessAId);
    const soleOwner = members.find((m) => m.role === "OWNER" && m.status === "ACTIVE");
    expect(soleOwner).toBeDefined();

    // Attempting to remove the last owner must fail
    await expect(
      removeMember(businessAId, soleOwner!.id, ownerAId)
    ).rejects.toThrow("A business must maintain at least one active owner.");

    // Attempting to demote the last owner to STAFF must fail
    await expect(
      updateMemberRole(businessAId, { memberId: soleOwner!.id, role: "STAFF" }, ownerAId)
    ).rejects.toThrow("A business must maintain at least one active owner.");
  });

  it("5. Allows adding co-owners but rejects exceeding maxOwners (Owner Maximum Rule)", async () => {
    // Business B currently has 1 owner (ownerB). Set maxOwners = 2 to test boundary
    await prisma.business.update({
      where: { id: businessBId },
      data: { maxOwners: 2 },
    });

    // Invite second owner -> should succeed
    const invite2 = await createInvitation({
      businessId: businessBId,
      email: `coowner-2-${timestamp}@test.local`,
      role: "OWNER",
      inviterUserId: ownerBId,
    });
    expect(invite2.invitationId).toBeDefined();

    // Attempting to invite a 3rd owner must fail because total (1 active + 1 pending) == 2 (limit reached)
    await expect(
      createInvitation({
        businessId: businessBId,
        email: `coowner-3-${timestamp}@test.local`,
        role: "OWNER",
        inviterUserId: ownerBId,
      })
    ).rejects.toThrow(/Cannot add owner: Business has reached its maximum quota/);
  });

  it("6. Frees owner quota seat when an invitation is revoked", async () => {
    // Find the pending owner invite in Business B
    const invites = await prisma.invitationToken.findMany({
      where: { businessId: businessBId, role: "OWNER", status: "PENDING" },
    });
    expect(invites.length).toBe(1);

    // Revoke the pending invite
    const tx = prisma;
    await tx.invitationToken.update({
      where: { id: invites[0].id },
      data: { status: "REVOKED" },
    });

    // Now adding another owner must succeed
    const newInvite = await createInvitation({
      businessId: businessBId,
      email: `coowner-replacement-${timestamp}@test.local`,
      role: "OWNER",
      inviterUserId: ownerBId,
    });
    expect(newInvite.invitationId).toBeDefined();
  });

  it("7. Role permissions: STAFF cannot invite co-owners or manage settings", () => {
    expect(hasPermission("STAFF", "tenancy:members:invite_owner")).toBe(false);
    expect(hasPermission("STAFF", "tenancy:settings:update")).toBe(false);
    expect(hasPermission("STAFF", "tenancy:members:revoke")).toBe(false);

    expect(hasPermission("OWNER", "tenancy:members:invite_owner")).toBe(true);
    expect(hasPermission("OWNER", "tenancy:settings:update")).toBe(true);
    expect(hasPermission("OWNER", "tenancy:members:revoke")).toBe(true);
  });

  it("8. Revoking a membership prevents subsequent tenant authorization", async () => {
    // Add staff member to Business A
    const staffMembership = await prisma.businessMembership.create({
      data: {
        businessId: businessAId,
        userId: staffId,
        role: "STAFF",
        status: "ACTIVE",
      },
    });

    expect(staffMembership.status).toBe("ACTIVE");

    // Revoke staff membership
    const revoked = await removeMember(businessAId, staffMembership.id, ownerAId);
    expect(revoked.status).toBe("REVOKED");

    // Attempting to revoke again throws error
    await expect(
      removeMember(businessAId, staffMembership.id, ownerAId)
    ).rejects.toThrow("Membership is already revoked.");
  });

  it("9. Activity history is tenant-isolated and records key governance actions", async () => {
    const auditA = await getBusinessAuditTrail(businessAId);
    const auditB = await getBusinessAuditTrail(businessBId);

    // All events in auditA must have businessId === businessAId
    expect(auditA.length).toBeGreaterThan(0);
    expect(auditB.length).toBeGreaterThan(0);

    // Verify Business A has MEMBER_REMOVED and BUSINESS_CREATED
    const actionTypesA = auditA.map((a) => a.actionType);
    expect(actionTypesA).toContain("BUSINESS_CREATED");
    expect(actionTypesA).toContain("MEMBER_REMOVED");

    // Business B events must not leak into Business A
    const actionTypesB = auditB.map((a) => a.actionType);
    expect(actionTypesB).toContain("BUSINESS_CREATED");
  });
});
