import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import { PWARegister } from "@/components/PWARegister";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { Toaster } from "sileo";

export const metadata: Metadata = {
  title: "Control de Asistencia",
  description: "Sistema de control de llegada y asistencia",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-['Inter',sans-serif] antialiased">
        <AuthProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="text-center text-sm text-gray-400 py-4 border-t border-gray-100 mt-8">
            © {new Date().getFullYear()} AfroAg02. Todos los derechos
            reservados.
          </footer>
          <Toaster position="top-right" />
          <PWARegister />
          <PWAInstallButton />
        </AuthProvider>
      </body>
    </html>
  );
}
