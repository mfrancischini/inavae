"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { buildSessionToken, validateSessionToken } from "./auth-session";

const sessionCookieName = "inavae_session";
const sessionDuration = 60 * 60 * 24 * 7;

type LoginState = {
  error?: string;
  success?: string;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret === "replace-with-a-local-secret") {
    throw new Error("AUTH_SECRET no está configurado de forma segura.");
  }
  return secret;
}

function signSession(userId: string, expiresAt: number) {
  return buildSessionToken(userId, expiresAt, getSessionSecret());
}

export async function authenticate(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Completá tu correo y contraseña para ingresar." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, status: true },
    });

    const validPassword = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || user.status !== "ACTIVE" || !validPassword) {
      return { error: "El correo o la contraseña no son correctos." };
    }

    const duration = remember ? 60 * 60 * 24 * 30 : sessionDuration;
    const expiresAt = Math.floor(Date.now() / 1000) + duration;
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, signSession(user.id, expiresAt), {
      httpOnly: true,
      maxAge: duration,
      expires: new Date(expiresAt * 1000),
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

  } catch {
    return { error: "No se pudo conectar con la base de datos. Revisá la conexión de Supabase." };
  }

  redirect("/dashboard");
}

export async function hasValidSession() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return false;

  return validateSessionToken(token, getSessionSecret(), Math.floor(Date.now() / 1000));
}

export async function getSessionUserId() {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token || !validateSessionToken(token, getSessionSecret(), Math.floor(Date.now() / 1000))) {
    return null;
  }

  return token.split(".")[0] ?? null;
}
