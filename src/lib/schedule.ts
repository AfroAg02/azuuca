import { prisma } from "./prisma";

/** Convert "HH:mm" or "HH:mm:ss" to total minutes since midnight */
export function timeToMinutes(time: string): number {
  const parts = time.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

/**
 * Calculate punctuality for a clock-in or clock-out time.
 * Returns minutes difference: negative = early, positive = late.
 * Returns null if either time is missing or invalid.
 */
export function calcPunctuality(
  actual: string | null | undefined,
  expected: string | null | undefined,
): number | null {
  if (!actual || !expected) return null;
  const result = timeToMinutes(actual) - timeToMinutes(expected);
  return Number.isFinite(result) ? result : null;
}

/** Get the global schedule config, creating defaults if needed */
export async function getScheduleConfig() {
  let config = await prisma.globalConfig.findUnique({
    where: { id: "global" },
  });
  if (!config) {
    config = await prisma.globalConfig.create({
      data: { id: "global", clockInTime: "09:00", clockOutTime: "18:00" },
    });
  }
  return config;
}
