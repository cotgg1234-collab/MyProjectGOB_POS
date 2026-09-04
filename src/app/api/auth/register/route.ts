import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateShopCode, hashPassword } from "@/lib/auth";

async function uniqueShopCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateShopCode();
    const clash = await prisma.user.findUnique({ where: { shopCode: code } });
    if (!clash) return code;
  }
  throw new Error("could not allocate a unique shop code");
}

export async function POST(req: Request) {
  const body = await req.json();
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const role = body.role === "owner" ? "owner" : "user";
  const shopName = typeof body.shopName === "string" ? body.shopName.trim() : "";
  const shopCodeInput = typeof body.shopCode === "string" ? body.shopCode.trim().toUpperCase() : "";

  if (!username || !password || !confirmPassword) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }
  if (role === "owner" && !shopName) {
    return NextResponse.json({ error: "shop_name_required" }, { status: 400 });
  }
  if (role === "user" && !shopCodeInput) {
    return NextResponse.json({ error: "shop_code_required" }, { status: 400 });
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "password_mismatch" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: "duplicate_username" }, { status: 409 });

  let shopOwner: { id: number } | null = null;

  if (role === "owner") {
    const shopExists = await prisma.user.findFirst({
      where: { shopName: { equals: shopName, mode: "insensitive" } },
    });
    if (shopExists) return NextResponse.json({ error: "duplicate_shop_name" }, { status: 409 });
  } else {
    shopOwner = await prisma.user.findFirst({ where: { role: "owner", shopCode: shopCodeInput } });
    if (!shopOwner) return NextResponse.json({ error: "invalid_shop_code" }, { status: 404 });
  }

  try {
    await prisma.user.create({
      data: {
        username,
        displayName: username,
        passwordHash: hashPassword(password),
        role,
        shopName: role === "owner" ? shopName : null,
        shopCode: role === "owner" ? await uniqueShopCode() : null,
        ownerId: role === "user" ? shopOwner!.id : null,
      },
    });
  } catch (e: unknown) {
    const target = (e as { code?: string; meta?: { target?: string[] } })?.meta?.target ?? [];
    if ((e as { code?: string })?.code === "P2002" && target.includes("shopName")) {
      return NextResponse.json({ error: "duplicate_shop_name" }, { status: 409 });
    }
    if ((e as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "duplicate_username" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
