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
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { generateSync } from "otplib";
import { sileo } from "sileo";
import { showAttendanceToast } from "@/lib/attendance-messages";

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
  const [cameraReady, setCameraReady] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedRef = useRef(false);
  const mountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  const processQrData = useCallback(
    async (decodedText: string) => {
      if (processedRef.current || verifying) return;
      processedRef.current = true;

      setVerifying(true);
      setError(null);
      stopScanning();

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
          const clockTime = data.action === "clockIn" ? data.clockIn : data.clockOut;
          showAttendanceToast(data.action, data.diffMin, clockTime);
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
    [verifying, stopScanning, timezone, onSuccess],
  );

  const scanFrame = useCallback(() => {
    if (processedRef.current || !webcamRef.current || !canvasRef.current)
      return;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      processQrData(code.data);
    }
  }, [processQrData]);

  const startScanning = useCallback(() => {
    stopScanning();
    scanIntervalRef.current = setInterval(scanFrame, 150);
  }, [scanFrame, stopScanning]);

  const handleUserMedia = useCallback(() => {
    if (!mountedRef.current) return;
    setCameraReady(true);
    setScanning(true);
    setCameraError(false);
    setError(null);
    startScanning();
  }, [startScanning]);

  const handleUserMediaError = useCallback((err: string | DOMException) => {
    if (!mountedRef.current) return;
    setCameraError(true);
    setCameraReady(false);

    const message = err instanceof DOMException ? err.message : String(err);

    if (message.includes("NotAllowedError") || message.includes("Permission")) {
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
  }, []);

  const [retryKey, setRetryKey] = useState(0);

  function handleRetry() {
    setCameraError(false);
    setCameraReady(false);
    setError(null);
    processedRef.current = false;
    setRetryKey((k) => k + 1);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    processedRef.current = false;

    try {
      stopScanning();
      setScanning(false);

      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        await processQrData(code.data);
      } else {
        setError(
          "No se pudo leer un código QR de la imagen. Asegúrate de que la foto sea clara y contenga el QR completo.",
        );
      }
    } catch {
      setError(
        "No se pudo leer un código QR de la imagen. Asegúrate de que la foto sea clara y contenga el QR completo.",
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    mountedRef.current = false;
    stopScanning();
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
          {/* Hidden canvas for QR decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera viewfinder */}
          {!success && !verifying && !cameraError && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
              <Webcam
                key={retryKey}
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: "environment",
                  width: { ideal: 640 },
                  height: { ideal: 640 },
                }}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                className="w-full h-full object-cover"
              />
              {/* Scan overlay */}
              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-3/4 border-2 border-white/40 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-indigo-400 rounded-tl-md" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-indigo-400 rounded-tr-md" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-indigo-400 rounded-bl-md" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-indigo-400 rounded-br-md" />
                    <motion.div
                      animate={{ y: ["0%", "100%", "0%"] }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute left-0 right-0 h-0.5 bg-indigo-400/60"
                    />
                  </div>
                </div>
              )}
              {/* Loading overlay while camera initializes */}
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 space-y-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full"
                  />
                  <p className="text-sm text-gray-300">Abriendo cámara...</p>
                </div>
              )}
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
                  onClick={handleRetry}
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
