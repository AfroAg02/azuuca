/**
 * Returns the current date and time in the specified IANA timezone.
 * Falls back to UTC if the timezone is invalid.
 */
export function getNowInTimezone(timezone: string): {
  date: string;
  time: string;
} {
  const now = new Date();

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value || "00";

    // Intl can return "24" for midnight in some locales — normalize to "00"
    const hour = get("hour") === "24" ? "00" : get("hour");

    const date = `${get("year")}-${get("month")}-${get("day")}`;
    const time = `${hour}:${get("minute")}:${get("second")}`;

    return { date, time };
  } catch {
    // Invalid timezone — fall back to UTC
    const date = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const time = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`;
    return { date, time };
  }
}

/**
 * Returns today's date string (YYYY-MM-DD) in the specified timezone.
 */
export function getTodayInTimezone(timezone: string): string {
  return getNowInTimezone(timezone).date;
}

/**
 * Extracts the timezone from request headers, defaulting to UTC.
 */
export function getTimezoneFromRequest(request: Request): string {
  return request.headers.get("x-timezone") || "UTC";
}
