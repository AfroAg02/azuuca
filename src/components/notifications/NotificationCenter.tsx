"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  ChevronRight,
  CalendarOff,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useNotifications } from "./SignalRProvider";
import type { AppNotification, NotificationType } from "@/types/notifications";

const PREVIEW_COUNT = 4;

const typeDot: Record<NotificationType, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

const typeIcon: Record<NotificationType, React.ReactNode> = {
  info: <Info size={16} className="text-blue-500" />,
  success: <CheckCircle2 size={16} className="text-emerald-500" />,
  warning: <AlertTriangle size={16} className="text-amber-500" />,
  error: <XCircle size={16} className="text-red-500" />,
};

const typeBg: Record<NotificationType, string> = {
  info: "bg-blue-50",
  success: "bg-emerald-50",
  warning: "bg-amber-50",
  error: "bg-red-50",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

/* ─── Single notification row ─── */
function NotificationItem({
  notif,
  onRead,
  compact,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`group px-4 ${compact ? "py-2.5" : "py-3"} cursor-pointer transition-colors hover:bg-gray-50 ${
        !notif.read ? "bg-blue-50/40" : ""
      }`}
      onClick={() => onRead(notif.id)}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            notif.read ? "bg-gray-100" : typeBg[notif.type]
          }`}
        >
          {typeIcon[notif.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-sm font-medium truncate ${
                notif.read ? "text-gray-500" : "text-gray-900"
              }`}
            >
              {notif.title}
            </span>
            <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
              {timeAgo(notif.timestamp)}
            </span>
          </div>
          <p
            className={`text-xs mt-0.5 line-clamp-2 ${
              notif.read ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {notif.message}
          </p>
        </div>
        {!notif.read && (
          <div
            className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${typeDot[notif.type]}`}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Full notifications slide-over panel ─── */
function NotificationsPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  clearAll,
}: {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl z-[61] flex flex-col"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Notificaciones
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} sin leer` : "Todas leídas"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck size={18} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Limpiar todas"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-5 pt-3 pb-1 gap-2">
              {(["all", "unread"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === tab
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {tab === "all" ? "Todas" : "Sin leer"}
                  {tab === "unread" && unreadCount > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Bell size={40} className="mb-3 opacity-20" />
                  <p className="text-sm">
                    {filter === "unread"
                      ? "No tienes notificaciones sin leer"
                      : "Sin notificaciones"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtered.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onRead={markAsRead}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Main bell + dropdown ─── */
export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const previewNotifications = notifications.slice(0, PREVIEW_COUNT);
  const hasMore = notifications.length > PREVIEW_COUNT;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell button */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </button>

        {/* Quick-preview dropdown */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Notificaciones
                  </h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Marcar leídas
                  </button>
                )}
              </div>

              {/* Preview list */}
              <div className="max-h-72 overflow-y-auto">
                {previewNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    <Bell size={28} className="mx-auto mb-2 opacity-20" />
                    Sin notificaciones
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {previewNotifications.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notif={notif}
                        onRead={markAsRead}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: "Ver todas" */}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setPanelOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border-t border-gray-100 transition-colors"
                >
                  Ver todas las notificaciones
                  <ChevronRight size={14} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full notifications panel */}
      <NotificationsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        clearAll={clearAll}
      />
    </>
  );
}
