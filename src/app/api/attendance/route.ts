import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

// GET: obtener asistencia de hoy del usuario actual
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const today = getToday();
  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  return NextResponse.json(attendance);
}

// POST: registrar entrada o salida
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const today = getToday();
  const time = getCurrentTime();

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
  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
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
