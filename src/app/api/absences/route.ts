import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getTodayInTimezone, getTimezoneFromRequest } from "@/lib/timezone";

const JUSTIFICATION_TYPES = [
  "MEDICAL",
  "VACATION",
  "PAID_LEAVE",
  "UNJUSTIFIED",
];

// GET: obtener ausencias (justificaciones)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const all = searchParams.get("all");

  const isAdmin = session.user.role === "ADMIN";

  const whereClause: Record<string, unknown> = {
    type: { in: JUSTIFICATION_TYPES },
  };

  if (isAdmin && all === "true") {
    // Admin requesting all absences — no userId filter
    if (userId) whereClause.userId = userId;
  } else {
    whereClause.userId = isAdmin && userId ? userId : session.user.id;
  }

  const absences = await prisma.leaveRequest.findMany({
    where: whereClause,
    include: { user: { select: { name: true } } },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(absences);
}

// POST: registrar ausencia (justificación)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { date, reason, type } = body;

  if (!date || !type) {
    return NextResponse.json(
      { error: "Fecha y tipo son requeridos" },
      { status: 400 },
    );
  }

  if (!JUSTIFICATION_TYPES.includes(type)) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const timezone = getTimezoneFromRequest(req);
  const today = getTodayInTimezone(timezone);

  if (!isAdmin && date < today) {
    return NextResponse.json(
      { error: "Solo puedes registrar ausencias a partir de hoy" },
      { status: 400 },
    );
  }

  // Determine status: users planning future absences → PENDING
  const isFuture = date > today;

  // Non-admin users must request future absences with at least 72 hours notice
  if (!isAdmin && isFuture) {
    const startMs = new Date(date + "T00:00:00").getTime();
    const nowMs = Date.now();
    const hoursUntilStart = (startMs - nowMs) / (1000 * 60 * 60);
    if (hoursUntilStart < 72) {
      return NextResponse.json(
        {
          error:
            "Debes solicitar la ausencia con al menos 72 horas de antelación",
        },
        { status: 400 },
      );
    }
  }

  const status = !isAdmin && isFuture ? "PENDING" : "APPROVED";

  // Check for overlap
  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      userId: session.user.id,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  if (overlap) {
    return NextResponse.json(
      { error: "Ya existe una ausencia registrada para esa fecha" },
      { status: 409 },
    );
  }

  const absence = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      createdBy: session.user.id,
      startDate: date,
      endDate: date,
      type,
      reason: reason || "",
      status,
    },
  });

  return NextResponse.json(absence);
}
