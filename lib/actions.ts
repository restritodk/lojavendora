"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, deleteSession, requireUser } from "@/lib/auth";
import { applyTemplateToStore, getUserPrimaryStore } from "@/lib/onboarding";
import { vendoraPlans } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function registerAction(formData: FormData) {
  const name = getString(formData, "name");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const storeName = getString(formData, "storeName");
  const subdomain = normalizeSlug(getString(formData, "subdomain"));

  if (!name || !email || password.length < 8 || !storeName || !subdomain) {
    redirect("/register?error=invalid-fields");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/register?error=email-in-use");
  }

  const existingStore = await prisma.store.findUnique({
    where: { subdomain },
    select: { id: true },
  });

  if (existingStore) {
    redirect("/register?error=subdomain-in-use");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const defaultPlan = await ensureDefaultPlan(tx);
    return tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        stores: {
          create: {
            name: storeName,
            subdomain,
            subscriptions: {
              create: {
                planId: defaultPlan.id,
                status: Number(defaultPlan.price) === 0 ? "ACTIVE" : "TRIALING",
                currentPeriodStart: new Date(),
                currentPeriodEnd: defaultPlan.durationDays
                  ? getPeriodEnd(defaultPlan.durationDays)
                  : null,
                autoRenew: Number(defaultPlan.price) > 0,
              },
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });
  });

  await createSession({ userId: user.id, email: user.email });
  redirect("/onboarding");
}

export async function loginAction(formData: FormData) {
  const login = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const accessMode = getString(formData, "accessMode");
  const storeLogin = getString(formData, "storeEmail").toLowerCase();

  if (!login || !password) {
    redirect("/login?error=invalid-credentials");
  }

  const user = await prisma.user.findUnique({
    where: { email: login.includes("@") ? login : `${login}@vendora.local` },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
    },
  });

  if (!user) {
    redirect("/login?error=invalid-credentials");
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    redirect("/login?error=invalid-credentials");
  }

  if (accessMode === "staff") {
    if (!storeLogin) {
      redirect("/login?error=missing-store");
    }

    const store = await prisma.store.findFirst({
      where: {
        OR: [
          { owner: { email: storeLogin } },
          { subdomain: normalizeSlug(storeLogin) },
        ],
        staffUsers: {
          some: {
            userId: user.id,
            active: true,
          },
        },
      },
      select: {
        id: true,
        active: true,
      },
    });

    if (!store?.active) {
      redirect("/login?error=staff-store-denied");
    }

    await createSession({ userId: user.id, email: user.email, storeId: store.id });
    redirect("/dashboard");
  }

  await createSession({ userId: user.id, email: user.email });

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const store = await getUserPrimaryStore(user.id);
  redirect(store?.onboardingCompleted || store?.ownerId !== user.id ? "/dashboard" : "/onboarding");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function completeOnboardingAction(formData: FormData) {
  const templateId = getString(formData, "templateId");

  if (!templateId) {
    redirect("/onboarding?error=missing-template");
  }

  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    redirect("/register");
  }

  await applyTemplateToStore({ storeId: store.id, templateId });
  redirect("/dashboard");
}

async function ensureDefaultPlan(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const freePlan = vendoraPlans[0];
  const plan = await tx.plan.findFirst({
    where: {
      OR: [
        { slug: freePlan.slug },
        {
          isActive: true,
          price: 0,
        },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, price: true, durationDays: true },
  });

  if (plan) {
    return plan;
  }

  return tx.plan.create({
    data: {
      name: freePlan.name,
      slug: freePlan.slug,
      description: freePlan.description,
      price: freePlan.price,
      maxProducts: freePlan.maxProducts,
      maxMonthlyVisits: freePlan.maxMonthlyVisits,
      maxUsers: freePlan.maxUsers,
      isUnlimited: Boolean(freePlan.isUnlimited),
      durationDays: null,
      isActive: true,
      sortOrder: 0,
    },
    select: { id: true, price: true, durationDays: true },
  });
}

function getPeriodEnd(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
