import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const DAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from && to) {
    where.date = { gte: from, lte: to };
  } else if (from) {
    where.date = { gte: from };
  } else if (to) {
    where.date = { lte: to };
  }

  const [attendances, globalConfig] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { user: { select: { name: true, hourlyRate: true } } },
      orderBy: [{ date: "asc" }, { user: { name: "asc" } }],
    }),
    prisma.globalConfig.findUnique({
      where: { id: "global" },
      select: { maxMonthlyEarnings: true },
    }),
  ]);

  const maxCap = globalConfig?.maxMonthlyEarnings ?? null;

  // Track cumulative earnings per user per month for capping
  const userMonthEarnings = new Map<string, number>();

  const data = attendances.map((a) => {
    const dateObj = new Date(a.date + "T12:00:00");
    const monthKey = `${a.userId}-${dateObj.getFullYear()}-${dateObj.getMonth()}`;

    let hoursWorked = 0;
    let earnings = 0;
    if (a.clockIn && a.clockOut) {
      const [inH, inM, inS] = a.clockIn.split(":").map(Number);
      const [outH, outM, outS] = a.clockOut.split(":").map(Number);
      const inSeconds = inH * 3600 + inM * 60 + (inS || 0);
      const outSeconds = outH * 3600 + outM * 60 + (outS || 0);
      hoursWorked = Math.max(0, (outSeconds - inSeconds) / 3600);
      hoursWorked = Math.round(hoursWorked * 100) / 100;

      const rawDayEarnings =
        Math.round(hoursWorked * a.user.hourlyRate * 100) / 100;
      const prevCumulative = userMonthEarnings.get(monthKey) || 0;

      if (maxCap !== null) {
        const remaining = Math.max(0, maxCap - prevCumulative);
        earnings = Math.min(rawDayEarnings, remaining);
      } else {
        earnings = rawDayEarnings;
      }

      userMonthEarnings.set(monthKey, prevCumulative + rawDayEarnings);
    }

    return {
      Año: dateObj.getFullYear(),
      Mes: MONTHS_ES[dateObj.getMonth()],
      "Día de la Semana": DAYS_ES[dateObj.getDay()],
      Día: dateObj.getDate(),
      "Fecha Completa": a.date,
      Nombre: a.user.name,
      "Hora de Entrada": a.clockIn || "",
      "Hora de Salida": a.clockOut || "",
      "Horas Trabajadas": hoursWorked,
      "Tarifa/Hora": a.user.hourlyRate,
      "Ganancia del Día": earnings,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws["!cols"] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 15 },
    { wch: 6 },
    { wch: 14 },
    { wch: 25 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="asistencia_${from || "todos"}_${to || "todos"}.xlsx"`,
    },
  });
}
