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

  const isAdmin = session.user.role === "ADMIN";

  const absences = await prisma.leaveRequest.findMany({
    where: {
      type: { in: JUSTIFICATION_TYPES },
      userId: isAdmin && userId ? userId : session.user.id,
    },
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
    },
  });

  return NextResponse.json(absence);
}
