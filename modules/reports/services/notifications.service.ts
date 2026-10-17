import "server-only";
import { prisma } from "@/lib/db/prisma";
import { recordAuditEvent } from "@/modules/audit/services/audit.service";
import {
  UpdateNotificationPreferenceInput,
  UpdateNotificationPreferenceSchema,
} from "../schemas/reports.schema";

export async function getNotificationPreferences(businessId: string, userId: string) {
  let pref = await prisma.notificationPreference.findUnique({
    where: {
      businessId_userId: {
        businessId,
        userId,
      },
    },
  });

  if (!pref) {
    // Return sensible defaults
    pref = await prisma.notificationPreference.create({
      data: {
        businessId,
        userId,
        emailNotifications: true,
        lowStockAlerts: true,
        productionPhaseAlerts: true,
        weeklySummary: true,
      },
    });
  }

  return pref;
}

export async function updateNotificationPreferences(
  businessId: string,
  userId: string,
  rawInput: UpdateNotificationPreferenceInput
) {
  const input = UpdateNotificationPreferenceSchema.parse(rawInput);

  const pref = await prisma.notificationPreference.upsert({
    where: {
      businessId_userId: {
        businessId,
        userId,
      },
    },
    update: {
      emailNotifications: input.emailNotifications,
      lowStockAlerts: input.lowStockAlerts,
      productionPhaseAlerts: input.productionPhaseAlerts,
      weeklySummary: input.weeklySummary,
    },
    create: {
      businessId,
      userId,
      emailNotifications: input.emailNotifications,
      lowStockAlerts: input.lowStockAlerts,
      productionPhaseAlerts: input.productionPhaseAlerts,
      weeklySummary: input.weeklySummary,
    },
  });

  await recordAuditEvent({
    businessId,
    userId,
    actionType: "UPDATE",
    targetEntity: "NotificationPreference",
    targetId: pref.id,
    changeDetails: {
      emailNotifications: pref.emailNotifications,
      lowStockAlerts: pref.lowStockAlerts,
      productionPhaseAlerts: pref.productionPhaseAlerts,
      weeklySummary: pref.weeklySummary,
    },
  });

  return pref;
}
