import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
}

const CATEGORIES = [
  { name: "เครื่องดื่ม", nameEn: "Drinks" },
  { name: "ขนม", nameEn: "Snacks" },
  { name: "ของใช้", nameEn: "Household" },
  { name: "อาหารสำเร็จรูป", nameEn: "Ready meals" },
];

const PRODUCTS: [string, string, string, number, number, number][] = [
  ["D001", "น้ำเปล่า 600ml", "Water 600ml", 7, 5, 0],
  ["D002", "โค้ก 325ml", "Coke 325ml", 15, 11, 0],
  ["D003", "กาแฟกระป๋อง", "Canned coffee", 20, 14, 0],
  ["D004", "นมจืด 200ml", "Plain milk 200ml", 13, 9, 0],
  ["S001", "มันฝรั่งทอด", "Potato chips", 25, 18, 1],
  ["S002", "ช็อกโกแลตแท่ง", "Chocolate bar", 22, 15, 1],
  ["S003", "คุกกี้เนย", "Butter cookies", 35, 24, 1],
  ["H001", "กระดาษทิชชู่", "Tissue paper", 30, 21, 2],
  ["H002", "สบู่ก้อน", "Bar soap", 18, 12, 2],
  ["H003", "ยาสีฟัน", "Toothpaste", 45, 32, 2],
  ["F001", "บะหมี่กึ่งสำเร็จรูป", "Instant noodles", 8, 6, 3],
  ["F002", "ข้าวกล่องอุ่นร้อน", "Microwave rice box", 55, 40, 3],
];

async function main() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: { username: "admin", passwordHash: hashPassword("admin123"), displayName: "ผู้ดูแลระบบ" },
  });
  const user = await prisma.user.findUnique({ where: { username: "admin" } });

  const cats: Awaited<ReturnType<typeof prisma.category.create>>[] = [];
  for (const c of CATEGORIES) cats.push(await prisma.category.create({ data: c }));

  const products: Awaited<ReturnType<typeof prisma.product.create>>[] = [];
  for (const [sku, name, nameEn, price, cost, cat] of PRODUCTS) {
    products.push(
      await prisma.product.create({
        data: {
          sku,
          name,
          nameEn,
          price,
          cost,
          stock: 40 + Math.floor(Math.random() * 80),
          categoryId: cats[cat].id,
        },
      }),
    );
  }

  // 180 days of demo sales so the dashboard and yearly report have something to show.
  const today = new Date();
  let seq = 1;
  for (let back = 179; back >= 0; back--) {
    const day = new Date(today);
    day.setDate(day.getDate() - back);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const billCount = Math.floor((weekend ? 14 : 9) + Math.random() * 8);

    for (let b = 0; b < billCount; b++) {
      const when = new Date(day);
      // Busiest around lunch and after work.
      const hourPool = [8, 9, 11, 12, 12, 13, 17, 18, 18, 19, 20];
      when.setHours(hourPool[Math.floor(Math.random() * hourPool.length)], Math.floor(Math.random() * 60), 0, 0);

      const lineCount = 1 + Math.floor(Math.random() * 4);
      const picked = new Map<number, number>();
      for (let i = 0; i < lineCount; i++) {
        const p = products[Math.floor(Math.random() * products.length)];
        picked.set(p.id, (picked.get(p.id) ?? 0) + 1 + Math.floor(Math.random() * 3));
      }

      const items = [...picked.entries()].map(([id, qty]) => {
        const p = products.find((x) => x.id === id)!;
        return { productId: p.id, name: p.name, qty, unitPrice: p.price, unitCost: p.cost, lineTotal: p.price * qty };
      });

      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      const discount = Math.random() < 0.12 ? Math.round(subtotal * 0.05) : 0;
      const total = subtotal - discount;
      const cost = items.reduce((s, i) => s + i.unitCost * i.qty, 0);
      const payMethod = Math.random() < 0.6 ? "cash" : Math.random() < 0.7 ? "transfer" : "card";
      const received = payMethod === "cash" ? Math.ceil(total / 20) * 20 : total;

      await prisma.sale.create({
        data: {
          code: `S${when.getFullYear()}${String(when.getMonth() + 1).padStart(2, "0")}${String(when.getDate()).padStart(2, "0")}-${String(seq++).padStart(5, "0")}`,
          saleDate: when,
          subtotal,
          discount,
          tax: 0,
          total,
          cost,
          received,
          change: received - total,
          payMethod,
          userId: user!.id,
          items: { create: items },
        },
      });
    }
  }

  console.log(`Seeded ${products.length} products and ${seq - 1} sales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
