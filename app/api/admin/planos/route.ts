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

export async function POST(request: Request) {
  await requireAdmin();

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

  if (existingPlan) {
    return NextResponse.json(
      { error: "Já existe um plano com este nome." },
      { status: 409 },
    );
  }

  const plan = await prisma.plan.create({
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
    select: { id: true },
  });

  return NextResponse.json({ id: plan.id }, { status: 201 });
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
