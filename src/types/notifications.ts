export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  /** Optional: target specific user IDs. Empty = broadcast */
  targetUserIds?: string[];
}

export interface SendNotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  /** If empty or omitted, broadcasts to all connected users */
  targetUserIds?: string[];
}
