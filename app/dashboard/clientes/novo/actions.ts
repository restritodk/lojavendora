"use server";

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { prisma } from "@/lib/prisma";
import { createStoreNotification } from "@/lib/store-notifications";

export type CreateCustomerResult = {
  type: "success" | "error";
  message: string;
};

export async function createCustomerAction(formData: FormData) {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return errorResult("Loja não encontrada.");
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

  if (password) {
    if (password.length < 6) {
      return errorResult("A senha deve ter pelo menos 6 caracteres.");
    }
  } else {
    return errorResult("Informe a senha de acesso do cliente.");
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      storeId: store.id,
      accessEmail,
    },
    select: { id: true },
  });

  if (existingCustomer) {
    return errorResult("Já existe um cliente com este e-mail de acesso.");
  }

  try {
    await prisma.customer.create({
      data: {
        storeId: store.id,
        name,
        email: email || null,
        phone: getValue(formData, "phone") || null,
        personType: getValue(formData, "personType") || "FISICA",
        document: getValue(formData, "document") || null,
        stateRegistration: getValue(formData, "stateRegistration") || null,
        birthDate: parseDate(getValue(formData, "birthDate")),
        gender: getValue(formData, "gender") || null,
        secondaryPhone: getValue(formData, "secondaryPhone") || null,
        secondaryEmail: getValue(formData, "secondaryEmail").toLowerCase() || null,
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
        password: password ? await bcrypt.hash(password, 10) : null,
        notes: getValue(formData, "notes") || null,
        allowPromotions: formData.get("allowPromotions") === "on",
      },
    });
  } catch {
    return errorResult("Não foi possível cadastrar. Verifique se o e-mail já existe.");
  }

  await createStoreNotification({
    storeId: store.id,
    type: "new-customer",
    title: "Novo cadastro na loja",
    message: `${name} foi cadastrado como comprador.`,
    icon: "✉️",
    href: "/dashboard/clientes",
    eventKey: `customer:${accessEmail}`,
  });

  return {
    type: "success",
    message: "Cliente comprador cadastrado com sucesso.",
  } satisfies CreateCustomerResult;
}

function errorResult(message: string) {
  return {
    type: "error",
    message,
  } satisfies CreateCustomerResult;
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
