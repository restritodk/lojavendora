"use server";

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ChangePasswordResult = {
  type: "success" | "error";
  message: string;
};

export async function changePasswordAction(formData: FormData): Promise<ChangePasswordResult> {
  const user = await requireUser();
  const password = getValue(formData, "password");
  const confirmPassword = getValue(formData, "confirmPassword");

  if (password.length < 6) {
    return result("error", "A nova senha precisa ter pelo menos 6 caracteres.");
  }

  if (password !== confirmPassword) {
    return result("error", "As senhas informadas não são iguais.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 12),
    },
  });

  return result("success", "Senha atualizada com sucesso.");
}

function getValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function result(type: ChangePasswordResult["type"], message: string) {
  return { type, message };
}
