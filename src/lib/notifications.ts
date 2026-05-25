import { EventEmitter } from "events";
import type { AppNotification } from "@/types/notifications";

export interface NotificationEvent {
  notification: AppNotification;
  targetUserIds?: string[];
}

// Global singleton that survives hot reloads in dev
const g = globalThis as typeof globalThis & {
  __notifEmitter: EventEmitter;
};

if (!g.__notifEmitter) {
  g.__notifEmitter = new EventEmitter();
  g.__notifEmitter.setMaxListeners(200);
}

export const notificationEmitter = g.__notifEmitter;

export function broadcastNotification(
  notification: AppNotification,
  targetUserIds?: string[],
) {
  notificationEmitter.emit("notification", {
    notification,
    targetUserIds,
  } as NotificationEvent);
}
