import { NextResponse } from "next/server";
import { normalizeSlug } from "@/lib/admin-plans";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalInt(value: unknown) {
  const rawValue = asString(value);

  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown) {
  return value === "on" || value === true;
}

function asMoney(value: unknown) {
  const rawValue = asString(value);
  const normalized = rawValue.includes(",")
    ? rawValue.replace(/\./g, "").replace(",", ".")
    : rawValue;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const name = asString(body.name);
  const description = asString(body.description);
  const price = asMoney(body.price);

  if (!name || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "Nome e preço mensal são obrigatórios." },
      { status: 400 },
    );
  }

  const slug = normalizeSlug(name);
  const existingPlan = await prisma.plan.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingPlan && existingPlan.id !== id) {
    return NextResponse.json(
      { error: "Já existe outro plano com este nome." },
      { status: 409 },
    );
  }

  await prisma.plan.update({
    where: { id },
    data: {
      name,
      slug,
      description,
      price,
      maxProducts: asOptionalInt(body.maxProducts),
      maxMonthlyVisits: asOptionalInt(body.maxMonthlyVisits),
      maxOrders: asOptionalInt(body.maxOrders),
      maxStorageMb: asOptionalInt(body.maxStorageMb),
      maxUsers: asOptionalInt(body.maxUsers),
      isUnlimited: asBoolean(body.isUnlimited),
      durationDays: asOptionalInt(body.durationDays),
      releasedFeatures: asStringList(body.releasedFeatures),
      allowsCustomDomain: asBoolean(body.allowsCustomDomain),
      hasBasicFeatures: asBoolean(body.hasBasicFeatures),
      hasIntermediateFeatures: asBoolean(body.hasIntermediateFeatures),
      hasAdvancedFeatures: asBoolean(body.hasAdvancedFeatures),
      isActive: asBoolean(body.isActive),
    },
  });

  return NextResponse.json({ id });
}

function asStringList(value: unknown) {
  const rawValue = asString(value);

  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await context.params;
  const body = (await request.json()) as { isActive?: boolean };

  await prisma.plan.update({
    where: { id },
    data: {
      isActive: Boolean(body.isActive),
    },
  });

  return NextResponse.json({ id });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const { id } = await context.params;
  const subscriptionsCount = await prisma.subscription.count({
    where: { planId: id },
  });

  if (subscriptionsCount > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir um plano com clientes vinculados." },
      { status: 409 },
    );
  }

  await prisma.plan.delete({ where: { id } });

  return NextResponse.json({ id });
}
