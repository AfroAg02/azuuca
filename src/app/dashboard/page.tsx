"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserCheck,
  UserX,
  Download,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Timer,
  Pencil,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
  earnings: number | null;
  user: { name: string; hourlyRate: number };
}

interface DashboardStats {
  totalUsers: number;
  presentToday: number;
  absentToday: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate]);

  async function fetchDashboard(date: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecords(data.todayRecords);
      }
    } finally {
      setLoading(false);
    }
  }

  function navigateDate(offset: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  function isToday(date: string) {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return date === today;
  }

  function formatDateLabel(date: string) {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString("es", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function handleExport() {
    window.open(`/api/export?from=${fromDate}&to=${toDate}`, "_blank");
  }

  function openEditModal(record: AttendanceRecord) {
    setEditRecord(record);
    setEditClockIn(record.clockIn ? record.clockIn.substring(0, 5) : "");
    setEditClockOut(record.clockOut ? record.clockOut.substring(0, 5) : "");
  }

  async function handleSaveEdit() {
    if (!editRecord) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editRecord.userId,
          date: editRecord.date,
          clockIn: editClockIn ? editClockIn + ":00" : null,
          clockOut: editClockOut ? editClockOut + ":00" : null,
        }),
      });
      if (res.ok) {
        setEditRecord(null);
        fetchDashboard(selectedDate);
      }
    } finally {
      setSaving(false);
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

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen de asistencia</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatCard
          title="Total Usuarios"
          value={stats?.totalUsers || 0}
          icon={<Users size={22} />}
          gradient="gradient-card-blue"
        />
        <StatCard
          title="Presentes Hoy"
          value={stats?.presentToday || 0}
          icon={<UserCheck size={22} />}
          gradient="gradient-card-green"
        />
        <StatCard
          title="Ausentes Hoy"
          value={stats?.absentToday || 0}
          icon={<UserX size={22} />}
          gradient="gradient-card-red"
        />
      </motion.div>

      {/* Attendance Table with Date Navigation */}
      <motion.div variants={item} className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {isToday(selectedDate) ? "Asistencia de Hoy" : "Asistencia"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateDate(-1)}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </motion.button>
            <button
              onClick={() => {
                const d = new Date();
                setSelectedDate(
                  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                );
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                isToday(selectedDate)
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {formatDateLabel(selectedDate)}
            </button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigateDate(1)}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>
        {records.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No hay registros de asistencia hoy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Entrada
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Salida
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Horas
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Ganancia
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  {isAdmin && (
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {records.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full gradient-card-blue flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {r.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {r.user.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-gray-600">
                      {r.clockIn || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-gray-600">
                      {r.clockOut || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {r.hoursWorked !== null ? (
                        <span className="inline-flex items-center gap-1 font-mono font-medium text-indigo-600">
                          <Timer size={13} />
                          {r.hoursWorked.toFixed(2)}h
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {r.earnings !== null ? (
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-600">
                          <DollarSign size={13} />
                          {r.earnings.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {r.clockOut ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <CheckCircle2 size={12} />
                          Completado
                        </span>
                      ) : r.clockIn ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Trabajando
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                          <AlertCircle size={12} />
                          Ausente
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-sm">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openEditModal(r)}
                          className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors"
                          title="Editar horario"
                        >
                          <Pencil size={14} />
                        </motion.button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Export Section */}
      <motion.div variants={item} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Download size={18} className="text-emerald-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Exportar a Excel
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Desde
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all"
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Hasta
            </label>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all"
              />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-shadow flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Descargar Excel
          </motion.button>
        </div>
      </motion.div>

      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {editRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditRecord(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Pencil size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Editar Horario
                    </h3>
                    <p className="text-xs text-gray-500">
                      {editRecord.user.name} — {editRecord.date}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditRecord(null)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Hora de Entrada
                  </label>
                  <div className="relative">
                    <Clock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="time"
                      value={editClockIn}
                      onChange={(e) => setEditClockIn(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Hora de Salida
                  </label>
                  <div className="relative">
                    <Clock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="time"
                      value={editClockOut}
                      onChange={(e) => setEditClockOut(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditRecord(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? "Guardando..." : "Guardar"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`${gradient} rounded-2xl p-6 text-white shadow-xl relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            {icon}
          </div>
        </div>
        <p className="text-4xl font-extrabold">{value}</p>
      </div>
    </motion.div>
  );
}
