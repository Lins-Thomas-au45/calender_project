import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isEqual,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const fmt = (d: Date) => format(d, "yyyy-MM-dd");

export const monthGridDays = (anchor: Date) => {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
};

export const dateInRange = (dateISO: string, startISO: string, endISO: string) => {
  const d = parseISO(dateISO);
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  return isWithinInterval(d, { start: s, end: e });
};

export const clampRange = (a: Date, b: Date) => {
  return isAfter(a, b) ? [b, a] as const : [a, b] as const;
};

export const durationDays = (startISO: string, endISO: string) =>
  Math.abs(differenceInCalendarDays(parseISO(endISO), parseISO(startISO))) + 1;

export const sameDayISO = (aISO: string, bISO: string) =>
  isEqual(parseISO(aISO), parseISO(bISO));

export const moveRangeKeepingLength = (newStartISO: string, oldStartISO: string, oldEndISO: string) => {
  const len = durationDays(oldStartISO, oldEndISO);
  const ns = parseISO(newStartISO);
  const ne = new Date(ns);
  ne.setDate(ns.getDate() + (len - 1));
  return { start: fmt(ns), end: fmt(ne) };
};

export const setStartOrEndToISO = (
  side: "left" | "right",
  dropISO: string,
  startISO: string,
  endISO: string
) => {
  if (side === "left") {
    const [s, e] = clampRange(parseISO(dropISO), parseISO(endISO));
    return { start: fmt(s), end: fmt(e) };
  } else {
    const [s, e] = clampRange(parseISO(startISO), parseISO(dropISO));
    return { start: fmt(s), end: fmt(e) };
  }
};

export const includesCaseInsensitive = (hay: string, needle: string) =>
  hay.toLowerCase().includes(needle.toLowerCase());
