import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getAdminClients } from "@/lib/admin-clients";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaidPeriodEnd } from "@/lib/store-subscription";

function asString(value: unknown) {
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

export async function GET(request: Request) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const clients = await getAdminClients({
    query: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  await requireAdmin();

  const body = (await request.json()) as Record<string, unknown>;
  const name = asString(body.name);
  const email = asString(body.email).toLowerCase();
  const password = asString(body.password);
  const storeName = asString(body.storeName);
  const subdomain = normalizeSlug(asString(body.subdomain));
  const planId = asString(body.planId);
  const currentPeriodEnd = asString(body.currentPeriodEnd);

  if (
    !name ||
    !email ||
    password.length < 8 ||
    !storeName ||
    !subdomain ||
    !planId
  ) {
    return NextResponse.json(
      { error: "Preencha todos os campos obrigatórios." },
      { status: 400 },
    );
  }

  const [existingUser, existingStore, plan] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.store.findUnique({ where: { subdomain }, select: { id: true } }),
    prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true, price: true, durationDays: true },
    }),
  ]);

  if (existingUser) {
    return NextResponse.json(
      { error: "Já existe um cliente com este e-mail." },
      { status: 409 },
    );
  }

  if (existingStore) {
    return NextResponse.json(
      { error: "Este subdomínio já está em uso." },
      { status: 409 },
    );
  }

  if (!plan) {
    return NextResponse.json(
      { error: "Plano selecionado não existe." },
      { status: 400 },
    );
  }
  const isFreePlan = Number(plan.price) === 0;
  const periodEnd = isFreePlan
    ? null
    : currentPeriodEnd
      ? new Date(`${currentPeriodEnd}T23:59:59.000Z`)
      : getPaidPeriodEnd(new Date(), plan.durationDays ?? 30);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "USER",
      stores: {
        create: {
          name: storeName,
          subdomain,
          subscriptions: {
            create: {
              planId,
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: periodEnd,
              autoRenew: !isFreePlan,
            },
          },
        },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}
