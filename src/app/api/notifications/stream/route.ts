import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  notificationEmitter,
  type NotificationEvent,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("No autorizado", { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        notificationEmitter.off("notification", handler);
      };

      // Send connection confirmation
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ userId })}\n\n`,
        ),
      );

      // Listen for notifications, filtering by target user
      const handler = (event: NotificationEvent) => {
        if (closed) return;
        const targeted = event.targetUserIds && event.targetUserIds.length > 0;
        if (targeted && !event.targetUserIds!.includes(userId)) return;

        try {
          controller.enqueue(
            encoder.encode(
              `event: notification\ndata: ${JSON.stringify(event.notification)}\n\n`,
            ),
          );
        } catch {
          cleanup();
        }
      };

      notificationEmitter.on("notification", handler);

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          cleanup();
        }
      }, 30_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
