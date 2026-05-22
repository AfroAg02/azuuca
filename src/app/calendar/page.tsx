import { CalendarView } from "@/components/calendar/CalendarView";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <CalendarDays size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Calendario de Ausencias
          </h1>
          <p className="text-sm text-gray-500">
            Planifica y gestiona las ausencias del equipo
          </p>
        </div>
      </div>
      <CalendarView />
    </div>
  );
}
