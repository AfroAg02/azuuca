"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  Monitor,
  Tablet,
  Share,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone: boolean }).standalone === true
  );
}

const steps = {
  android: [
    {
      step: 1,
      title: "Abre en Chrome",
      description:
        "Abre esta página en Google Chrome. Si estás en otro navegador, copia la URL y pégala en Chrome.",
    },
    {
      step: 2,
      title: "Toca el menú",
      description:
        "Toca el ícono de tres puntos verticales en la esquina superior derecha del navegador.",
      icon: <MoreVertical size={18} className="text-gray-600" />,
    },
    {
      step: 3,
      title: '"Instalar aplicación" o "Agregar a pantalla de inicio"',
      description:
        'Busca la opción "Instalar aplicación" o "Agregar a pantalla de inicio" en el menú desplegable.',
    },
    {
      step: 4,
      title: "Confirmar instalación",
      description:
        'Toca "Instalar" en el cuadro de diálogo que aparece. La app se agregará a tu pantalla de inicio.',
    },
  ],
  ios: [
    {
      step: 1,
      title: "Abre en Safari",
      description:
        "Esta página debe estar abierta en Safari. Si usas otro navegador, copia la URL y ábrela en Safari.",
    },
    {
      step: 2,
      title: "Toca el botón de compartir",
      description:
        "Toca el ícono de compartir (cuadro con flecha hacia arriba) en la barra inferior de Safari.",
      icon: <Share size={18} className="text-blue-500" />,
    },
    {
      step: 3,
      title: '"Agregar a pantalla de inicio"',
      description:
        'Desplázate hacia abajo en el menú y selecciona "Agregar a pantalla de inicio".',
    },
    {
      step: 4,
      title: 'Toca "Agregar"',
      description:
        'Confirma tocando "Agregar" en la esquina superior derecha. La app aparecerá como un ícono en tu pantalla de inicio.',
    },
  ],
  desktop: [
    {
      step: 1,
      title: "Abre en Chrome o Edge",
      description: "Abre esta página en Google Chrome o Microsoft Edge.",
    },
    {
      step: 2,
      title: "Busca el ícono de instalación",
      description:
        "En la barra de direcciones, busca el ícono de instalación (monitor con flecha) a la derecha. También puedes ir al menú del navegador.",
    },
    {
      step: 3,
      title: '"Instalar Control de Asistencia"',
      description:
        'Haz clic en el ícono o selecciona "Instalar Control de Asistencia" desde el menú.',
    },
    {
      step: 4,
      title: "Confirmar",
      description:
        'Haz clic en "Instalar" en el diálogo de confirmación. La app se abrirá en su propia ventana y aparecerá en tu menú de aplicaciones.',
    },
  ],
};

type Platform = "android" | "ios" | "desktop";

const platforms: { key: Platform; label: string; icon: typeof Smartphone }[] = [
  { key: "android", label: "Android", icon: Smartphone },
  { key: "ios", label: "iPhone / iPad", icon: Tablet },
  { key: "desktop", label: "Computadora", icon: Monitor },
];

export default function InstallPage() {
  const [selected, setSelected] = useState<Platform>("android");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // Auto-detect platform
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    if (
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) {
      setSelected("ios");
    } else if (/Android/.test(ua)) {
      setSelected("android");
    } else {
      setSelected("desktop");
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Download size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Instalar Aplicación
          </h1>
          <p className="text-sm text-gray-500">
            Accede rápidamente desde tu dispositivo
          </p>
        </div>
      </div>

      {/* Already installed */}
      {installed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl"
        >
          <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">
              ¡La app ya está instalada!
            </p>
            <p className="text-sm text-green-600">
              Puedes abrirla directamente desde tu pantalla de inicio o menú de
              aplicaciones.
            </p>
          </div>
        </motion.div>
      )}

      {/* Quick install button (if available) */}
      {deferredPrompt && !installed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 border border-blue-200 rounded-2xl"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-blue-800">
                Instalación rápida disponible
              </p>
              <p className="text-sm text-blue-600">
                Tu navegador soporta instalación directa.
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="px-5 py-2.5 text-sm font-medium text-white gradient-btn rounded-xl hover:opacity-90 transition-opacity flex-shrink-0"
            >
              Instalar ahora
            </button>
          </div>
        </motion.div>
      )}

      {/* Platform selector */}
      <div className="flex gap-2">
        {platforms.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              selected === key
                ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 shadow-sm"
                : "text-gray-500 hover:bg-gray-50 border border-transparent"
            }`}
          >
            <Icon size={18} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps[selected].map((item, i) => (
          <motion.div
            key={`${selected}-${item.step}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{item.step}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                {item.title}
                {"icon" in item && item.icon}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <h3 className="font-semibold text-amber-800 text-sm mb-2">
          💡 Consejos
        </h3>
        <ul className="text-sm text-amber-700 space-y-1.5">
          <li>• La app funciona sin conexión para las funciones básicas.</li>
          <li>• Recibirás la misma experiencia que una app nativa.</li>
          <li>
            • Puedes desinstalarla en cualquier momento como cualquier otra app.
          </li>
          {selected === "ios" && (
            <li>
              • En iOS, solo funciona con Safari. Chrome y otros navegadores no
              permiten instalar PWAs.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
