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

export function generateShopCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
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
  const user = await prisma.user.findUnique({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      shopName: true,
      shopCode: true,
      ownerId: true,
      owner: { select: { shopName: true } },
    },
    where: { id },
  });
  if (!user) return null;

  const shopOwnerId = user.role === "owner" ? user.id : (user.ownerId ?? null);
  const shopName = user.role === "owner" ? user.shopName : (user.owner?.shopName ?? null);
  // Only the owner sees the shop's join code — staff never need it once they've joined.
  const shopCode = user.role === "owner" ? user.shopCode : null;

  return { ...user, shopOwnerId, shopName, shopCode };
}

export const SESSION_COOKIE = COOKIE;
