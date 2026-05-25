import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySync } from "otplib";
import { getNowInTimezone, getTimezoneFromRequest } from "@/lib/timezone";

// POST: Verificar código QR + TOTP y registrar asistencia
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

  const body = await request.json();
  const { siteId, totp } = body;

  if (!siteId || !totp) {
    return NextResponse.json(
      { error: "siteId y totp son requeridos" },
      { status: 400 },
    );
  }

  // Buscar configuración QR
  const config = await prisma.qrConfig.findUnique({
    where: { id: "default" },
  });

  if (!config) {
    return NextResponse.json(
      { error: "Verificación QR no configurada" },
      { status: 404 },
    );
  }

  if (!config.enabled) {
    return NextResponse.json(
      { error: "La verificación QR está desactivada" },
      { status: 403 },
    );
  }

  // Verificar siteId
  if (config.siteId !== siteId) {
    return NextResponse.json({ error: "Código QR inválido" }, { status: 400 });
  }

  // Verificar TOTP (epochTolerance: 30 acepta ±30s)
  const result = verifySync({
    token: totp,
    secret: config.secret,
    epochTolerance: 30,
  });
  const isValid = result.valid;

  if (!isValid) {
    return NextResponse.json(
      { error: "Código de verificación expirado. Escanea de nuevo." },
      { status: 400 },
    );
  }

  // Registrar asistencia
  const timezone = getTimezoneFromRequest(request);
  const { date: today, time } = getNowInTimezone(timezone);

  let attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  if (!attendance) {
    attendance = await prisma.attendance.create({
      data: { userId: session.user.id, date: today, clockIn: time },
    });
    return NextResponse.json({
      ...attendance,
      action: "clockIn",
      message: "Entrada registrada correctamente",
    });
  } else if (!attendance.clockOut) {
    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { clockOut: time },
    });
    return NextResponse.json({
      ...attendance,
      action: "clockOut",
      message: "Salida registrada correctamente",
    });
  }

  return NextResponse.json({
    ...attendance,
    action: "none",
    message: "Ya registraste entrada y salida hoy",
  });
}

// GET: Verificar si la verificación QR está habilitada
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const config = await prisma.qrConfig.findUnique({
    where: { id: "default" },
    select: { enabled: true },
  });

  return NextResponse.json({ qrEnabled: config?.enabled ?? false });
}
