import { NextResponse } from "next/server";
import { getAdminClientById } from "@/lib/admin-clients";
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await context.params;
  const client = await getAdminClientById(id);

  if (!client || client.role !== "USER") {
    return NextResponse.json(
      { error: "Cliente não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json({ client });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const name = asString(body.name);
  const email = asString(body.email).toLowerCase();
  const storeName = asString(body.storeName);
  const subdomain = normalizeSlug(asString(body.subdomain));
  const planId = asString(body.planId);
  const currentPeriodEnd = asString(body.currentPeriodEnd);

  if (!name || !email || !storeName || !subdomain || !planId) {
    return NextResponse.json(
      { error: "Preencha todos os campos obrigatórios." },
      { status: 400 },
    );
  }

  const client = await getAdminClientById(id);

  if (!client || client.role !== "USER") {
    return NextResponse.json(
      { error: "Cliente não encontrado." },
      { status: 404 },
    );
  }

  const store = client.stores[0];
  const subscription = store?.subscriptions[0];

  const emailConflict = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (emailConflict && emailConflict.id !== id) {
    return NextResponse.json(
      { error: "Já existe outro cliente com este e-mail." },
      { status: 409 },
    );
  }

  const subdomainConflict = await prisma.store.findUnique({
    where: { subdomain },
    select: { id: true },
  });

  if (subdomainConflict && subdomainConflict.id !== store?.id) {
    return NextResponse.json(
      { error: "Este subdomínio já está em uso." },
      { status: 409 },
    );
  }
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { id: true, price: true, durationDays: true },
  });

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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { name, email },
    });

    const currentStore = store
      ? await tx.store.update({
          where: { id: store.id },
          data: { name: storeName, subdomain },
          select: { id: true },
        })
      : await tx.store.create({
          data: {
            ownerId: id,
            name: storeName,
            subdomain,
          },
          select: { id: true },
        });

    if (subscription) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          planId,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          autoRenew: !isFreePlan,
        },
      });
      return;
    }

    await tx.subscription.create({
      data: {
        storeId: currentStore.id,
        planId,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        autoRenew: !isFreePlan,
      },
    });
  });

  return NextResponse.json({ id });
}
