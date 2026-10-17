import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createInvitation, acceptInvitation, revokeInvitation } from "@/modules/core-tenancy/services/invitation.service";

describe("Database Auth & Multi-Tenant Integration Tests", () => {
  const testSlug = `test-biz-${Date.now()}`;
  let testBusinessId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    // Setup isolated test business with maxOwners = 2
    const biz = await prisma.business.create({
      data: {
        name: "Test Integration Farm",
        slug: testSlug,
        maxOwners: 2,
        status: "ACTIVE",
      },
    });
    testBusinessId = biz.id;

    // Create primary owner
    const pwdHash = await hashPassword("OwnerPassword123!");
    const owner = await prisma.user.create({
      data: {
        email: `owner-${Date.now()}@test.local`,
        fullName: "Primary Owner",
        passwordHash: pwdHash,
        isActive: true,
      },
    });
    ownerUserId = owner.id;

    // Attach owner membership
    await prisma.businessMembership.create({
      data: {
        businessId: testBusinessId,
        userId: ownerUserId,
        role: "OWNER",
        status: "ACTIVE",
      },
    });
  }, 15000);

  afterAll(async () => {
    // Teardown test business and related records
    await prisma.invitationToken.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.businessMembership.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.auditEvent.deleteMany({ where: { businessId: testBusinessId } });
    await prisma.business.delete({ where: { id: testBusinessId } });
    await prisma.user.delete({ where: { id: ownerUserId } });
    await prisma.$disconnect();
  }, 15000);

  it("successfully creates a co-owner invitation when under maxOwners limit", async () => {
    const invite = await createInvitation({
      businessId: testBusinessId,
      email: "partner@test.local",
      role: "OWNER",
      inviterUserId: ownerUserId,
    });

    expect(invite).toBeDefined();
    expect(invite.email).toBe("partner@test.local");
    expect(invite.role).toBe("OWNER");
  }, 10000);

  it("strictly rejects creating a 2nd co-owner invitation when active + pending equals maxOwners (2)", async () => {
    // Active owners = 1, pending owner invites = 1, total = 2 == maxOwners (2)
    await expect(
      createInvitation({
        businessId: testBusinessId,
        email: "excess-owner@test.local",
        role: "OWNER",
        inviterUserId: ownerUserId,
      })
    ).rejects.toThrow(/maximum quota of 2 owners/);
  }, 10000);

  it("frees an owner seat when an invitation is revoked", async () => {
    // Find the pending invite created in test 1
    const pending = await prisma.invitationToken.findFirst({
      where: { businessId: testBusinessId, email: "partner@test.local", status: "PENDING" },
    });
    expect(pending).not.toBeNull();

    // Revoke the invite
    await revokeInvitation(pending!.id, ownerUserId);

    // Verify status is REVOKED
    const revoked = await prisma.invitationToken.findUnique({ where: { id: pending!.id } });
    expect(revoked?.status).toBe("REVOKED");

    // Now adding another co-owner is permitted again because a seat was freed
    const newInvite = await createInvitation({
      businessId: testBusinessId,
      email: "new-partner@test.local",
      role: "OWNER",
      inviterUserId: ownerUserId,
    });
    expect(newInvite.email).toBe("new-partner@test.local");
  }, 10000);

  it("consumes an invitation token atomically upon acceptance and prevents reuse", async () => {
    // Create an invite for staff
    const invite = await createInvitation({
      businessId: testBusinessId,
      email: "staff@test.local",
      role: "STAFF",
      inviterUserId: ownerUserId,
    });

    const rawToken = invite.devTokenPreview!;
    expect(rawToken).toBeDefined();

    // Accept invitation
    const accepted = await acceptInvitation({
      rawToken,
      fullName: "Staff Member",
      password: "StaffPassword123!",
    });

    expect(accepted.success).toBe(true);
    expect(accepted.role).toBe("STAFF");

    // Verify token is now CONSUMED in DB
    const consumedToken = await prisma.invitationToken.findUnique({ where: { id: invite.invitationId } });
    expect(consumedToken?.status).toBe("CONSUMED");

    // Attempt to accept the same token a second time -> MUST REJECT
    await expect(
      acceptInvitation({
        rawToken,
        fullName: "Imposter Staff",
        password: "StaffPassword123!",
      })
    ).rejects.toThrow(/no longer active/);

    // Clean up created staff user
    await prisma.businessMembership.deleteMany({ where: { businessId: testBusinessId, userId: accepted.userId } });
    await prisma.user.delete({ where: { id: accepted.userId } });
  }, 10000);
});
