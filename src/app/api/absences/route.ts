import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: obtener ausencias
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  // Admins pueden ver las ausencias de cualquier usuario
  const where =
    session.user.role === "ADMIN" && userId
      ? { userId }
      : { userId: session.user.id };

  const absences = await prisma.absence.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(absences);
}

// POST: registrar ausencia
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

  const validTypes = ["ILLNESS", "EVENT", "PLANNED", "OTHER"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  const absence = await prisma.absence.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { reason: reason || "", type },
    create: { userId: session.user.id, date, reason: reason || "", type },
  });

  return NextResponse.json(absence);
}
