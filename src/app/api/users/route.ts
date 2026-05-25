import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// GET: listar todos los usuarios (solo admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      hourlyRate: true,
      maxMonthlyEarnings: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

// POST: crear usuario (solo admin)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, password, role, hourlyRate, maxMonthlyEarnings } = body;

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "Email, nombre y contraseña son requeridos" },
      { status: 400 },
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "El email ya está registrado" },
      { status: 400 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: role || "USER",
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
      maxMonthlyEarnings:
        maxMonthlyEarnings !== undefined &&
        maxMonthlyEarnings !== null &&
        maxMonthlyEarnings !== ""
          ? parseFloat(maxMonthlyEarnings)
          : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      hourlyRate: true,
      maxMonthlyEarnings: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
