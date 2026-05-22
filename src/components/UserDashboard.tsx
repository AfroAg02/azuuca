"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  CalendarCheck,
  Activity,
  CalendarOff,
  Timer,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface DayRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number | null;
}

interface UserDashboardData {
  daysWorked: number;
  status: "not_started" | "working" | "completed";
  monthAbsences: number;
  totalHours: number;
  days: DayRecord[];
  month: number;
  year: number;
}

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const STATUS_CONFIG = {
  not_started: {
    label: "Sin registrar",
    color: "text-gray-600",
    bg: "bg-gray-100",
    dot: "bg-gray-400",
  },
  working: {
    label: "Trabajando",
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    dot: "bg-emerald-500 animate-pulse",
  },
  completed: {
    label: "Jornada completada",
    color: "text-blue-700",
    bg: "bg-blue-100",
    dot: "bg-blue-500",
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const weekday = d.toLocaleDateString("es", { weekday: "short" });
  const day = d.getDate();
  return { weekday, day };
}

export function UserDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    fetchData();
  }, [month]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/me?year=${year}&month=${month}`, {
        headers: { "x-timezone": timezone },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    setMonth((m) => (m <= 1 ? 12 : m - 1));
  }

  function nextMonth() {
    setMonth((m) => (m >= 12 ? 1 : m + 1));
  }

  if (loading && !data) {
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

  if (!data) return null;

  const statusCfg = STATUS_CONFIG[data.status];

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
          <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen de tu actividad</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {/* Days worked */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="gradient-card-blue rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80">
                Días trabajados este mes
              </p>
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <CalendarCheck size={22} />
              </div>
            </div>
            <p className="text-4xl font-extrabold">{data.daysWorked}</p>
          </div>
        </motion.div>

        {/* Current status */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="gradient-card-green rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80">Estado actual</p>
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Activity size={22} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
              <p className="text-lg font-bold">{statusCfg.label}</p>
            </div>
          </div>
        </motion.div>

        {/* Absences this month */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="gradient-card-red rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white/80">
                Ausencias este mes
              </p>
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <CalendarOff size={22} />
              </div>
            </div>
            <p className="text-4xl font-extrabold">{data.monthAbsences}</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Hours Summary Table */}
      <motion.div variants={item} className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Resumen de Horas
            </h2>
            <span className="text-xs text-gray-400 ml-1">
              Total:{" "}
              <span className="font-mono font-bold text-indigo-600">
                {data.totalHours.toFixed(1)}h
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </motion.button>
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 min-w-[130px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full"
            />
          </div>
        ) : data.days.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No hay registros este mes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Día
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {data.days.map((day, i) => {
                  const { weekday, day: dayNum } = formatDayLabel(day.date);
                  return (
                    <motion.tr
                      key={day.date}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">
                            {dayNum}
                          </span>
                          <span className="text-gray-500 capitalize text-xs">
                            {weekday}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-600">
                        {day.clockIn ? day.clockIn.substring(0, 5) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-gray-600">
                        {day.clockOut ? day.clockOut.substring(0, 5) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        {day.hoursWorked !== null ? (
                          <span className="inline-flex items-center gap-1 font-mono font-medium text-indigo-600">
                            <Timer size={13} />
                            {day.hoursWorked.toFixed(2)}h
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50/80 font-semibold">
                  <td colSpan={3} className="px-5 py-3.5 text-sm text-gray-700">
                    Total del mes
                  </td>
                  <td className="px-5 py-3.5 text-sm">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700">
                      <Timer size={14} />
                      {data.totalHours.toFixed(2)}h
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
