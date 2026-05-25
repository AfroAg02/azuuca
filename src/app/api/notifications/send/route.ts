import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcastNotification } from "@/lib/notifications";
import type { SendNotificationPayload } from "@/types/notifications";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body: SendNotificationPayload = await request.json();

  if (!body.title || !body.message) {
    return NextResponse.json(
      { error: "Título y mensaje son requeridos" },
      { status: 400 },
    );
  }

  const notification = {
    id: crypto.randomUUID(),
    title: body.title,
    message: body.message,
    type: body.type || "info",
    timestamp: new Date().toISOString(),
    read: false,
  };

  broadcastNotification(notification, body.targetUserIds);

  return NextResponse.json({ success: true, notification });
}
