"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Settings,
  Clock,
  Save,
  DollarSign,
  QrCode,
  RefreshCw,
  Download,
  Shield,
  ShieldOff,
  Printer,
} from "lucide-react";
import { sileo } from "sileo";

interface QrConfigData {
  siteId: string;
  enabled: boolean;
  qrDataUrl: string;
  createdAt: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clockInTime, setClockInTime] = useState("09:00");
  const [clockOutTime, setClockOutTime] = useState("18:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrConfig, setQrConfig] = useState<QrConfigData | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session]);

  useEffect(() => {
    fetchConfig();
    fetchQrConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setClockInTime(data.clockInTime);
        setClockOutTime(data.clockOutTime);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (clockOutTime <= clockInTime) {
      sileo.error({
        title: "Horario inválido",
        description:
          "La hora de salida debe ser posterior a la hora de entrada",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clockInTime, clockOutTime }),
      });
      if (res.ok) {
        sileo.success({
          title: "Configuración guardada",
          description: "El horario global fue actualizado",
        });
      } else {
        const err = await res.json().catch(() => null);
        sileo.error({
          title: "Error",
          description: err?.error || "No se pudo guardar la configuración",
        });
      }
    } catch {
      sileo.error({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
      });
    } finally {
      setSaving(false);
    }
  }

  async function fetchQrConfig() {
    try {
      const res = await fetch("/api/qr/config");
      if (res.ok) {
        const data = await res.json();
        setQrConfig(data);
      }
    } catch {
      // silently fail
    } finally {
      setQrLoading(false);
    }
  }

  async function handleRegenerateQr() {
    if (
      !confirm(
        "¿Regenerar el código QR? El anterior dejará de funcionar y tendrás que imprimir uno nuevo.",
      )
    )
      return;

    setRegenerating(true);
    try {
      const res = await fetch("/api/qr/config", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setQrConfig(data);
        sileo.success({
          title: "QR regenerado",
          description: "Recuerda imprimir el nuevo código",
        });
      } else {
        sileo.error({ title: "Error al regenerar QR" });
      }
    } catch {
      sileo.error({ title: "Error de conexión" });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleToggleQr() {
    if (!qrConfig) return;
    setToggling(true);
    try {
      const res = await fetch("/api/qr/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !qrConfig.enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setQrConfig((prev) =>
          prev ? { ...prev, enabled: data.enabled } : null,
        );
        sileo.success({
          title: data.enabled
            ? "Verificación QR activada"
            : "Verificación QR desactivada",
        });
      }
    } catch {
      sileo.error({ title: "Error de conexión" });
    } finally {
      setToggling(false);
    }
  }

  function handleDownloadQr() {
    if (!qrConfig?.qrDataUrl) return;
    const link = document.createElement("a");
    link.download = "azuuca-qr-asistencia.png";
    link.href = qrConfig.qrDataUrl;
    link.click();
  }

  function handlePrintQr() {
    if (!qrConfig?.qrDataUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Asistencia - Azuuca</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            img { width: 300px; height: 300px; }
            h2 { color: #1e293b; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; margin-top: 4px; }
          </style>
        </head>
        <body>
          <h2>Escanea para registrar asistencia</h2>
          <img src="${qrConfig.qrDataUrl}" alt="QR Asistencia" />
          <p>Azuuca - Control de Asistencia</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  if (status === "loading" || loading) {
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

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg shadow-gray-500/20">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500">Ajustes globales del sistema</p>
        </div>
      </motion.div>

      {/* Schedule Config */}
      <motion.div variants={item} className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100/50 flex items-center gap-2">
          <Clock size={18} className="text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Horario Laboral
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Establece el horario de entrada y salida esperado. Los reportes
            mostrarán los minutos de diferencia respecto a estas horas para cada
            empleado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  value={clockInTime}
                  onChange={(e) => setClockInTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all font-mono text-lg"
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
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition-all font-mono text-lg"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Guardando..." : "Guardar Horario"}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* QR Code Attendance */}
      <motion.div variants={item} className="glass rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100/50 flex items-center gap-2">
          <QrCode size={18} className="text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Verificación QR de Asistencia
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Genera un código QR fijo para imprimir en el lugar de trabajo. Los
            empleados escanean este código desde la app para registrar su
            asistencia con verificación temporal (código que cambia cada 30
            segundos).
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              {qrConfig?.enabled ? (
                <Shield size={20} className="text-emerald-600" />
              ) : (
                <ShieldOff size={20} className="text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-800 text-sm">
                  Verificación QR obligatoria
                </p>
                <p className="text-xs text-gray-500">
                  Los empleados deben escanear el QR para registrar
                  entrada/salida
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleQr}
              disabled={toggling || qrLoading}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                qrConfig?.enabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <motion.div
                layout
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                style={{
                  left: qrConfig?.enabled ? "calc(100% - 26px)" : "2px",
                }}
              />
            </button>
          </div>

          {/* QR Display */}
          {qrLoading ? (
            <div className="flex justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {qrConfig?.qrDataUrl ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100">
                    <img
                      src={qrConfig.qrDataUrl}
                      alt="QR Asistencia"
                      className="w-56 h-56 sm:w-64 sm:h-64"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    ID del sitio: {qrConfig.siteId}
                  </p>
                </>
              ) : (
                <div className="w-56 h-56 bg-gray-100 rounded-xl flex items-center justify-center">
                  <QrCode size={48} className="text-gray-300" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadQr}
                  disabled={!qrConfig?.qrDataUrl}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Download size={16} />
                  Descargar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePrintQr}
                  disabled={!qrConfig?.qrDataUrl}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-50 border border-purple-200 text-purple-600 hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  <Printer size={16} />
                  Imprimir
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRegenerateQr}
                  disabled={regenerating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={regenerating ? "animate-spin" : ""}
                  />
                  {regenerating ? "Regenerando..." : "Regenerar"}
                </motion.button>
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
            <p className="text-sm font-medium text-blue-800">¿Cómo funciona?</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Imprime este código QR y colócalo en el lugar de trabajo</li>
              <li>
                Los empleados abren la app y escanean el QR con el botón de
                escáner
              </li>
              <li>
                Se genera un código temporal (cambia cada 30s) que verifica la
                presencia
              </li>
              <li>
                Si el código es válido, se registra automáticamente la
                entrada/salida
              </li>
            </ol>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              <strong>Importante:</strong> Si regeneras el QR, el anterior
              dejará de funcionar. Deberás imprimir y colocar el nuevo código.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
