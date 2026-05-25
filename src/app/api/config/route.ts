import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: obtener configuración global (cualquier usuario autenticado)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let config = await prisma.globalConfig.findUnique({
    where: { id: "global" },
  });

  if (!config) {
    config = await prisma.globalConfig.create({
      data: { id: "global", clockInTime: "09:00", clockOutTime: "18:00" },
    });
  }

  return NextResponse.json(config);
}

// PUT: actualizar configuración global (solo admin)
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { clockInTime, clockOutTime, maxMonthlyEarnings } = body;

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(clockInTime) || !timeRegex.test(clockOutTime)) {
    return NextResponse.json(
      { error: "Formato de hora inválido (HH:mm)" },
      { status: 400 },
    );
  }

  if (clockOutTime <= clockInTime) {
    return NextResponse.json(
      { error: "La hora de salida debe ser posterior a la hora de entrada" },
      { status: 400 },
    );
  }

  // maxMonthlyEarnings: null or undefined means no cap, otherwise must be positive
  const parsedMax = maxMonthlyEarnings === null || maxMonthlyEarnings === "" || maxMonthlyEarnings === undefined
    ? null
    : parseFloat(maxMonthlyEarnings);

  if (parsedMax !== null && (isNaN(parsedMax) || parsedMax < 0)) {
    return NextResponse.json(
      { error: "El monto máximo mensual debe ser un número positivo" },
      { status: 400 },
    );
  }

  const config = await prisma.globalConfig.upsert({
    where: { id: "global" },
    update: { clockInTime, clockOutTime, maxMonthlyEarnings: parsedMax },
    create: { id: "global", clockInTime, clockOutTime, maxMonthlyEarnings: parsedMax },
  });

  return NextResponse.json(config);
}
