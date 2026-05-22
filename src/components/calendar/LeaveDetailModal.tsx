"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, User, Calendar, FileText, Clock } from "lucide-react";
import { useState } from "react";
import { LEAVE_TYPES } from "./LeaveRequestModal";

interface LeaveRequestData {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  hours: number | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  creator: { name: string };
}

interface LeaveDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequestData | null;
  isAdmin: boolean;
  currentUserId: string;
  onDelete: (id: string) => Promise<void>;
}

function formatDateES(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
}

export function LeaveDetailModal({
  isOpen,
  onClose,
  leaveRequest,
  isAdmin,
  currentUserId,
  onDelete,
}: LeaveDetailModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!leaveRequest) return null;

  const leaveType = LEAVE_TYPES.find((t) => t.value === leaveRequest.type);
  const dayCount = getDayCount(leaveRequest.startDate, leaveRequest.endDate);
  const isHoliday = leaveRequest.type === "HOLIDAY";
  const canDelete = isAdmin || leaveRequest.user?.id === currentUserId;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(leaveRequest!.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="w-full max-w-lg glass-strong rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl ${leaveType?.color ?? "bg-gray-500"} flex items-center justify-center shadow-lg`}
                >
                  <Calendar size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {isHoliday ? "Feriado" : "Detalle de Ausencia"}
                  </h2>
                  <p className="text-xs text-gray-500">{leaveType?.label}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                {isHoliday ? (
                  <div className="bg-amber-50/80 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock size={11} /> Feriado — aplica a todos
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {leaveRequest.hours} hora
                      {leaveRequest.hours !== 1 ? "s" : ""} pagadas
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50/80 rounded-xl p-3">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <User size={11} /> Empleado
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {leaveRequest.user?.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {leaveRequest.user?.email}
                    </p>
                  </div>
                )}
                <div
                  className={`bg-gray-50/80 rounded-xl p-3 ${isHoliday ? "" : ""}`}
                >
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar size={11} /> Duración
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {dayCount} día{dayCount > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDateES(leaveRequest.startDate)}
                    {leaveRequest.startDate !== leaveRequest.endDate &&
                      ` — ${formatDateES(leaveRequest.endDate)}`}
                  </p>
                </div>
                <div className="bg-gray-50/80 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Registrado por
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {leaveRequest.creator.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(leaveRequest.createdAt).toLocaleDateString(
                      "es-ES",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {leaveRequest.reason && (
                <div className="bg-gray-50/80 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FileText size={11} /> {isHoliday ? "Nombre" : "Motivo"}
                  </p>
                  <p className="text-sm text-gray-700">{leaveRequest.reason}</p>
                </div>
              )}

              {/* Delete */}
              {canDelete && (
                <div className="border-t border-gray-100 pt-4">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {deleting ? "Eliminando..." : "Eliminar Ausencia"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
