"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  createCustomerSession,
  deleteCustomerSession,
} from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export async function customerLoginAction(slug: string, formData: FormData) {
  const accessEmail = normalizeEmail(getValue(formData, "accessEmail"));
  const password = getValue(formData, "password");
  const returnTo = sanitizeReturnTo(slug, getValue(formData, "returnTo"));
  const loginPath = buildLoginPath(slug, returnTo);

  if (!accessEmail || !password) {
    redirectWithError(loginPath, "Informe e-mail de acesso e senha.");
  }

  const store = await prisma.store.findUnique({
    where: { subdomain: slug },
    select: { id: true },
  });

  if (!store) {
    redirectWithError(loginPath, "Loja não encontrada.");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      storeId: store.id,
      accessEmail,
    },
    select: {
      id: true,
      storeId: true,
      accessEmail: true,
      password: true,
    },
  });

  if (!customer?.password || !customer.accessEmail) {
    redirectWithError(loginPath, "Conta de comprador não encontrada.");
  }

  const isPasswordValid = await bcrypt.compare(password, customer.password);

  if (!isPasswordValid) {
    redirectWithError(loginPath, "E-mail ou senha inválidos.");
  }

  await createCustomerSession({
    customerId: customer.id,
    storeId: customer.storeId,
    accessEmail,
  });

  redirect(returnTo);
}

export async function customerRegisterAction(slug: string, formData: FormData) {
  const returnTo = sanitizeReturnTo(slug, getValue(formData, "returnTo"));
  const loginPath = buildLoginPath(slug, returnTo);
  const name = getValue(formData, "name");
  const accessEmail = normalizeEmail(getValue(formData, "accessEmail"));
  const phone = getValue(formData, "phone");
  const document = onlyDigits(getValue(formData, "document"));
  const zipCode = getValue(formData, "zipCode");
  const street = getValue(formData, "street");
  const number = getValue(formData, "number");
  const complement = getValue(formData, "complement");
  const neighborhood = getValue(formData, "neighborhood");
  const city = getValue(formData, "city");
  const state = getValue(formData, "state");
  const password = getValue(formData, "password");
  const confirmPassword = getValue(formData, "confirmPassword");

  if (!name || !accessEmail || !phone || !document || !password) {
    redirectWithError(loginPath, "Preencha nome, CPF/CNPJ, telefone, e-mail e senha.");
  }

  if (![11, 14].includes(document.length)) {
    redirectWithError(loginPath, "Informe um CPF ou CNPJ válido.");
  }

  if (!zipCode || !street || !number || !neighborhood || !city || !state) {
    redirectWithError(loginPath, "Preencha o endereço completo para entrega.");
  }

  if (password.length < 6) {
    redirectWithError(loginPath, "A senha precisa ter pelo menos 6 caracteres.");
  }

  if (password !== confirmPassword) {
    redirectWithError(loginPath, "As senhas não conferem.");
  }

  const store = await prisma.store.findUnique({
    where: { subdomain: slug },
    select: { id: true },
  });

  if (!store) {
    redirectWithError(loginPath, "Loja não encontrada.");
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      storeId: store.id,
      OR: [{ accessEmail }, { email: accessEmail }],
    },
    select: { id: true },
  });

  if (existingCustomer) {
    redirectWithError(loginPath, "Já existe uma conta com este e-mail nesta loja.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const customer = await prisma.customer.create({
    data: {
      storeId: store.id,
      name,
      email: accessEmail,
      accessEmail,
      phone,
      document,
      personType: document.length === 14 ? "JURIDICA" : "FISICA",
      zipCode,
      street,
      number,
      complement: complement || null,
      neighborhood,
      city,
      state,
      password: passwordHash,
    },
    select: {
      id: true,
      storeId: true,
      accessEmail: true,
    },
  });

  await createCustomerSession({
    customerId: customer.id,
    storeId: customer.storeId,
    accessEmail,
  });

  redirect(returnTo);
}

export async function customerLogoutAction(slug: string) {
  await deleteCustomerSession();
  redirect(`/store/${slug}/login`);
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildLoginPath(slug: string, returnTo: string) {
  const params = new URLSearchParams({ returnTo });
  return `/store/${slug}/login?${params.toString()}`;
}

function sanitizeReturnTo(slug: string, value: string) {
  const fallback = `/store/${slug}/pedidos`;

  if (!value) {
    return fallback;
  }

  if (!value.startsWith(`/store/${slug}/`)) {
    return fallback;
  }

  return value;
}

function redirectWithError(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  const params = new URLSearchParams({ error: message });
  redirect(`${path}${separator}${params.toString()}`);
}
