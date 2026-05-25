"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useNotifications } from "@/components/notifications/SignalRProvider";
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
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  ShieldCheck,
  User,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
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
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { notifications } = useNotifications();

  const [absences, setAbsences] = useState<Absence[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [date, setDate] = useState("");
  const [type, setType] = useState("MEDICAL");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Detail modal state
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  // Admin DataGrid state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortField, setSortField] = useState<
    "startDate" | "user" | "type" | "status"
  >("startDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchAbsences();
    if (isAdmin) fetchAllAbsences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // React to real-time absence approval/rejection notifications
  const lastNotifRef = useRef<string | null>(null);
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (latest.id === lastNotifRef.current) return;
    if (latest.data?.kind === "absence_update") {
      lastNotifRef.current = latest.id;
      setAbsences((prev) =>
        prev.map((a) =>
          a.id === latest.data!.absenceId
            ? { ...a, status: latest.data!.newStatus as string }
            : a,
        ),
      );
    }
  }, [notifications]);

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

  async function fetchAllAbsences() {
    try {
      const res = await fetch("/api/absences?all=true");
      if (res.ok) setAllAbsences(await res.json());
    } catch {
      // silent — admin grid is supplementary
    }
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
        if (isAdmin) fetchAllAbsences();
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

  async function handleStatusChange(id: string, status: string) {
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/calendar/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        sileo.success({
          title:
            status === "APPROVED"
              ? "Solicitud aprobada"
              : "Solicitud rechazada",
          description: `La solicitud fue ${status === "APPROVED" ? "aprobada" : "rechazada"} correctamente`,
        });
        // Update both lists
        setAllAbsences((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a)),
        );
        setAbsences((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a)),
        );
        setSelectedAbsence(null);
      } else {
        const err = await res.json().catch(() => null);
        sileo.error({
          title: "Error",
          description: err?.error || "No se pudo actualizar el estado",
        });
      }
    } catch {
      sileo.error({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
      });
    } finally {
      setChangingStatus(false);
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

      {/* Admin DataGrid — All Absences */}
      {isAdmin && (
        <motion.div
          id="solicitudes"
          variants={item}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-gray-100/50 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Todas las Solicitudes
            </h2>
            <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {allAbsences.length}
            </span>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-100/50 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                placeholder="Buscar por nombre o razón..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 text-sm bg-gray-50/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/40 outline-none"
            >
              <option value="ALL">Todos los tipos</option>
              {ABSENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 text-sm bg-gray-50/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/40 outline-none"
            >
              <option value="ALL">Todos los estados</option>
              <option value="APPROVED">Aprobada</option>
              <option value="PENDING">Pendiente</option>
              <option value="REJECTED">Rechazada</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left">
                  {(
                    [
                      { key: "user", label: "Empleado" },
                      { key: "startDate", label: "Fecha" },
                      { key: "type", label: "Tipo" },
                      { key: "status", label: "Estado" },
                    ] as const
                  ).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => {
                        if (sortField === col.key)
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSortField(col.key);
                          setSortDir("asc");
                        }
                      }}
                      className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown
                          size={12}
                          className={
                            sortField === col.key
                              ? "text-indigo-500"
                              : "text-gray-300"
                          }
                        />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Razón
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {(() => {
                  const term = searchTerm.toLowerCase();
                  const filtered = allAbsences
                    .filter((a) => {
                      if (filterType !== "ALL" && a.type !== filterType)
                        return false;
                      if (filterStatus !== "ALL" && a.status !== filterStatus)
                        return false;
                      if (term) {
                        const name = a.user?.name?.toLowerCase() || "";
                        const reason = a.reason?.toLowerCase() || "";
                        if (!name.includes(term) && !reason.includes(term))
                          return false;
                      }
                      return true;
                    })
                    .sort((a, b) => {
                      let cmp = 0;
                      if (sortField === "user") {
                        cmp = (a.user?.name || "").localeCompare(
                          b.user?.name || "",
                        );
                      } else if (sortField === "startDate") {
                        cmp = a.startDate.localeCompare(b.startDate);
                      } else if (sortField === "type") {
                        cmp = a.type.localeCompare(b.type);
                      } else if (sortField === "status") {
                        cmp = a.status.localeCompare(b.status);
                      }
                      return sortDir === "asc" ? cmp : -cmp;
                    });

                  const totalPages = Math.max(
                    1,
                    Math.ceil(filtered.length / pageSize),
                  );
                  const paged = filtered.slice(
                    page * pageSize,
                    (page + 1) * pageSize,
                  );

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <Inbox
                            size={32}
                            className="mx-auto text-gray-300 mb-2"
                          />
                          <p className="text-gray-400 text-sm">
                            Sin resultados
                          </p>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <>
                      {paged.map((absence) => {
                        const absenceType = ABSENCE_TYPES.find(
                          (t) => t.value === absence.type,
                        );
                        return (
                          <tr
                            key={absence.id}
                            onClick={() => setSelectedAbsence(absence)}
                            className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {absence.user?.name || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {absence.startDate === absence.endDate
                                ? absence.startDate
                                : `${absence.startDate} → ${absence.endDate}`}
                            </td>
                            <td className="px-4 py-3">
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
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                  absence.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : absence.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {absence.status === "APPROVED" && (
                                  <CheckCircle2 size={10} />
                                )}
                                {absence.status === "PENDING" && (
                                  <Clock size={10} />
                                )}
                                {absence.status === "REJECTED" && (
                                  <XCircle size={10} />
                                )}
                                {absence.status === "APPROVED"
                                  ? "Aprobada"
                                  : absence.status === "PENDING"
                                    ? "Pendiente"
                                    : "Rechazada"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                              {absence.reason || "—"}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Pagination row */}
                      <tr>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400">
                              {filtered.length} resultado
                              {filtered.length !== 1 ? "s" : ""}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={page === 0}
                                onClick={() => setPage((p) => p - 1)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span className="text-xs text-gray-500">
                                {page + 1} / {totalPages}
                              </span>
                              <button
                                disabled={page + 1 >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      {/* Absence Detail Modal */}
      <AnimatePresence>
        {selectedAbsence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedAbsence(null)}
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
              {(() => {
                const absenceType = ABSENCE_TYPES.find(
                  (t) => t.value === selectedAbsence.type,
                );
                const Icon = absenceType?.icon || HelpCircle;
                return (
                  <>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
                            selectedAbsence.type === "MEDICAL"
                              ? "bg-rose-500"
                              : selectedAbsence.type === "VACATION"
                                ? "bg-blue-500"
                                : selectedAbsence.type === "PAID_LEAVE"
                                  ? "bg-amber-500"
                                  : "bg-gray-500"
                          }`}
                        >
                          <Icon size={16} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            Detalle de Ausencia
                          </h2>
                          <p className="text-xs text-gray-500">
                            {absenceType?.label || selectedAbsence.type}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedAbsence(null)}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50/80 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <User size={11} /> Empleado
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedAbsence.user?.name || "—"}
                          </p>
                        </div>
                        <div className="bg-gray-50/80 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Calendar size={11} /> Fecha
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedAbsence.startDate ===
                            selectedAbsence.endDate
                              ? selectedAbsence.startDate
                              : `${selectedAbsence.startDate} → ${selectedAbsence.endDate}`}
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      {selectedAbsence.reason && (
                        <div className="bg-gray-50/80 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <FileText size={11} /> Motivo
                          </p>
                          <p className="text-sm text-gray-700">
                            {selectedAbsence.reason}
                          </p>
                        </div>
                      )}

                      {/* Status badge */}
                      <div
                        className={`rounded-xl p-3 flex items-center gap-2 ${
                          selectedAbsence.status === "PENDING"
                            ? "bg-yellow-50/80 border border-yellow-200"
                            : selectedAbsence.status === "REJECTED"
                              ? "bg-red-50/80 border border-red-200"
                              : "bg-emerald-50/80 border border-emerald-200"
                        }`}
                      >
                        {selectedAbsence.status === "PENDING" && (
                          <>
                            <Clock size={16} className="text-yellow-600" />
                            <div>
                              <p className="text-sm font-medium text-yellow-700">
                                Pendiente de aprobación
                              </p>
                              <p className="text-xs text-yellow-600">
                                Un administrador debe aprobar esta solicitud
                              </p>
                            </div>
                          </>
                        )}
                        {selectedAbsence.status === "APPROVED" && (
                          <>
                            <CheckCircle2
                              size={16}
                              className="text-emerald-600"
                            />
                            <p className="text-sm font-medium text-emerald-700">
                              Aprobada
                            </p>
                          </>
                        )}
                        {selectedAbsence.status === "REJECTED" && (
                          <>
                            <XCircle size={16} className="text-red-600" />
                            <p className="text-sm font-medium text-red-700">
                              Rechazada
                            </p>
                          </>
                        )}
                      </div>

                      {/* Admin approve/reject for PENDING */}
                      {isAdmin && selectedAbsence.status === "PENDING" && (
                        <div className="border-t border-gray-100 pt-4 flex gap-3">
                          <button
                            onClick={() =>
                              handleStatusChange(selectedAbsence.id, "APPROVED")
                            }
                            disabled={changingStatus}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            <ShieldCheck size={16} />
                            {changingStatus ? "Procesando..." : "Aprobar"}
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(selectedAbsence.id, "REJECTED")
                            }
                            disabled={changingStatus}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            {changingStatus ? "Procesando..." : "Rechazar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
