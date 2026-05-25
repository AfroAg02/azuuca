import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { broadcastNotification } from "@/lib/notifications";
import { getTodayInTimezone, getTimezoneFromRequest } from "@/lib/timezone";

// PATCH: approve/reject a leave request (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin) {
    return NextResponse.json(
      {
        error: "Solo los administradores pueden aprobar o rechazar solicitudes",
      },
      { status: 403 },
    );
  }

  const existing = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 },
    );
  }

  const body = await req.json();
  const { status, startDate, endDate } = body;

  const data: Record<string, string> = {};

  if (status) {
    const validStatuses = ["APPROVED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }
    data.status = status;
  }

  if (startDate) data.startDate = startDate;
  if (endDate) data.endDate = endDate;

  const updated = await prisma.leaveRequest.update({
    where: { id: params.id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true } },
      creator: { select: { name: true } },
    },
  });

  // Notify the user when their request is approved/rejected
  if (status && updated.userId) {
    const isApproved = status === "APPROVED";
    broadcastNotification(
      {
        id: crypto.randomUUID(),
        title: isApproved ? "Solicitud aprobada" : "Solicitud rechazada",
        message: isApproved
          ? `Tu solicitud del ${updated.startDate} al ${updated.endDate} fue aprobada`
          : `Tu solicitud del ${updated.startDate} al ${updated.endDate} fue rechazada`,
        type: isApproved ? "success" : "error",
        timestamp: new Date().toISOString(),
        read: false,
        data: {
          kind: "absence_update",
          absenceId: updated.id,
          newStatus: status,
        },
      },
      [updated.userId],
    );
  }

  return NextResponse.json(updated);
}

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

  // Non-admin users cannot delete absences once the end date has passed
  if (!isAdmin) {
    const timezone = getTimezoneFromRequest(_req);
    const today = getTodayInTimezone(timezone);
    if (existing.endDate < today) {
      return NextResponse.json(
        { error: "No puedes eliminar una ausencia que ya ha pasado" },
        { status: 403 },
      );
    }
  }

  await prisma.leaveRequest.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
