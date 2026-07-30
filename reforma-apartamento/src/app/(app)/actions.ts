"use server";

import { redirect } from "next/navigation";
import { destruirSessao } from "@/lib/auth";

export async function logout() {
  await destruirSessao();
  redirect("/login");
}
