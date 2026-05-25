import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateSecret } from "otplib";
import QRCode from "qrcode";

// GET: Admin obtiene la configuración QR (genera si no existe)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let config = await prisma.qrConfig.findUnique({ where: { id: "default" } });

  if (!config) {
    const secret = generateSecret();
    config = await prisma.qrConfig.create({
      data: {
        id: "default",
        secret,
        enabled: true,
      },
    });
  }

  // Generate QR code with embedded data
  const qrPayload = JSON.stringify({
    siteId: config.siteId,
    secret: config.secret,
    app: "azuuca",
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 400,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" },
  });

  return NextResponse.json({
    siteId: config.siteId,
    enabled: config.enabled,
    qrDataUrl,
    createdAt: config.createdAt,
  });
}

// POST: Admin regenera el secreto QR
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const secret = generateSecret();

  const config = await prisma.qrConfig.upsert({
    where: { id: "default" },
    update: { secret },
    create: { id: "default", secret, enabled: true },
  });

  const qrPayload = JSON.stringify({
    siteId: config.siteId,
    secret: config.secret,
    app: "azuuca",
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 400,
    margin: 2,
    color: { dark: "#1e293b", light: "#ffffff" },
  });

  return NextResponse.json({
    siteId: config.siteId,
    enabled: config.enabled,
    qrDataUrl,
    createdAt: config.createdAt,
  });
}

// PATCH: Admin activa/desactiva verificación QR
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { enabled } = await request.json();

  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "El campo 'enabled' debe ser booleano" },
      { status: 400 },
    );
  }

  const config = await prisma.qrConfig.update({
    where: { id: "default" },
    data: { enabled },
  });

  return NextResponse.json({ enabled: config.enabled });
}
