import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Parámetros 'from' y 'to' son requeridos (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  // Admin sees everything; users see their own + holidays (userId is null)
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      startDate: { lte: to },
      endDate: { gte: from },
      ...(isAdmin
        ? {}
        : {
            OR: [
              { userId: session.user.id },
              { userId: null }, // holidays
            ],
          }),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      creator: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(leaveRequests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { startDate, endDate, type, reason, userId, hours } = body;

  if (!startDate || !endDate || !type) {
    return NextResponse.json(
      { error: "startDate, endDate y type son requeridos" },
      { status: 400 },
    );
  }

  const validTypes = [
    "VACATION",
    "MEDICAL",
    "PAID_LEAVE",
    "UNJUSTIFIED",
    "HOLIDAY",
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "La fecha de inicio no puede ser posterior a la fecha de fin" },
      { status: 400 },
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  // HOLIDAY: only admin, applies to everyone (userId = null), requires hours
  if (type === "HOLIDAY") {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Solo los administradores pueden crear feriados" },
        { status: 403 },
      );
    }
    if (!hours || hours <= 0) {
      return NextResponse.json(
        { error: "Debes especificar las horas a pagar para el feriado" },
        { status: 400 },
      );
    }

    const holiday = await prisma.leaveRequest.create({
      data: {
        userId: null,
        createdBy: session.user.id,
        startDate,
        endDate,
        type,
        reason: reason || "",
        hours: Number(hours),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        creator: { select: { name: true } },
      },
    });

    return NextResponse.json(holiday, { status: 201 });
  }

  // Regular absence: determine target user
  const targetUserId = isAdmin && userId ? userId : session.user.id;

  // Non-admin cannot create absences for other users
  if (!isAdmin && userId && userId !== session.user.id) {
    return NextResponse.json(
      { error: "Solo puedes registrar ausencias propias" },
      { status: 403 },
    );
  }

  // Check overlap for that user
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      userId: targetUserId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) {
    return NextResponse.json(
      { error: "Ya existe una ausencia que se superpone con estas fechas" },
      { status: 409 },
    );
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: targetUserId,
      createdBy: session.user.id,
      startDate,
      endDate,
      type,
      reason: reason || "",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      creator: { select: { name: true } },
    },
  });

  return NextResponse.json(leaveRequest, { status: 201 });
}
