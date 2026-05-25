"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import type { AppNotification } from "@/types/notifications";

interface NotificationContextType {
  connected: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  connected: false,
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

const MAX_NOTIFICATIONS = 50;
const STORAGE_KEY = "azuuca_notifications";

function loadStored(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveStored(n: AppNotification[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
  } catch {}
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] =
    useState<AppNotification[]>(loadStored);
  const esRef = useRef<EventSource | null>(null);

  // Persist notifications to localStorage
  useEffect(() => {
    saveStored(notifications);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Connect via Server-Sent Events when authenticated
  useEffect(() => {
    if (status !== "authenticated") return;

    const es = new EventSource("/api/notifications/stream");
    esRef.current = es;

    es.addEventListener("connected", () => setConnected(true));

    es.addEventListener("notification", (event) => {
      const notification: AppNotification = JSON.parse(event.data);
      setNotifications((prev) =>
        [notification, ...prev].slice(0, MAX_NOTIFICATIONS),
      );
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [status]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        connected,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
