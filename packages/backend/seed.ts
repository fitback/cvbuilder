import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const phone = process.env.ADMIN_PHONE || "13800000000";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  // Warn if using defaults in production
  if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === "production") {
    console.warn("⚠ ADMIN_PASSWORD not set, using default. Change immediately after first login.");
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log(`Admin user already exists (id: ${existing.id}, role: ${existing.role})`);
    if (existing.role !== "admin") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "admin" } });
      console.log("Updated role to admin");
    }
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = await prisma.user.create({
    data: { phone, passwordHash, role: "admin" },
  });

  console.log(`Admin created:`);
  console.log(`  Phone: ${phone}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role: admin`);
  console.log(`  ID: ${user.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
