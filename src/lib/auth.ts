import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";

const COOKIE = "pos_session";

function secret() {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

export function hashPassword(password: string, salt?: string) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 32).toString("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function makeToken(userId: number) {
  const payload = `${userId}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  if (sign(payload) !== parts[2]) return null;
  const age = Date.now() - Number(parts[1]);
  if (!Number.isFinite(age) || age > 1000 * 60 * 60 * 24 * 7) return null;
  const id = Number(parts[0]);
  return Number.isInteger(id) ? id : null;
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const id = readToken(token);
  if (!id) return null;
  return prisma.user.findUnique({
    select: { id: true, username: true, displayName: true },
    where: { id },
  });
}

export const SESSION_COOKIE = COOKIE;
