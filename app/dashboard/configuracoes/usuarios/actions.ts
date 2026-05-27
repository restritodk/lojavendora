"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserPrimaryStore } from "@/lib/onboarding";
import { canActivateStaffUser } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import {
  normalizePermissions,
  requireStorePermission,
} from "@/lib/store-permissions";

export type StaffUserActionResult = {
  type: "success" | "error";
  message: string;
};

export async function saveStaffUserAction(formData: FormData): Promise<StaffUserActionResult> {
  const context = await getStaffManagementContext();

  if ("type" in context) {
    return context;
  }

  const name = getValue(formData, "name");
  const email = getValue(formData, "email").toLowerCase();
  const password = getValue(formData, "password");
  const level = getValue(formData, "level") || "OPERADOR";
  const staffUserId = getValue(formData, "staffUserId");
  const permissions = normalizePermissions(formData.getAll("permissions"));

  if (!name || !email || !email.includes("@")) {
    return result("error", "Informe nome e e-mail válido.");
  }

  if (permissions.length === 0) {
    return result("error", "Selecione pelo menos uma permissão.");
  }

  const currentStaffUser = staffUserId
    ? await prisma.storeStaffUser.findFirst({
        where: {
          id: staffUserId,
          storeId: context.store.id,
        },
        select: {
          userId: true,
          active: true,
        },
      })
    : null;

  if (staffUserId && !currentStaffUser) {
    return result("error", "Usuário não encontrado nesta loja.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser && currentStaffUser && existingUser.id !== currentStaffUser.userId) {
    return result("error", "Este e-mail já pertence a outro usuário.");
  }

  if (!existingUser && password.length < 8) {
    return result("error", "A senha precisa ter pelo menos 8 caracteres.");
  }

  if (existingUser?.id === context.user.id) {
    return result("error", "Você já é o proprietário da loja e não precisa ser cadastrado como usuário da equipe.");
  }

  const isCreatingOrReactivatingStaff = !staffUserId || currentStaffUser?.active === false;
  if (isCreatingOrReactivatingStaff) {
    const userLimit = await canActivateStaffUser(context.store.id, staffUserId || undefined);
    if (!userLimit.allowed) {
      return result("error", userLimit.reason ?? "Limite de usuários do plano atingido.");
    }
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : null;

  await prisma.$transaction(async (tx) => {
    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            ...(passwordHash ? { password: passwordHash } : {}),
          },
          select: { id: true },
        })
      : await tx.user.create({
          data: {
            name,
            email,
            password: passwordHash ?? await bcrypt.hash(crypto.randomUUID(), 12),
          },
          select: { id: true },
        });

    await tx.storeStaffUser.upsert({
      where: {
        storeId_userId: {
          storeId: context.store.id,
          userId: user.id,
        },
      },
      create: {
        storeId: context.store.id,
        userId: user.id,
        level,
        permissions,
        active: true,
      },
      update: {
        level,
        permissions,
        active: true,
      },
    });
  });

  revalidatePath("/dashboard/configuracoes/usuarios");
  return result("success", "Usuário salvo com sucesso.");
}

export async function toggleStaffUserAction(staffUserId: string): Promise<StaffUserActionResult> {
  const context = await getStaffManagementContext();

  if ("type" in context) {
    return context;
  }

  const staffUser = await prisma.storeStaffUser.findFirst({
    where: {
      id: staffUserId,
      storeId: context.store.id,
    },
    select: {
      id: true,
      active: true,
    },
  });

  if (!staffUser) {
    return result("error", "Usuário não encontrado nesta loja.");
  }

  if (!staffUser.active) {
    const userLimit = await canActivateStaffUser(context.store.id, staffUser.id);
    if (!userLimit.allowed) {
      return result("error", userLimit.reason ?? "Limite de usuários do plano atingido.");
    }
  }

  await prisma.storeStaffUser.update({
    where: { id: staffUser.id },
    data: { active: !staffUser.active },
  });

  revalidatePath("/dashboard/configuracoes/usuarios");
  return result("success", staffUser.active ? "Usuário desativado." : "Usuário ativado.");
}

export async function deleteStaffUserAction(staffUserId: string): Promise<StaffUserActionResult> {
  const context = await getStaffManagementContext();

  if ("type" in context) {
    return context;
  }

  const deleted = await prisma.storeStaffUser.deleteMany({
    where: {
      id: staffUserId,
      storeId: context.store.id,
    },
  });

  if (deleted.count === 0) {
    return result("error", "Usuário não encontrado nesta loja.");
  }

  revalidatePath("/dashboard/configuracoes/usuarios");
  return result("success", "Usuário removido desta loja.");
}

async function getStaffManagementContext() {
  const user = await requireUser();
  const store = await getUserPrimaryStore(user.id);

  if (!store) {
    return result("error", "Loja não encontrada.");
  }

  await requireStorePermission(user.id, store.id, "usuarios");

  return { user, store };
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function result(type: StaffUserActionResult["type"], message: string): StaffUserActionResult {
  return { type, message };
}

