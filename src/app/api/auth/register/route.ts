import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, hashPassword, makeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json();
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!username || !password || !confirmPassword) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: "duplicate_username" }, { status: 409 });

  const user = await prisma.user.create({
    data: { username, displayName: username, passwordHash: hashPassword(password) },
  });

  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, makeToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
