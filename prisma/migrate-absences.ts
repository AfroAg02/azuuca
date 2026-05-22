import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TYPE_MAP: Record<string, string> = {
  ILLNESS: "MEDICAL",
  EVENT: "PAID_LEAVE",
  PLANNED: "PAID_LEAVE",
  OTHER: "UNJUSTIFIED",
};

async function main() {
  const absences = await prisma.absence.findMany();
  console.log(`Found ${absences.length} absences to migrate...`);

  let migrated = 0;
  let skipped = 0;

  for (const a of absences) {
    // Check if a LeaveRequest already exists for this user+date
    const existing = await prisma.leaveRequest.findFirst({
      where: {
        userId: a.userId,
        startDate: { lte: a.date },
        endDate: { gte: a.date },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.leaveRequest.create({
      data: {
        userId: a.userId,
        createdBy: a.userId,
        startDate: a.date,
        endDate: a.date,
        type: TYPE_MAP[a.type] || "UNJUSTIFIED",
        reason: a.reason || "",
      },
    });
    migrated++;
  }

  console.log(`Migrated: ${migrated}, Skipped (already exists): ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
