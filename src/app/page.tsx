"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  UserX,
  X,
  Save,
} from "lucide-react";
import { AttendanceButton } from "@/components/AttendanceButton";

interface AttendanceData {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
}

export default function HomePage() {
  const { data: session } = useSession();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAbsence, setShowAbsence] = useState(false);
  const [absenceType, setAbsenceType] = useState("ILLNESS");
  const [absenceReason, setAbsenceReason] = useState("");
  const [savingAbsence, setSavingAbsence] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function fetchTodayAttendance() {
    try {
      const res = await fetch("/api/attendance", {
        headers: { "x-timezone": timezone },
      });
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClock() {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "x-timezone": timezone },
    });
    if (res.ok) {
      const data = await res.json();
      setAttendance(data);
    }
  }

  const dateStr = currentTime.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = currentTime.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const hasClockIn = !!attendance?.clockIn;
  const hasClockOut = !!attendance?.clockOut;

  function getTodayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  async function handleRegisterAbsence() {
    setSavingAbsence(true);
    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getTodayStr(),
          type: absenceType,
          reason: absenceReason,
        }),
      });
      if (res.ok) {
        setShowAbsence(false);
        setAbsenceReason("");
        setAbsenceType("ILLNESS");
      }
    } finally {
      setSavingAbsence(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
      {/* Date & Time */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-base text-gray-500 capitalize font-medium">
          {dateStr}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <Clock size={28} className="text-indigo-400" />
          <p className="text-5xl sm:text-7xl font-extrabold gradient-text font-mono tracking-tight">
            {timeStr}
          </p>
        </div>
      </motion.div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <p className="text-xl text-gray-600">
          Hola,{" "}
          <span className="font-bold text-gray-800">{session?.user?.name}</span>
        </p>
      </motion.div>

      {/* Clock Button */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", bounce: 0.4 }}
      >
        <AttendanceButton
          hasClockIn={hasClockIn}
          hasClockOut={hasClockOut}
          clockInTime={attendance?.clockIn || undefined}
          clockOutTime={attendance?.clockOut || undefined}
          onClock={handleClock}
        />
      </motion.div>

      {/* Absence Button */}
      {!hasClockIn && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAbsence(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 transition-colors"
        >
          <UserX size={18} />
          Registrar Ausencia
        </motion.button>
      )}

      {/* Today's Record Card */}
      {hasClockIn && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6 w-full max-w-sm"
        >
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            Registro de hoy
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <ArrowDownCircle size={18} />
                <span className="text-sm font-medium">Entrada</span>
              </div>
              <span className="font-mono font-bold text-emerald-700">
                {attendance!.clockIn}
              </span>
            </div>
            {hasClockOut && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/80 border border-rose-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <ArrowUpCircle size={18} />
                  <span className="text-sm font-medium">Salida</span>
                </div>
                <span className="font-mono font-bold text-rose-700">
                  {attendance!.clockOut}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Absence Modal */}
      <AnimatePresence>
        {showAbsence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAbsence(false)}
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
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <UserX size={16} className="text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    Registrar Ausencia
                  </h3>
                </div>
                <button
                  onClick={() => setShowAbsence(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Tipo de ausencia
                  </label>
                  <select
                    value={absenceType}
                    onChange={(e) => setAbsenceType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 outline-none transition-all"
                  >
                    <option value="ILLNESS">Enfermedad</option>
                    <option value="EVENT">Evento</option>
                    <option value="PLANNED">Planeada</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    placeholder="Describe el motivo de tu ausencia..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 outline-none transition-all resize-none"
                  />
                </div>
              </div>
              <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAbsence(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRegisterAbsence}
                  disabled={savingAbsence}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-shadow flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  {savingAbsence ? "Guardando..." : "Registrar"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
