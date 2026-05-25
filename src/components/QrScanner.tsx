"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, X, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { generateSync } from "otplib";
import { sileo } from "sileo";

interface Props {
  onSuccess: (action: string, message: string) => void;
  onClose: () => void;
}

export function QrScanner({ onSuccess, onClose }: Props) {
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processedRef = useRef(false);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (processedRef.current || verifying) return;
      processedRef.current = true;

      setVerifying(true);
      setError(null);

      try {
        // Parse QR payload
        let payload: { siteId: string; secret: string; app?: string };
        try {
          payload = JSON.parse(decodedText);
        } catch {
          setError("Código QR no válido");
          setVerifying(false);
          processedRef.current = false;
          return;
        }

        if (!payload.siteId || !payload.secret || payload.app !== "azuuca") {
          setError("Este código QR no es de Azuuca");
          setVerifying(false);
          processedRef.current = false;
          return;
        }

        // Generate TOTP from the scanned secret
        const totpCode = generateSync({ secret: payload.secret });

        // Stop scanner before API call
        await stopScanner();
        setScanning(false);

        // Send to server for verification
        const res = await fetch("/api/attendance/qr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-timezone": timezone,
          },
          body: JSON.stringify({
            siteId: payload.siteId,
            totp: totpCode,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess(data.message);
          sileo.success({
            title:
              data.action === "clockIn"
                ? "Entrada registrada"
                : data.action === "clockOut"
                  ? "Salida registrada"
                  : "Asistencia",
            description: data.message,
          });
          setTimeout(() => {
            onSuccess(data.action, data.message);
          }, 1500);
        } else {
          setError(data.error || "Error al verificar");
          processedRef.current = false;
        }
      } catch {
        setError("Error de conexión. Intenta de nuevo.");
        processedRef.current = false;
      } finally {
        setVerifying(false);
      }
    },
    [verifying, stopScanner, timezone, onSuccess],
  );

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  async function startScanner() {
    setError(null);
    setSuccess(null);
    processedRef.current = false;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        handleScan,
        () => {}, // ignore scan failures
      );

      setScanning(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      if (message.includes("Permission")) {
        setError("Necesitas permitir el acceso a la cámara");
      } else {
        setError("No se pudo iniciar la cámara: " + message);
      }
    }
  }

  function handleClose() {
    stopScanner();
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <ScanLine size={16} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Escanear QR</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {!scanning && !success && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Camera size={36} className="text-indigo-400" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Escanea el código QR del lugar de trabajo para registrar tu
                asistencia
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startScanner}
                className="px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow flex items-center gap-2"
              >
                <Camera size={18} />
                Abrir Cámara
              </motion.button>
            </div>
          )}

          <div
            id="qr-reader"
            className={`rounded-xl overflow-hidden ${scanning ? "" : "hidden"}`}
          />

          {verifying && (
            <div className="flex flex-col items-center py-6 space-y-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full"
              />
              <p className="text-sm text-gray-600 font-medium">
                Verificando código...
              </p>
            </div>
          )}

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-6 space-y-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <CheckCircle2
                    size={48}
                    className="text-emerald-500"
                    strokeWidth={1.5}
                  />
                </motion.div>
                <p className="text-sm text-emerald-700 font-semibold text-center">
                  {success}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
            >
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </motion.div>
          )}

          {scanning && !verifying && (
            <p className="text-xs text-gray-400 text-center mt-3">
              Apunta la cámara al código QR del trabajo
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
