"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, FileText, Send, Clock, Users } from "lucide-react";

const LEAVE_TYPES = [
  {
    value: "VACATION",
    label: "Vacaciones",
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bgLight: "bg-emerald-50 border-emerald-200",
  },
  {
    value: "MEDICAL",
    label: "Licencia Médica",
    color: "bg-rose-500",
    textColor: "text-rose-700",
    bgLight: "bg-rose-50 border-rose-200",
  },
  {
    value: "PAID_LEAVE",
    label: "Permiso Retribuido",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgLight: "bg-blue-50 border-blue-200",
  },
  {
    value: "UNJUSTIFIED",
    label: "Ausencia Injustificada",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgLight: "bg-gray-50 border-gray-200",
  },
  {
    value: "HOLIDAY",
    label: "Feriado",
    color: "bg-amber-500",
    textColor: "text-amber-700",
    bgLight: "bg-amber-50 border-amber-200",
  },
] as const;

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface CreateLeaveData {
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  userId?: string;
  hours?: number;
}

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateLeaveData) => Promise<void>;
  initialStartDate?: string;
  initialEndDate?: string;
  isAdmin: boolean;
}

export function LeaveRequestModal({
  isOpen,
  onClose,
  onSubmit,
  initialStartDate = "",
  initialEndDate = "",
  isAdmin,
}: LeaveRequestModalProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate || initialStartDate);
  const [type, setType] = useState<string>("VACATION");
  const [reason, setReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [hours, setHours] = useState<string>("8");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);

  // Fetch user list for admin
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users")
        .then((res) => (res.ok ? res.json() : []))
        .then((data: UserOption[]) => setUsers(data));
    }
  }, [isAdmin]);

  function resetForm() {
    setType("VACATION");
    setReason("");
    setSelectedUserId("");
    setHours("8");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const data: CreateLeaveData = { startDate, endDate, type, reason };
      if (type === "HOLIDAY") {
        data.hours = parseFloat(hours);
      } else if (isAdmin && selectedUserId) {
        data.userId = selectedUserId;
      }
      await onSubmit(data);
      resetForm();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al registrar la ausencia",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Sync initialStartDate/initialEndDate when modal reopens
  if (isOpen && initialStartDate && startDate !== initialStartDate) {
    setStartDate(initialStartDate);
    setEndDate(initialEndDate || initialStartDate);
  }

  const isHoliday = type === "HOLIDAY";
  const availableTypes = isAdmin
    ? LEAVE_TYPES
    : LEAVE_TYPES.filter((t) => t.value !== "HOLIDAY");

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
            className="w-full max-w-lg glass-strong rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Send size={16} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Registrar Ausencia
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Fecha inicio
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value > endDate)
                          setEndDate(e.target.value);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Fecha fin
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Type selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Tipo de ausencia
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                        type === t.value
                          ? t.bgLight + " shadow-sm"
                          : "bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                      <span className={type === t.value ? t.textColor : ""}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin: user selector (not for HOLIDAY) */}
              {isAdmin && !isHoliday && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    <Users size={12} className="inline mr-1" />
                    Empleado
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                  >
                    <option value="">Yo mismo</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* HOLIDAY: hours input */}
              {isHoliday && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    <Clock size={12} className="inline mr-1" />
                    Horas a pagar
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Horas que se pagarán a cada empleado por este feriado
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  <FileText size={12} className="inline mr-1" />
                  {isHoliday ? "Nombre del feriado" : "Motivo"}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isHoliday
                      ? "Ej: Día de la Independencia"
                      : "Describe el motivo de la ausencia..."
                  }
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-medium text-white gradient-btn rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { LEAVE_TYPES };
