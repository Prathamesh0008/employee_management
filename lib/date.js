export function getMonthBoundsUTC(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { start, end };
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function getUtcDateStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getUtcDateEnd(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

export function minutesBetween(start, end) {
  if (!start || !end) {
    return 0;
  }

  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
