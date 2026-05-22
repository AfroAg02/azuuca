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
