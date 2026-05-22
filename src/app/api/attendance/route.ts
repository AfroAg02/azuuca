import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  getNowInTimezone,
  getTodayInTimezone,
  getTimezoneFromRequest,
} from "@/lib/timezone";

// GET: obtener asistencia de hoy del usuario actual
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const timezone = getTimezoneFromRequest(request);
  const today = getTodayInTimezone(timezone);
  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  return NextResponse.json(attendance);
}

// POST: registrar entrada o salida
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!session.user.id) {
    return NextResponse.json(
      { error: "Sesión inválida. Inicia sesión de nuevo." },
      { status: 401 },
    );
  }

  const timezone = getTimezoneFromRequest(request);
  const { date: today, time } = getNowInTimezone(timezone);

  let attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  if (!attendance) {
    // Registrar entrada
    attendance = await prisma.attendance.create({
      data: { userId: session.user.id, date: today, clockIn: time },
    });
  } else if (!attendance.clockOut) {
    // Registrar salida
    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { clockOut: time },
    });
  }

  return NextResponse.json(attendance);
}

// PATCH: admin edita hora de entrada/salida de cualquier usuario
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, date, clockIn, clockOut } = body;

  if (!userId || !date) {
    return NextResponse.json(
      { error: "userId y date son requeridos" },
      { status: 400 },
    );
  }

  // Validar formato de hora HH:mm:ss
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
  if (clockIn !== undefined && clockIn !== null && !timeRegex.test(clockIn)) {
    return NextResponse.json(
      { error: "Formato de clockIn inválido (HH:mm:ss)" },
      { status: 400 },
    );
  }
  if (
    clockOut !== undefined &&
    clockOut !== null &&
    !timeRegex.test(clockOut)
  ) {
    return NextResponse.json(
      { error: "Formato de clockOut inválido (HH:mm:ss)" },
      { status: 400 },
    );
  }

  // Validar que la hora de salida sea posterior a la de entrada
  const finalClockIn = clockIn !== undefined ? clockIn : undefined;
  const finalClockOut = clockOut !== undefined ? clockOut : undefined;
  if (finalClockIn && finalClockOut && finalClockOut <= finalClockIn) {
    return NextResponse.json(
      { error: "La hora de salida debe ser posterior a la hora de entrada" },
      { status: 400 },
    );
  }

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  const updateData: { clockIn?: string | null; clockOut?: string | null } = {};
  if (clockIn !== undefined) updateData.clockIn = clockIn || null;
  if (clockOut !== undefined) updateData.clockOut = clockOut || null;

  let attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } },
  });

  // When updating only one field, validate against the existing record
  if (attendance) {
    const effectiveIn =
      updateData.clockIn !== undefined
        ? updateData.clockIn
        : attendance.clockIn;
    const effectiveOut =
      updateData.clockOut !== undefined
        ? updateData.clockOut
        : attendance.clockOut;
    if (effectiveIn && effectiveOut && effectiveOut <= effectiveIn) {
      return NextResponse.json(
        { error: "La hora de salida debe ser posterior a la hora de entrada" },
        { status: 400 },
      );
    }
  }

  if (attendance) {
    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
    });
  } else {
    attendance = await prisma.attendance.create({
      data: {
        userId,
        date,
        clockIn: clockIn || null,
        clockOut: clockOut || null,
      },
    });
  }

  return NextResponse.json(attendance);
}
