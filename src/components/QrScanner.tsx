"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  SwitchCamera,
} from "lucide-react";
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
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processedRef = useRef(false);
  const mountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  const processQrData = useCallback(
    async (decodedText: string) => {
      if (processedRef.current || verifying) return;
      processedRef.current = true;

      setVerifying(true);
      setError(null);

      try {
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

        const totpCode = generateSync({ secret: payload.secret });

        await stopScanner();
        setScanning(false);

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

        if (!mountedRef.current) return;

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
            if (mountedRef.current) onSuccess(data.action, data.message);
          }, 1500);
        } else {
          setError(data.error || "Error al verificar");
          processedRef.current = false;
        }
      } catch {
        if (mountedRef.current) {
          setError("Error de conexión. Intenta de nuevo.");
          processedRef.current = false;
        }
      } finally {
        if (mountedRef.current) setVerifying(false);
      }
    },
    [verifying, stopScanner, timezone, onSuccess],
  );

  const startScanner = useCallback(async () => {
    setError(null);
    setCameraError(false);
    processedRef.current = false;

    try {
      // Verify camera is available
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError(true);
        setError(
          "No se detectó ninguna cámara. Usa la opción de subir una foto.",
        );
        return;
      }

      const scanner = new Html5Qrcode("qr-reader", {
        verbose: false,
      });
      scannerRef.current = scanner;

      // Use back camera on mobile, any camera on desktop
      const cameraConfig: Parameters<typeof scanner.start>[0] = {
        facingMode: "environment",
      };

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
            return { width: size, height: size };
          },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => processQrData(decodedText),
        () => {},
      );

      if (mountedRef.current) setScanning(true);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setCameraError(true);

      if (
        message.includes("NotAllowedError") ||
        message.includes("Permission")
      ) {
        setError(
          "Permiso de cámara denegado. Permite el acceso en la configuración de tu navegador, o sube una foto del QR.",
        );
      } else if (
        message.includes("NotFoundError") ||
        message.includes("DevicesNotFoundError")
      ) {
        setError("No se encontró una cámara. Usa la opción de subir una foto.");
      } else if (
        message.includes("NotReadableError") ||
        message.includes("TrackStartError")
      ) {
        setError(
          "La cámara está en uso por otra app. Ciérrala e intenta de nuevo, o sube una foto.",
        );
      } else {
        setError(
          "No se pudo abrir la cámara. Usa la opción de subir una foto del QR.",
        );
      }
    }
  }, [processQrData]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    processedRef.current = false;

    try {
      // Stop camera if running
      await stopScanner();
      setScanning(false);

      const scanner = new Html5Qrcode("qr-file-reader");
      const result = await scanner.scanFile(file, /* showImage */ false);
      scanner.clear();
      await processQrData(result);
    } catch {
      setError(
        "No se pudo leer un código QR de la imagen. Asegúrate de que la foto sea clara y contenga el QR completo.",
      );
    }

    // Reset file input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Auto-start camera on mount
  useEffect(() => {
    mountedRef.current = true;
    // Small delay to ensure the DOM element is rendered
    const timer = setTimeout(() => {
      if (mountedRef.current) startScanner();
    }, 300);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    mountedRef.current = false;
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
          {/* Camera viewfinder */}
          <div
            id="qr-reader"
            className={`rounded-xl overflow-hidden ${scanning ? "" : "hidden"}`}
          />

          {/* Hidden element for file scanning */}
          <div id="qr-file-reader" className="hidden" />

          {/* Loading camera */}
          {!scanning && !success && !verifying && !cameraError && (
            <div className="flex flex-col items-center py-8 space-y-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full"
              />
              <p className="text-sm text-gray-500">Abriendo cámara...</p>
            </div>
          )}

          {/* Camera failed — show upload option prominently */}
          {cameraError && !success && !verifying && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
                <Camera size={32} className="text-orange-400" />
              </div>
              <div className="space-y-3 w-full">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCameraError(false);
                    setError(null);
                    startScanner();
                  }}
                  className="w-full px-5 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <SwitchCamera size={18} />
                  Reintentar cámara
                </motion.button>
              </div>
            </div>
          )}

          {/* Verifying */}
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

          {/* Success */}
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

          {/* Error */}
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

          {/* Upload photo button — always visible when not in success state */}
          {!success && !verifying && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture={undefined}
                onChange={handleFileUpload}
                className="hidden"
                id="qr-file-input"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-5 py-3 rounded-xl text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <ImagePlus size={18} />
                Subir foto del QR
              </motion.button>
              <p className="text-xs text-gray-400 text-center mt-2">
                {scanning
                  ? "Apunta la cámara al código QR, o sube una foto"
                  : "Selecciona una foto de tu galería con el código QR"}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
