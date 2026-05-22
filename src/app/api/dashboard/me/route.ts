import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  getTodayInTimezone,
  getNowInTimezone,
  getTimezoneFromRequest,
} from "@/lib/timezone";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const timezone = getTimezoneFromRequest(req);
  const today = getTodayInTimezone(timezone);

  const searchParams = req.nextUrl.searchParams;
  const year = parseInt(
    searchParams.get("year") || new Date().getFullYear().toString(),
  );
  const month = parseInt(
    searchParams.get("month") || (new Date().getMonth() + 1).toString(),
  );

  const userId = session.user.id;

  // Date range for the requested month
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Current attendance status
  const todayAttendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  // All attendance records for the month
  const monthRecords = await prisma.attendance.findMany({
    where: {
      userId,
      date: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { date: "asc" },
  });

  // Absences this month
  const monthAbsences = await prisma.leaveRequest.count({
    where: {
      userId,
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
      type: { not: "HOLIDAY" },
    },
  });

  const { time: currentTime } = getNowInTimezone(timezone);

  // Compute hours per day
  const days = monthRecords.map((r) => {
    let hoursWorked: number | null = null;
    if (r.clockIn) {
      const [inH, inM, inS] = r.clockIn.split(":").map(Number);
      const inSeconds = inH * 3600 + inM * 60 + (inS || 0);

      if (r.clockOut) {
        const [outH, outM, outS] = r.clockOut.split(":").map(Number);
        const outSeconds = outH * 3600 + outM * 60 + (outS || 0);
        hoursWorked =
          Math.round(Math.max(0, (outSeconds - inSeconds) / 3600) * 100) / 100;
      } else if (r.date === today) {
        // Currently working — calculate partial hours
        const [nowH, nowM, nowS] = currentTime.split(":").map(Number);
        const nowSeconds = nowH * 3600 + nowM * 60 + (nowS || 0);
        hoursWorked =
          Math.round(Math.max(0, (nowSeconds - inSeconds) / 3600) * 100) / 100;
      }
    }
    return {
      date: r.date,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      hoursWorked,
    };
  });

  const totalHours = days.reduce((sum, d) => sum + (d.hoursWorked || 0), 0);
  const daysWorked = days.filter((d) => d.clockIn !== null).length;

  // Current status
  let status: "not_started" | "working" | "completed" = "not_started";
  if (todayAttendance?.clockIn && todayAttendance?.clockOut) {
    status = "completed";
  } else if (todayAttendance?.clockIn) {
    status = "working";
  }

  return NextResponse.json({
    daysWorked,
    status,
    monthAbsences,
    totalHours: Math.round(totalHours * 100) / 100,
    days,
    month,
    year,
  });
}
