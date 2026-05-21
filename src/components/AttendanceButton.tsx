"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, LogOut, CheckCircle2 } from "lucide-react";

interface Props {
  hasClockIn: boolean;
  hasClockOut: boolean;
  clockInTime?: string;
  clockOutTime?: string;
  onClock: () => Promise<void>;
}

export function AttendanceButton({ hasClockIn, hasClockOut, onClock }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClock();
    } finally {
      setLoading(false);
    }
  };

  if (hasClockIn && hasClockOut) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-200/50" />
        <div className="relative text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
          >
            <CheckCircle2
              size={56}
              className="mx-auto text-emerald-500"
              strokeWidth={1.5}
            />
          </motion.div>
          <p className="text-emerald-700 mt-3 text-sm font-semibold">
            Jornada completada
          </p>
        </div>
      </motion.div>
    );
  }

  const isClockIn = !hasClockIn;

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center shadow-2xl disabled:opacity-50 select-none group"
    >
      {/* Animated glow ring */}
      <motion.div
        className={`absolute -inset-1 rounded-full opacity-60 blur-lg ${
          isClockIn
            ? "bg-gradient-to-r from-emerald-400 to-teal-400"
            : "bg-gradient-to-r from-rose-400 to-pink-400"
        }`}
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main button */}
      <div
        className={`absolute inset-0 rounded-full ${
          isClockIn
            ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
            : "bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600"
        }`}
      />

      {/* Inner shine */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/20 to-transparent" />

      <div className="relative text-center text-white">
        <motion.div
          animate={loading ? { rotate: 360 } : {}}
          transition={
            loading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}
          }
        >
          {isClockIn ? (
            <LogIn size={48} className="mx-auto" strokeWidth={1.5} />
          ) : (
            <LogOut size={48} className="mx-auto" strokeWidth={1.5} />
          )}
        </motion.div>
        <p className="text-lg font-bold mt-3 drop-shadow-sm">
          {loading
            ? "Registrando..."
            : isClockIn
              ? "Registrar Entrada"
              : "Registrar Salida"}
        </p>
      </div>
    </motion.button>
  );
}
