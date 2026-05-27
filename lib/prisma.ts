import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const cachedPrisma = globalForPrisma.prisma as (PrismaClient & {
  storeStaffUser?: unknown;
  promotionCampaign?: unknown;
  promotionCoupon?: unknown;
  platformInvoice?: unknown;
  platformPaymentSetting?: unknown;
  storePageView?: unknown;
}) | undefined;

export const prisma = cachedPrisma?.storeStaffUser &&
  cachedPrisma.promotionCampaign &&
  cachedPrisma.promotionCoupon &&
  cachedPrisma.platformInvoice &&
  cachedPrisma.platformPaymentSetting &&
  cachedPrisma.storePageView
  ? cachedPrisma
  : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
