"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  LayoutDashboard,
  Users,
  CalendarOff,
  CalendarDays,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { PWAInstallNavButton } from "./PWAInstallButton";

const iconMap: Record<string, React.ReactNode> = {
  "/": <Home size={18} />,
  "/dashboard": <LayoutDashboard size={18} />,
  "/users": <Users size={18} />,
  "/calendar": <CalendarDays size={18} />,
  "/absences": <CalendarOff size={18} />,
  "/profile": <UserCircle size={18} />,
};

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session || pathname === "/login") return null;

  const isAdmin = session.user?.role === "ADMIN";

  const links = [
    { href: "/", label: "Inicio" },
    ...(isAdmin
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/users", label: "Usuarios" },
        ]
      : []),
    { href: "/calendar", label: "Calendario" },
    { href: "/absences", label: "Ausencias" },
    { href: "/profile", label: "Perfil" },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center group">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={120}
                height={36}
                className="group-hover:opacity-80 transition-opacity"
              />
            </Link>
            <div className="hidden sm:flex sm:ml-8 sm:space-x-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    pathname === link.href
                      ? "text-blue-700"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {pathname === link.href && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {iconMap[link.href]}
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <PWAInstallNavButton />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/80">
              <div className="w-6 h-6 rounded-full gradient-btn flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {session.user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {session.user?.name}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden overflow-hidden"
            >
              <div className="pb-4 space-y-1">
                <div className="flex items-center px-3 py-2 mb-2">
                  <Image src="/logo.svg" alt="Logo" width={100} height={30} />
                </div>
                {links.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        pathname === link.href
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {iconMap[link.href]}
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <PWAInstallNavButton />
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="w-7 h-7 rounded-full gradient-btn flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {session.user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {session.user?.name}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
