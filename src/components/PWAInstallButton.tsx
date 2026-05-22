"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone: boolean }).standalone === true
  );
}

const IOS_DISMISS_KEY = "pwa-ios-banner-dismissed";

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // iOS: show manual instructions banner
    if (isIOS()) {
      const dismissed = sessionStorage.getItem(IOS_DISMISS_KEY);
      if (!dismissed) {
        setTimeout(() => setShowIOSBanner(true), 2000);
      }
      return;
    }

    // Android/Desktop: use beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const dismissIOSBanner = () => {
    setShowIOSBanner(false);
    sessionStorage.setItem(IOS_DISMISS_KEY, "1");
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {/* Android/Desktop install banner */}
      {showBanner && deferredPrompt && (
        <motion.div
          key="android-banner"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", bounce: 0.25 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl gradient-btn flex items-center justify-center flex-shrink-0">
                <Download className="text-white" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Instalar aplicación
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Instala Control de Asistencia en tu dispositivo para acceso
                  rápido sin navegador.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white gradient-btn rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Instalar
                  </button>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Ahora no
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* iOS install instructions banner */}
      {showIOSBanner && (
        <motion.div
          key="ios-banner"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", bounce: 0.25 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl gradient-btn flex items-center justify-center flex-shrink-0">
                <Download className="text-white" size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Instalar en iPhone
                </h3>
                <div className="text-xs text-gray-500 mt-1 space-y-1.5">
                  <p className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">1.</span>
                    Toca el botón compartir
                    <Share size={14} className="text-blue-500 inline" />
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">2.</span>
                    Selecciona{" "}
                    <span className="font-medium text-gray-700">
                      &quot;Agregar a pantalla de inicio&quot;
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">3.</span>
                    Toca{" "}
                    <span className="font-medium text-gray-700">
                      &quot;Agregar&quot;
                    </span>
                  </p>
                </div>
                <button
                  onClick={dismissIOSBanner}
                  className="w-full mt-3 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Entendido
                </button>
              </div>
              <button
                onClick={dismissIOSBanner}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small install button for use in the Navbar */
export function PWAInstallNavButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isiOS, setIsiOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    if (isIOS()) {
      setIsiOS(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isiOS) {
      setShowIOSTip((v) => !v);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || (!deferredPrompt && !isiOS)) return null;

  return (
    <div className="relative">
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50"
        title="Instalar aplicación"
      >
        <Download size={16} />
        <span className="hidden md:inline">Instalar</span>
      </button>

      {/* iOS tooltip */}
      <AnimatePresence>
        {showIOSTip && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50"
          >
            <p className="text-xs font-semibold text-gray-900 mb-2">
              Instalar en iPhone/iPad
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                1. Toca <Share size={12} className="inline text-blue-500" />{" "}
                (compartir)
              </p>
              <p>
                2.{" "}
                <span className="font-medium">
                  &quot;Agregar a pantalla de inicio&quot;
                </span>
              </p>
              <p>
                3. Toca <span className="font-medium">&quot;Agregar&quot;</span>
              </p>
            </div>
            <button
              onClick={() => setShowIOSTip(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
