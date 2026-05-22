"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Trash2,
  Users,
  Mail,
  Lock,
  User,
  Shield,
  X,
  AlertTriangle,
  DollarSign,
  Pencil,
  Check,
  CalendarDays,
  Save,
} from "lucide-react";
import { LeaveRequestModal } from "@/components/calendar/LeaveRequestModal";
import { sileo } from "sileo";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  hourlyRate: number;
  createdAt: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [hourlyRate, setHourlyRate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  // Edit user modal
  const [editModalUser, setEditModalUser] = useState<UserData | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("USER");
  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Absence modal
  const [absenceUserId, setAbsenceUserId] = useState<string | null>(null);
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
      else
        sileo.error({
          title: "Error al cargar",
          description: "No se pudieron obtener los usuarios",
        });
    } catch {
      sileo.error({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
      });
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        hourlyRate: hourlyRate || "0",
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      setHourlyRate("");
      sileo.success({
        title: "Usuario creado",
        description: "El nuevo usuario fue registrado",
      });
      fetchUsers();
    } else {
      const data = await res.json();
      setError(data.error || "Error al crear usuario");
      sileo.error({
        title: "Error al crear",
        description: data.error || "No se pudo crear el usuario",
      });
    }
  }

  async function handleDelete(id: string, userName: string) {
    if (!confirm(`¿Eliminar al usuario "${userName}"?`)) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      sileo.success({
        title: "Usuario eliminado",
        description: `"${userName}" fue eliminado`,
      });
      fetchUsers();
    } else {
      const data = await res.json();
      sileo.error({
        title: "Error al eliminar",
        description: data.error || "No se pudo eliminar el usuario",
      });
    }
  }

  function startEditRate(user: UserData) {
    setEditingId(user.id);
    setEditRate(String(user.hourlyRate));
  }

  async function saveRate(userId: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hourlyRate: editRate }),
    });
    if (res.ok) {
      setEditingId(null);
      sileo.success({ title: "Tarifa actualizada" });
      fetchUsers();
    } else {
      sileo.error({
        title: "Error al actualizar",
        description: "No se pudo guardar la tarifa",
      });
    }
  }

  function openEditModal(user: UserData) {
    setEditModalUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRole(user.role);
    setEditHourlyRate(String(user.hourlyRate));
    setEditError("");
  }

  function closeEditModal() {
    setEditModalUser(null);
    setEditError("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModalUser) return;
    setEditError("");
    setEditSaving(true);

    const payload: Record<string, string | number> = {
      name: editName,
      email: editEmail,
      role: editRole,
      hourlyRate: parseFloat(editHourlyRate) || 0,
    };
    if (editPassword) payload.password = editPassword;

    const res = await fetch(`/api/users/${editModalUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      closeEditModal();
      sileo.success({
        title: "Usuario actualizado",
        description: "Los datos fueron guardados",
      });
      fetchUsers();
    } else {
      const data = await res.json();
      setEditError(data.error || "Error al actualizar");
      sileo.error({
        title: "Error al actualizar",
        description: data.error || "No se pudieron guardar los cambios",
      });
    }
    setEditSaving(false);
  }

  function openAbsenceModal(userId: string) {
    setAbsenceUserId(userId);
    setAbsenceModalOpen(true);
  }

  async function handleCreateAbsence(data: {
    startDate: string;
    endDate: string;
    type: string;
    reason: string;
    userId?: string;
    hours?: number;
  }) {
    const payload = { ...data, userId: absenceUserId };
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      sileo.error({
        title: "Error al registrar",
        description: err.error || "No se pudo registrar la ausencia",
      });
      throw new Error(err.error || "Error al registrar la ausencia");
    }
    sileo.success({
      title: "Ausencia registrada",
      description: "La ausencia fue guardada correctamente",
    });
  }

  if (loading) {
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

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Usuarios
            </h1>
            <p className="text-sm text-gray-500">
              {users.length} usuarios registrados
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg ${
            showForm
              ? "bg-gray-100 text-gray-700 shadow-none hover:bg-gray-200"
              : "gradient-btn text-white shadow-blue-500/25 hover:shadow-blue-500/40"
          }`}
        >
          {showForm ? (
            <>
              <X size={18} /> Cancelar
            </>
          ) : (
            <>
              <UserPlus size={18} /> Nuevo Usuario
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-500" />
                Crear Usuario
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2"
                  >
                    <AlertTriangle size={16} />
                    {error}
                  </motion.div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Nombre
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Rol
                    </label>
                    <div className="relative">
                      <Shield
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all appearance-none"
                      >
                        <option value="USER">Usuario</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="gradient-btn text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  Crear Usuario
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <motion.div variants={item} className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tarifa/Hora
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {users.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-5 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          user.role === "ADMIN"
                            ? "gradient-card-purple"
                            : "gradient-card-blue"
                        }`}
                      >
                        <span className="text-white text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-gradient-to-r from-violet-100 to-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Shield size={11} />
                      {user.role === "ADMIN" ? "Admin" : "Usuario"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-24">
                          <DollarSign
                            size={13}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRate(user.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="w-full pl-6 pr-2 py-1.5 text-sm bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500/40 outline-none font-mono"
                            autoFocus
                          />
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => saveRate(user.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Check size={15} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X size={15} />
                        </motion.button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditRate(user)}
                        className="inline-flex items-center gap-1.5 font-mono font-medium text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors group/rate"
                      >
                        <DollarSign size={13} />
                        {user.hourlyRate.toFixed(2)}
                        <Pencil
                          size={12}
                          className="text-gray-400 opacity-0 group-hover/rate:opacity-100 transition-opacity"
                        />
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openEditModal(user)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Editar usuario"
                      >
                        <Pencil size={16} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openAbsenceModal(user.id)}
                        className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Registrar ausencia"
                      >
                        <CalendarDays size={16} />
                      </motion.button>
                      {(session?.user as any)?.id !== user.id && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editModalUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              className="w-full max-w-lg glass-strong rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Pencil size={16} className="text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Editar Usuario
                  </h2>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                {editError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2"
                  >
                    <AlertTriangle size={16} />
                    {editError}
                  </motion.div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Nombre
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Dejar vacío para no cambiar"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Rol
                    </label>
                    <div className="relative">
                      <Shield
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all appearance-none text-sm"
                      >
                        <option value="USER">Usuario</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Tarifa por hora
                    </label>
                    <div className="relative">
                      <DollarSign
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editHourlyRate}
                        onChange={(e) => setEditHourlyRate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-5 py-2.5 text-sm font-medium text-white gradient-btn rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save size={16} />
                    {editSaving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Absence Modal */}
      <LeaveRequestModal
        isOpen={absenceModalOpen}
        onClose={() => setAbsenceModalOpen(false)}
        onSubmit={handleCreateAbsence}
        isAdmin={true}
      />
    </motion.div>
  );
}
