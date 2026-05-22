import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Ausencia no encontrada" },
      { status: 404 },
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  // Users can only delete their own absences; admins can delete any
  if (!isAdmin && existing.userId !== session.user.id) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar esta ausencia" },
      { status: 403 },
    );
  }

  await prisma.leaveRequest.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Ausencia no encontrada" },
      { status: 404 },
    );
  }

  const body = await req.json();
  const { startDate, endDate } = body;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate y endDate son requeridos" },
      { status: 400 },
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "La fecha de inicio no puede ser posterior a la fecha de fin" },
      { status: 400 },
    );
  }

  // Check overlap (exclude current record)
  if (existing.userId) {
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        id: { not: params.id },
        userId: existing.userId,
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
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: params.id },
    data: { startDate, endDate },
    include: {
      user: { select: { id: true, name: true, email: true } },
      creator: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}
