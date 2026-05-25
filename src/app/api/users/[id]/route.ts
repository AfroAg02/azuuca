import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// PUT: actualizar usuario
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = params;

  // Los usuarios solo pueden editarse a sí mismos; los admins pueden editar a cualquiera
  if (session.user.id !== id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, hourlyRate, role, maxMonthlyEarnings } = body;

  const data: Record<string, string | number | null> = {};
  if (name) data.name = name;
  if (email) {
    // Verificar que el email no esté en uso por otro usuario
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "El email ya está en uso" },
        { status: 400 },
      );
    }
    data.email = email;
  }
  if (password) data.password = await bcrypt.hash(password, 12);
  if (hourlyRate !== undefined && session.user.role === "ADMIN") {
    data.hourlyRate = parseFloat(String(hourlyRate));
  }
  if (maxMonthlyEarnings !== undefined && session.user.role === "ADMIN") {
    data.maxMonthlyEarnings =
      maxMonthlyEarnings === null || maxMonthlyEarnings === ""
        ? null
        : parseFloat(String(maxMonthlyEarnings));
  }
  if (
    role &&
    session.user.role === "ADMIN" &&
    ["USER", "ADMIN"].includes(role)
  ) {
    data.role = role;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      hourlyRate: true,
      maxMonthlyEarnings: true,
    },
  });

  return NextResponse.json(user);
}

// DELETE: eliminar usuario (solo admin)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // No permitir que un admin se elimine a sí mismo
  if (session.user.id === params.id) {
    return NextResponse.json(
      { error: "No puedes eliminarte a ti mismo" },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
