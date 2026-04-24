"use server";

import { signIn } from "@/lib/auth";

export async function loginAction(_prev: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Uporabniško ime in geslo sta obvezna" };
  }

  const result = await signIn(username, password);
  if (!result) {
    return { error: "Napačno uporabniško ime ali geslo" };
  }

  return { success: true };
}
