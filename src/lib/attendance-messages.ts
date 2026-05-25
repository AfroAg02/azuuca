import { sileo } from "sileo";

/** Formats minutes into a human-readable time string: "2h 15min", "45min", "1h" */
function fmtTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ── Clock-In Messages ──

const clockInEarlyMessages = [
  {
    title: "🌅 ¡Madrugador!",
    desc: (m: number) => `Llegaste ${fmtTime(m)} antes. El café te espera ☕`,
  },
  {
    title: "🐓 ¡El gallo te envidia!",
    desc: (m: number) => `${fmtTime(m)} temprano. ¡Esa disciplina se nota!`,
  },
  {
    title: "⭐ ¡Estrella matutina!",
    desc: (m: number) => `${fmtTime(m)} antes de la hora. ¡Crack total!`,
  },
  {
    title: "🏃 ¡A toda máquina!",
    desc: (m: number) => `${fmtTime(m)} de ventaja. Así se arranca el día 💪`,
  },
  {
    title: "🎯 ¡Puntualidad premium!",
    desc: (m: number) => `${fmtTime(m)} antes. ¡Eres un ejemplo a seguir!`,
  },
  {
    title: "🦸 ¡Súper puntual!",
    desc: (m: number) =>
      `Llegaste ${fmtTime(m)} antes. Los héroes no llegan tarde 🦸‍♂️`,
  },
  {
    title: "🔥 ¡Imparable!",
    desc: (m: number) => `${fmtTime(m)} temprano. ¡Hoy va a ser un gran día!`,
  },
  {
    title: "🌟 ¡Brillando desde temprano!",
    desc: (m: number) => `${fmtTime(m)} de anticipación. ¡Sigue así!`,
  },
];

const clockInOnTimeMessages = [
  {
    title: "✅ ¡Justo a tiempo!",
    desc: () => "Ni un minuto más, ni uno menos. ¡Perfecto!",
  },
  {
    title: "⏰ ¡Reloj suizo!",
    desc: () => "Llegaste exacto. La puntualidad es tu superpoder 🦸",
  },
  { title: "🎯 ¡En el clavo!", desc: () => "Hora exacta. ¡Así se hace!" },
  {
    title: "👌 ¡Precisión total!",
    desc: () => "Justo a la hora. Ni más ni menos 💯",
  },
  {
    title: "🕐 ¡Puntualidad británica!",
    desc: () => "Llegaste en punto. ¡Impecable!",
  },
];

const clockInSlightlyLateMessages = [
  {
    title: "😅 ¡Por poquito!",
    desc: (m: number) =>
      `${fmtTime(m)} tarde... ¡casi la libras! Mañana será mejor`,
  },
  {
    title: "🏃‍♂️ ¡Llegaste corriendo!",
    desc: (m: number) => `${fmtTime(m)} de retraso. ¡El tráfico no perdona!`,
  },
  {
    title: "⚡ ¡Casi a tiempo!",
    desc: (m: number) =>
      `Solo ${fmtTime(m)} tarde. ¡Pon la alarma 5 min antes!`,
  },
  {
    title: "🐌 ¡Un poquito lento hoy!",
    desc: (m: number) => `${fmtTime(m)} de retraso. ¡Tú puedes mejorar!`,
  },
  {
    title: "😬 ¡Uy, por poco!",
    desc: (m: number) => `${fmtTime(m)} tarde. La almohada es traicionera 🛏️`,
  },
];

const clockInLateMessages = [
  {
    title: "😤 ¡Ojo con la hora!",
    desc: (m: number) => `${fmtTime(m)} de retraso. ¡Hay que mejorar eso!`,
  },
  {
    title: "🚨 ¡Alerta de tardanza!",
    desc: (m: number) => `${fmtTime(m)} tarde. ¡La puntualidad es clave!`,
  },
  {
    title: "😬 ¡Eso fue bastante!",
    desc: (m: number) => `${fmtTime(m)} de retraso. ¡Ponle ganas mañana!`,
  },
  {
    title: "⏰ ¡El despertador lloró!",
    desc: (m: number) => `${fmtTime(m)} tarde. ¡No le falles al equipo!`,
  },
  {
    title: "🐢 ¡Tortuga detected!",
    desc: (m: number) => `${fmtTime(m)} de retraso. ¡Arriba esas pilas! 🔋`,
  },
];

const clockInVeryLateMessages = [
  {
    title: "💀 ¡Llegaste re tarde!",
    desc: (m: number) =>
      `${fmtTime(m)} de retraso... ¡Eso no puede seguir así!`,
  },
  {
    title: "🫣 ¡Esto es serio!",
    desc: (m: number) => `${fmtTime(m)} tarde. ¡Necesitas un plan de acción!`,
  },
  {
    title: "😱 ¡Retraso monumental!",
    desc: (m: number) =>
      `${fmtTime(m)} de retraso. ¡Mañana pon 5 alarmas! ⏰⏰⏰`,
  },
  {
    title: "🥴 ¡Más vale tarde que nunca!",
    desc: (m: number) => `${fmtTime(m)} de retraso... pero al menos llegaste`,
  },
  {
    title: "🚫 ¡Hay que ser puntuales!",
    desc: (m: number) =>
      `${fmtTime(m)} tarde. ¡El equipo te necesita a tiempo!`,
  },
];

// ── Clock-Out Messages ──

const clockOutEarlyMessages = [
  {
    title: "🏃 ¡Salida anticipada!",
    desc: (m: number) => `Te fuiste ${fmtTime(m)} antes. ¿Todo bien? 🤔`,
  },
  {
    title: "⚡ ¡Rayo veloz!",
    desc: (m: number) => `${fmtTime(m)} antes de la hora. ¡Qué prisa!`,
  },
  {
    title: "🎒 ¡Ya te vas!",
    desc: (m: number) => `${fmtTime(m)} temprano. ¡Descansa bien! 😴`,
  },
];

const clockOutOnTimeMessages = [
  {
    title: "🎉 ¡Jornada completada!",
    desc: () => "Saliste justo a la hora. ¡Buen trabajo hoy!",
  },
  {
    title: "✨ ¡Día productivo!",
    desc: () => "Hora de salida exacta. ¡A descansar se ha dicho!",
  },
  {
    title: "🏠 ¡A casa!",
    desc: () => "Saliste en punto. ¡Disfruta tu tarde! 🌇",
  },
  {
    title: "💯 ¡Perfecto!",
    desc: () => "Jornada impecable. ¡Nos vemos mañana!",
  },
];

const clockOutLateMessages = [
  {
    title: "💪 ¡Extra dedicación!",
    desc: (m: number) => `${fmtTime(m)} extra trabajando. ¡Qué compromiso!`,
  },
  {
    title: "🌙 ¡Horas extra!",
    desc: (m: number) => `Te quedaste ${fmtTime(m)} más. ¡No te quemes! 🔥`,
  },
  {
    title: "🦉 ¡Búho trabajador!",
    desc: (m: number) =>
      `${fmtTime(m)} después de la hora. ¡También hay que descansar!`,
  },
  {
    title: "⚙️ ¡Máquina incansable!",
    desc: (m: number) => `${fmtTime(m)} de overtime. ¡Tremendo esfuerzo!`,
  },
  {
    title: "🏆 ¡Dedicación total!",
    desc: (m: number) => `${fmtTime(m)} extra. ¡Ese compromiso vale oro! 🥇`,
  },
];

// ── Helpers ──

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getClockInMessage(diffMin: number) {
  const abs = Math.abs(diffMin);
  if (diffMin < -1)
    return { ...pick(clockInEarlyMessages), abs, type: "success" as const };
  if (diffMin <= 1)
    return { ...pick(clockInOnTimeMessages), abs: 0, type: "success" as const };
  if (diffMin <= 5)
    return {
      ...pick(clockInSlightlyLateMessages),
      abs,
      type: "warning" as const,
    };
  if (diffMin <= 20)
    return { ...pick(clockInLateMessages), abs, type: "warning" as const };
  return { ...pick(clockInVeryLateMessages), abs, type: "error" as const };
}

function getClockOutMessage(diffMin: number) {
  const abs = Math.abs(diffMin);
  if (diffMin < -1)
    return { ...pick(clockOutEarlyMessages), abs, type: "warning" as const };
  if (diffMin <= 1)
    return {
      ...pick(clockOutOnTimeMessages),
      abs: 0,
      type: "success" as const,
    };
  return { ...pick(clockOutLateMessages), abs, type: "info" as const };
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

/**
 * Show a sileo toast with a fun message about punctuality.
 * @param action "clockIn" or "clockOut"
 * @param diffMin minutes difference: positive = late, negative = early
 * @param clockTime the actual clock time string (HH:MM:SS)
 */
export function showAttendanceToast(
  action: "clockIn" | "clockOut",
  diffMin: number | null | undefined,
  clockTime?: string,
) {
  const timeStr = clockTime ? formatTime(clockTime) : null;

  if (diffMin == null) {
    // No schedule info — fallback generic
    sileo.success({
      title:
        action === "clockIn" ? "✅ Entrada registrada" : "✅ Salida registrada",
      description: timeStr
        ? `Hora: ${timeStr} — Asistencia guardada correctamente`
        : "Asistencia guardada correctamente",
    });
    return;
  }

  const msg =
    action === "clockIn"
      ? getClockInMessage(diffMin)
      : getClockOutMessage(diffMin);

  const base = msg.abs === 0 ? msg.desc(0) : msg.desc(msg.abs);
  const description = timeStr ? `${base} (${timeStr})` : base;

  if (msg.type === "success") {
    sileo.success({ title: msg.title, description });
  } else if (msg.type === "warning") {
    sileo.warning({ title: msg.title, description });
  } else if (msg.type === "error") {
    sileo.error({ title: msg.title, description });
  } else {
    sileo.info({ title: msg.title, description });
  }
}
