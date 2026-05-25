"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  View,
  SlotInfo,
  Event,
} from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Columns,
} from "lucide-react";
import { LeaveRequestModal, LEAVE_TYPES } from "./LeaveRequestModal";
import { LeaveDetailModal } from "./LeaveDetailModal";
import { sileo } from "sileo";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface LeaveRequestData {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  hours: number | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  creator: { name: string };
}

interface CalendarEvent extends Event {
  id: string;
  resource: LeaveRequestData;
}

const TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  VACATION: { bg: "#10b981", border: "#059669" },
  MEDICAL: { bg: "#f43f5e", border: "#e11d48" },
  PAID_LEAVE: { bg: "#3b82f6", border: "#2563eb" },
  UNJUSTIFIED: { bg: "#6b7280", border: "#4b5563" },
  HOLIDAY: { bg: "#f59e0b", border: "#d97706" },
};

const VIEW_OPTIONS: { key: View; label: string; icon: typeof LayoutGrid }[] = [
  { key: "month", label: "Mes", icon: LayoutGrid },
  { key: "week", label: "Semana", icon: Columns },
  { key: "agenda", label: "Agenda", icon: List },
];

const messages = {
  allDay: "Todo el día",
  previous: "Anterior",
  next: "Siguiente",
  today: "Hoy",
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "No hay ausencias en este rango.",
  showMore: (total: number) => `+${total} más`,
};

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function CalendarView() {
  const { data: session } = useSession();
  const [view, setView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestData | null>(
    null,
  );
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");

  const isAdmin = session?.user?.role === "ADMIN";
  const currentUserId = session?.user?.id ?? "";

  // Fetch leave requests for visible range
  const fetchLeaveRequests = useCallback(async (date: Date) => {
    const rangeStart = subMonths(startOfMonth(date), 1);
    const rangeEnd = addMonths(endOfMonth(date), 1);
    const from = format(rangeStart, "yyyy-MM-dd");
    const to = format(rangeEnd, "yyyy-MM-dd");

    try {
      const res = await fetch(
        `/api/calendar?from=${from}&to=${to}&_t=${Date.now()}`,
        {
          cache: "no-store",
        },
      );
      if (res.ok) {
        setLeaveRequests(await res.json());
      } else {
        sileo.error({
          title: "Error al cargar",
          description: "No se pudo cargar el calendario",
        });
      }
    } catch {
      sileo.error({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaveRequests(currentDate);
  }, [currentDate, fetchLeaveRequests]);

  // Map leave requests to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return leaveRequests.map((lr) => {
      const endDate = parseLocalDate(lr.endDate);
      // react-big-calendar treats end date as exclusive for all-day events
      endDate.setDate(endDate.getDate() + 1);
      const typeLabel =
        LEAVE_TYPES.find((t) => t.value === lr.type)?.label ?? lr.type;

      let title: string;
      if (lr.type === "HOLIDAY") {
        title = `🏖 ${lr.reason || "Feriado"} (${lr.hours}h)`;
      } else {
        const statusIcon =
          lr.status === "PENDING"
            ? "⏳ "
            : lr.status === "REJECTED"
              ? "❌ "
              : "";
        title = `${statusIcon}${lr.user?.name ?? "—"} — ${typeLabel}`;
      }

      return {
        id: lr.id,
        title,
        start: parseLocalDate(lr.startDate),
        end: endDate,
        allDay: true,
        resource: lr,
      };
    });
  }, [leaveRequests]);

  // Event style
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const colors = TYPE_COLORS[event.resource.type] ?? TYPE_COLORS.UNJUSTIFIED;
    const isPending = event.resource.status === "PENDING";
    const isRejected = event.resource.status === "REJECTED";

    return {
      style: {
        backgroundColor: isRejected ? "#9ca3af" : colors.bg,
        borderLeft: `3px ${isPending ? "dashed" : "solid"} ${isRejected ? "#6b7280" : colors.border}`,
        borderRadius: "6px",
        color: "#fff",
        fontSize: "12px",
        padding: "2px 6px",
        border: "none",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        opacity: isPending ? 0.7 : isRejected ? 0.5 : 1,
      },
    };
  }, []);

  // Click on empty slot → open create modal
  function handleSelectSlot(slotInfo: SlotInfo) {
    const start = format(slotInfo.start, "yyyy-MM-dd");
    const end = format(slotInfo.end, "yyyy-MM-dd");
    const adjustedEnd =
      slotInfo.end.getHours() === 0 && slotInfo.start < slotInfo.end
        ? format(new Date(slotInfo.end.getTime() - 86400000), "yyyy-MM-dd")
        : end;
    setSlotStart(start);
    setSlotEnd(adjustedEnd);
    setRequestModalOpen(true);
  }

  // Click on event → open detail modal
  function handleSelectEvent(event: CalendarEvent) {
    setSelectedLeave(event.resource);
    setDetailModalOpen(true);
  }

  // Create leave
  async function handleCreateLeave(data: {
    startDate: string;
    endDate: string;
    type: string;
    reason: string;
    userId?: string;
    hours?: number;
  }) {
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      sileo.error({
        title: "Error al registrar",
        description: err.error || "No se pudo registrar la ausencia",
      });
      throw new Error(err.error || "Error al registrar la ausencia");
    }

    const result = await res.json();
    if (result.status === "PENDING") {
      sileo.info({
        title: "Solicitud enviada",
        description:
          "Tu ausencia fue enviada y necesita aprobación de un administrador",
      });
    } else {
      sileo.success({
        title: "Ausencia registrada",
        description: "La ausencia fue guardada correctamente",
      });
    }
    await fetchLeaveRequests(currentDate);
  }

  // Delete leave
  async function handleDelete(id: string) {
    const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json();
      sileo.error({
        title: "Error al eliminar",
        description: err.error || "No se pudo eliminar la ausencia",
      });
      throw new Error(err.error || "Error al eliminar la ausencia");
    }

    sileo.success({
      title: "Ausencia eliminada",
      description: "El registro fue eliminado correctamente",
    });
    await fetchLeaveRequests(currentDate);
  }

  // Change leave status (approve/reject)
  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json();
      sileo.error({
        title: "Error al actualizar",
        description: err.error || "No se pudo cambiar el estado",
      });
      throw new Error(err.error || "Error al cambiar el estado");
    }

    sileo.success({
      title:
        status === "APPROVED" ? "Solicitud aprobada" : "Solicitud rechazada",
      description:
        status === "APPROVED"
          ? "La ausencia fue aprobada correctamente"
          : "La solicitud fue rechazada",
    });
    await fetchLeaveRequests(currentDate);
  }

  // Update leave dates
  async function handleUpdate(id: string, startDate: string, endDate: string) {
    const res = await fetch(`/api/calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    });

    if (!res.ok) {
      const err = await res.json();
      sileo.error({
        title: "Error al actualizar",
        description: err.error || "No se pudo actualizar la ausencia",
      });
      throw new Error(err.error || "Error al actualizar la ausencia");
    }

    sileo.success({
      title: "Ausencia actualizada",
      description: "Las fechas fueron modificadas correctamente",
    });
    await fetchLeaveRequests(currentDate);
  }

  // Navigation
  function navigatePrev() {
    setCurrentDate((d) =>
      view === "week"
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
        : subMonths(d, 1),
    );
  }

  function navigateNext() {
    setCurrentDate((d) =>
      view === "week"
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
        : addMonths(d, 1),
    );
  }

  function navigateToday() {
    setCurrentDate(new Date());
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={navigateToday}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
          >
            Hoy
          </button>
          <button
            onClick={navigateNext}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize ml-2">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </h2>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1">
          {VIEW_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => setView(opt.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  view === opt.key
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={14} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {LEAVE_TYPES.map((t) => (
          <div
            key={t.value}
            className="flex items-center gap-1.5 text-xs text-gray-600"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
            {t.label}
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="glass rounded-2xl p-4 calendar-wrapper">
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          view={view}
          onView={setView as (view: View) => void}
          date={currentDate}
          onNavigate={setCurrentDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          messages={messages}
          culture="es"
          toolbar={false}
          popup
          length={31}
          style={{ minHeight: 600 }}
        />
      </div>

      {/* Modals */}
      <LeaveRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSubmit={handleCreateLeave}
        initialStartDate={slotStart}
        initialEndDate={slotEnd}
        isAdmin={isAdmin}
      />

      <LeaveDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        leaveRequest={selectedLeave}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
