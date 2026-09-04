import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
}

function genShopCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
}

/** Clears all data and leaves only a default owner account (its own shop) — no demo products or sales. */
async function main() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const shopCode = genShopCode();
  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      displayName: "ผู้ดูแลระบบ",
      role: "owner",
      shopName: "ร้านค้าเริ่มต้น",
      shopCode,
    },
  });

  console.log(`Database reset: empty, only the owner account remains (admin / admin123, shop code ${shopCode}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
