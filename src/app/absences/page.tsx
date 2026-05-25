"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarOff,
  Calendar,
  FileText,
  Send,
  Stethoscope,
  PartyPopper,
  CalendarCheck,
  HelpCircle,
  CheckCircle2,
  Inbox,
  Clock,
  XCircle,
} from "lucide-react";
import { sileo } from "sileo";

interface Absence {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  type: string;
  status: string;
  user?: { name: string } | null;
}

const ABSENCE_TYPES = [
  {
    value: "MEDICAL",
    label: "Médica",
    icon: Stethoscope,
    color: "text-rose-500",
  },
  {
    value: "VACATION",
    label: "Vacaciones",
    icon: CalendarCheck,
    color: "text-blue-500",
  },
  {
    value: "PAID_LEAVE",
    label: "Permiso pagado",
    icon: PartyPopper,
    color: "text-amber-500",
  },
  {
    value: "UNJUSTIFIED",
    label: "Injustificada",
    icon: HelpCircle,
    color: "text-gray-500",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [date, setDate] = useState("");
  const [type, setType] = useState("MEDICAL");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchAbsences();
  }, []);

  async function fetchAbsences() {
    try {
      const res = await fetch("/api/absences");
      if (res.ok) setAbsences(await res.json());
      else
        sileo.error({
          title: "Error al cargar",
          description: "No se pudieron obtener las ausencias",
        });
    } catch {
      sileo.error({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
      });
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    // Validate date is today or future
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (date < todayStr) {
      sileo.error({
        title: "Fecha inválida",
        description: "Solo puedes registrar ausencias a partir de hoy",
      });
      return;
    }

    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, type, reason }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.status === "PENDING") {
          setMessage("Solicitud enviada — pendiente de aprobación");
          sileo.info({
            title: "Solicitud enviada",
            description:
              "Tu ausencia fue enviada como solicitud y necesita aprobación de un administrador",
          });
        } else {
          setMessage("Ausencia registrada correctamente");
          sileo.success({
            title: "Ausencia registrada",
            description: "Tu ausencia fue guardada correctamente",
          });
        }
        setDate("");
        setReason("");
        fetchAbsences();
      } else {
        const err = await res.json().catch(() => null);
        sileo.error({
          title: "Error al registrar",
          description: err?.error || "No se pudo registrar la ausencia",
        });
      }
    } catch {
      sileo.error({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  const selectedType = ABSENCE_TYPES.find((t) => t.value === type);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <CalendarOff size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Justificación de Ausencias
          </h1>
          <p className="text-sm text-gray-500">
            Registra y consulta tus ausencias
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div variants={item} className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Send size={18} className="text-blue-500" />
          Registrar Ausencia
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-xl text-sm flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              {message}
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Fecha
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Tipo
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ABSENCE_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        type === t.value
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                          : "bg-gray-50/80 border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={type === t.value ? "text-blue-500" : t.color}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Razón / Justificación
            </label>
            <div className="relative">
              <FileText
                size={16}
                className="absolute left-3 top-3 text-gray-400"
              />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all resize-none"
                rows={3}
                placeholder="Describe el motivo de tu ausencia..."
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            className="gradient-btn text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow flex items-center gap-2"
          >
            <Send size={16} />
            Registrar Ausencia
          </motion.button>
        </form>
      </motion.div>

      {/* Absences List */}
      <motion.div variants={item} className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100/50 flex items-center gap-2">
          <CalendarOff size={18} className="text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">Mis Ausencias</h2>
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {absences.length}
          </span>
        </div>
        {absences.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No hay ausencias registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100/50">
            {absences.map((absence, i) => {
              const absenceType = ABSENCE_TYPES.find(
                (t) => t.value === absence.type,
              );
              const Icon = absenceType?.icon || HelpCircle;
              return (
                <motion.div
                  key={absence.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 hover:bg-blue-50/30 transition-colors flex items-start gap-4"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      absence.type === "MEDICAL"
                        ? "bg-rose-100"
                        : absence.type === "VACATION"
                          ? "bg-blue-100"
                          : absence.type === "PAID_LEAVE"
                            ? "bg-amber-100"
                            : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={absenceType?.color || "text-gray-500"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">
                        {absence.startDate}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          absence.type === "MEDICAL"
                            ? "bg-rose-100 text-rose-700"
                            : absence.type === "VACATION"
                              ? "bg-blue-100 text-blue-700"
                              : absence.type === "PAID_LEAVE"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {absenceType?.label || absence.type}
                      </span>
                      {absence.status === "PENDING" && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
                          <Clock size={10} />
                          Pendiente
                        </span>
                      )}
                      {absence.status === "REJECTED" && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <XCircle size={10} />
                          Rechazada
                        </span>
                      )}
                      {absence.status === "APPROVED" && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Aprobada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {absence.reason || "Sin razón especificada"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
