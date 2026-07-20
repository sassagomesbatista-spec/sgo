"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { criarSessao } from "@/lib/auth";

export type LoginState = { erro?: string } | null;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { erro: "E-mail ou senha inválidos." };
  }

  const senhaValida = await bcrypt.compare(senha, user.passwordHash);
  if (!senhaValida) {
    return { erro: "E-mail ou senha inválidos." };
  }

  await criarSessao({ userId: user.id, email: user.email, name: user.name });
  redirect("/");
}
