"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { requireStorePermission } from "@/lib/store-permissions";

export type CustomerActionResult = {
  type: "success" | "error";
  message: string;
};

export async function deleteCustomerAction(customerId: string) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    redirect("/dashboard/clientes?error=Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "clientes");

  await prisma.customer.deleteMany({
    where: {
      id: customerId,
      storeId: store.id,
    },
  });

  redirect("/dashboard/clientes?success=Cliente excluído com sucesso.");
}

export async function updateCustomerAction(
  customerId: string,
  formData: FormData,
): Promise<CustomerActionResult> {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return errorResult("Loja não encontrada.");
  }
  await requireStorePermission(user.id, store.id, "clientes");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId: store.id },
    select: { id: true },
  });

  if (!customer) {
    return errorResult("Cliente não encontrado.");
  }

  const name = getValue(formData, "name");
  const email = normalizeEmail(getValue(formData, "email"));
  const accessEmail = normalizeEmail(getValue(formData, "accessEmail"));
  const password = getValue(formData, "password");

  if (!name) {
    return errorResult("Informe o nome do cliente.");
  }

  if (!accessEmail) {
    return errorResult("Informe o e-mail de acesso do cliente.");
  }

  if (password && password.length < 6) {
    return errorResult("A senha deve ter pelo menos 6 caracteres.");
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      storeId: store.id,
      accessEmail,
      NOT: { id: customerId },
    },
    select: { id: true },
  });

  if (existingCustomer) {
    return errorResult("Já existe outro cliente com este e-mail de acesso.");
  }

  try {
    await prisma.customer.updateMany({
      where: {
        id: customer.id,
        storeId: store.id,
      },
      data: {
        name,
        email: email || null,
        phone: getValue(formData, "phone") || null,
        personType: getValue(formData, "personType") || "FISICA",
        document: getValue(formData, "document") || null,
        stateRegistration: getValue(formData, "stateRegistration") || null,
        birthDate: parseDate(getValue(formData, "birthDate")),
        gender: getValue(formData, "gender") || null,
        secondaryPhone: getValue(formData, "secondaryPhone") || null,
        secondaryEmail: normalizeEmail(getValue(formData, "secondaryEmail")) || null,
        source: getValue(formData, "source") || null,
        origin: getValue(formData, "origin") || null,
        zipCode: getValue(formData, "zipCode") || null,
        street: getValue(formData, "street") || null,
        number: getValue(formData, "number") || null,
        complement: getValue(formData, "complement") || null,
        neighborhood: getValue(formData, "neighborhood") || null,
        city: getValue(formData, "city") || null,
        state: getValue(formData, "state") || null,
        accessEmail,
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
        notes: getValue(formData, "notes") || null,
        allowPromotions: formData.get("allowPromotions") === "on",
      },
    });
  } catch {
    return errorResult("Não foi possível atualizar o cliente.");
  }

  return {
    type: "success",
    message: "Cliente atualizado com sucesso.",
  };
}

function errorResult(message: string): CustomerActionResult {
  return {
    type: "error",
    message,
  };
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
