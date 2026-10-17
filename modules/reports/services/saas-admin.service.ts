import "server-only";
import { prisma } from "@/lib/db/prisma";
import { BusinessStatus } from "@prisma/client";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import {
  UpdatePlatformSettingsInput,
  UpdatePlatformSettingsSchema,
} from "../schemas/reports.schema";

export async function getPlatformMetrics() {
  const [totalBusinesses, businessesByStatus, totalUsers, superAdminsCount, totalAuditLogs, platformSettings] = await Promise.all([
    prisma.business.count(),
    prisma.business.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { isSuperAdmin: true } }),
    prisma.auditEvent.count(),
    getOrCreatePlatformSettings(),
  ]);

  const statusMap: Record<string, number> = {
    ACTIVE: 0,
    SUSPENDED: 0,
    PENDING_SETUP: 0,
    ARCHIVED: 0,
  };

  for (const s of businessesByStatus) {
    statusMap[s.status] = s._count.id;
  }

  return {
    businesses: {
      total: totalBusinesses,
      active: statusMap["ACTIVE"] || 0,
      suspended: statusMap["SUSPENDED"] || 0,
      archived: statusMap["ARCHIVED"] || 0,
    },
    users: {
      total: totalUsers,
      superAdmins: superAdminsCount,
    },
    auditEventsCount: totalAuditLogs,
    settings: platformSettings,
    emailConfig: {
      isConfigured: Boolean(process.env.EMAIL_SERVER_HOST),
      host: process.env.EMAIL_SERVER_HOST ? "Configured (SMTP)" : "Development Logger Mode",
      from: process.env.EMAIL_FROM || "notifications@businesshub.local",
    },
  };
}

export const getPlatformOverviewMetrics = getPlatformMetrics;

export async function getAllBusinessesForAdmin(filters?: { search?: string; status?: BusinessStatus }) {
  const businesses = await prisma.business.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search } },
              { slug: { contains: filters.search } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          memberships: true,
          products: true,
          orders: true,
          productionBatches: true,
        },
      },
      settings: true,
      memberships: {
        where: { role: "OWNER", status: "ACTIVE" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return businesses.map((b) => ({
    ...b,
    activeOwnersCount: b.memberships.length,
  }));
}

export async function getPlatformBusinesses(filters?: { search?: string; status?: BusinessStatus }) {
  const businesses = await getAllBusinessesForAdmin(filters);
  return { businesses };
}

export async function getAllUsersForAdmin(filters?: { search?: string }) {
  return await prisma.user.findMany({
    where: {
      ...(filters?.search
        ? {
            OR: [
              { fullName: { contains: filters.search } },
              { email: { contains: filters.search } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isSuperAdmin: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlatformUsers(filters?: { search?: string }) {
  const users = await getAllUsersForAdmin(filters);
  return { users };
}

export async function updateBusinessStatusByAdmin(
  businessId: string,
  newStatus: BusinessStatus,
  adminUserId: string,
  reason?: string
) {
  const existing = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!existing) {
    throw new Error("Business not found.");
  }

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { status: newStatus },
  });

  await recordAuditEvent({
    businessId,
    userId: adminUserId,
    actionType: "SUPERADMIN_STATUS_UPDATE",
    targetEntity: "Business",
    targetId: businessId,
    changeDetails: {
      fromStatus: existing.status,
      toStatus: newStatus,
      reason: reason || "Administrative state change",
    },
  });

  return updated;
}

export async function getOrCreatePlatformSettings() {
  let settings = await prisma.platformSettings.findFirst();

  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: {
        platformName: "BusinessHub SaaS",
        supportEmail: "support@businesshub.local",
        defaultTimezone: "Asia/Colombo",
        defaultCurrency: "LKR",
        enableRegistration: false,
        maintenanceMode: false,
      },
    });
  }

  return settings;
}

export const getPlatformSettings = getOrCreatePlatformSettings;

export async function updatePlatformSettings(
  rawInput: UpdatePlatformSettingsInput,
  adminUserId: string
) {
  const input = UpdatePlatformSettingsSchema.parse(rawInput);
  const current = await getOrCreatePlatformSettings();

  const updated = await prisma.platformSettings.update({
    where: { id: current.id },
    data: {
      platformName: input.platformName.trim(),
      supportEmail: input.supportEmail.trim().toLowerCase(),
      defaultTimezone: input.defaultTimezone,
      defaultCurrency: input.defaultCurrency.toUpperCase(),
      enableRegistration: input.enableRegistration,
      maintenanceMode: input.maintenanceMode,
      updatedById: adminUserId,
    },
  });

  await recordAuditEvent({
    userId: adminUserId,
    actionType: "PLATFORM_SETTINGS_UPDATE",
    targetEntity: "PlatformSettings",
    targetId: updated.id,
    changeDetails: input,
  });

  return updated;
}

export async function getAdminAuditTrail(limit: number = 50) {
  return await prisma.auditEvent.findMany({
    take: limit,
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          isSuperAdmin: true,
        },
      },
      business: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
  });
}

export async function getPlatformAuditLogs(options?: { page?: number; limit?: number }) {
  const limit = options?.limit || 50;
  const logs = await getAdminAuditTrail(limit);
  return { logs };
}
