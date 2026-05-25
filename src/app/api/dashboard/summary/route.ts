import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calcPunctuality, getScheduleConfig } from "@/lib/schedule";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Parámetros 'from' y 'to' son requeridos" },
      { status: 400 },
    );
  }

  // Get all attendance records in the date range
  const [records, scheduleConfig] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            hourlyRate: true,
            maxMonthlyEarnings: true,
          },
        },
      },
      orderBy: [{ user: { name: "asc" } }, { date: "asc" }],
    }),
    getScheduleConfig(),
  ]);

  // Get all unique dates in range that have records
  const allDates = [...new Set(records.map((r) => r.date))].sort();

  // Group by user
  const userMap = new Map<
    string,
    {
      id: string;
      name: string;
      hourlyRate: number;
      maxMonthlyEarnings: number | null;
      days: Record<
        string,
        {
          hoursWorked: number;
          earnings: number;
          lateArrivalMin: number | null;
          earlyDepartureMin: number | null;
        }
      >;
      totalHours: number;
      totalEarnings: number;
    }
  >();

  for (const r of records) {
    if (!userMap.has(r.userId)) {
      userMap.set(r.userId, {
        id: r.userId,
        name: r.user.name,
        hourlyRate: r.user.hourlyRate,
        maxMonthlyEarnings: r.user.maxMonthlyEarnings,
        days: {},
        totalHours: 0,
        totalEarnings: 0,
      });
    }

    const entry = userMap.get(r.userId)!;

    const lateArrivalMin = r.clockIn
      ? calcPunctuality(r.clockIn, scheduleConfig.clockInTime)
      : null;
    let earlyDepartureMin: number | null = null;

    if (r.clockIn && r.clockOut) {
      const [inH, inM, inS] = r.clockIn.split(":").map(Number);
      const [outH, outM, outS] = r.clockOut.split(":").map(Number);
      const inSeconds = inH * 3600 + inM * 60 + (inS || 0);
      const outSeconds = outH * 3600 + outM * 60 + (outS || 0);
      const hoursWorked =
        Math.round(Math.max(0, (outSeconds - inSeconds) / 3600) * 100) / 100;
      const earnings = Math.round(hoursWorked * r.user.hourlyRate * 100) / 100;
      earlyDepartureMin = calcPunctuality(
        r.clockOut,
        scheduleConfig.clockOutTime,
      );

      entry.days[r.date] = {
        hoursWorked,
        earnings,
        lateArrivalMin,
        earlyDepartureMin,
      };
      entry.totalHours =
        Math.round((entry.totalHours + hoursWorked) * 100) / 100;
      entry.totalEarnings =
        Math.round((entry.totalEarnings + earnings) * 100) / 100;
    } else {
      entry.days[r.date] = {
        hoursWorked: 0,
        earnings: 0,
        lateArrivalMin,
        earlyDepartureMin,
      };
    }
  }

  // Cap earnings per user (using each user's own maxMonthlyEarnings)
  const users = Array.from(userMap.values()).map((u) => {
    const maxCap = u.maxMonthlyEarnings;
    return {
      ...u,
      totalEarnings:
        maxCap !== null ? Math.min(u.totalEarnings, maxCap) : u.totalEarnings,
    };
  });

  return NextResponse.json({
    dates: allDates,
    users,
    schedule: {
      clockInTime: scheduleConfig.clockInTime,
      clockOutTime: scheduleConfig.clockOutTime,
    },
  });
}
