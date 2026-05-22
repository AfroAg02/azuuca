import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getTodayInTimezone, getTimezoneFromRequest } from "@/lib/timezone";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const timezone = getTimezoneFromRequest(request);
  const today = searchParams.get("date") || getTodayInTimezone(timezone);

  const [totalUsers, todayRecords, todayAbsences] = await Promise.all([
    prisma.user.count(),
    prisma.attendance.findMany({
      where: { date: today },
      include: { user: { select: { name: true, hourlyRate: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.absence.count({ where: { date: today } }),
  ]);

  const enrichedRecords = todayRecords.map((r) => {
    let hoursWorked: number | null = null;
    let earnings: number | null = null;

    if (r.clockIn && r.clockOut) {
      const [inH, inM, inS] = r.clockIn.split(":").map(Number);
      const [outH, outM, outS] = r.clockOut.split(":").map(Number);
      const inSeconds = inH * 3600 + inM * 60 + (inS || 0);
      const outSeconds = outH * 3600 + outM * 60 + (outS || 0);
      hoursWorked = Math.max(0, (outSeconds - inSeconds) / 3600);
      hoursWorked = Math.round(hoursWorked * 100) / 100;
      earnings = Math.round(hoursWorked * r.user.hourlyRate * 100) / 100;
    }

    return { ...r, hoursWorked, earnings };
  });

  return NextResponse.json({
    stats: {
      totalUsers,
      presentToday: todayRecords.length,
      absentToday: totalUsers - todayRecords.length,
    },
    todayRecords: enrichedRecords,
  });
}
