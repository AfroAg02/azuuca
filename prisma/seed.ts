import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@azuuca.com" },
    update: {},
    create: {
      email: "admin@azuuca.com",
      name: "Administrador",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Seed completado: admin@azuuca.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
