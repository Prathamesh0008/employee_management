import { getMonthBoundsUTC, toIsoDate } from "@/lib/date";
import Attendance from "@/models/Attendance";
import BreakLog from "@/models/BreakLog";

function recordKey(userId, date) {
  return `${String(userId)}|${toIsoDate(new Date(date))}`;
}

export async function buildAttendanceReport({ month, year, userId = null }) {
  const { start, end } = getMonthBoundsUTC(year, month);

  const attendanceFilter = {
    date: { $gte: start, $lt: end },
  };

  if (userId) {
    attendanceFilter.user = userId;
  }

  const breakFilter = {
    date: { $gte: start, $lt: end },
    status: "completed",
  };

  if (userId) {
    breakFilter.user = userId;
  }

  const [attendanceRows, breakRows] = await Promise.all([
    Attendance.find(attendanceFilter)
      .sort({ date: 1, checkIn: 1 })
      .populate("user", "name email role")
      .lean(),
    BreakLog.find(breakFilter).lean(),
  ]);

  const breakMinutesMap = new Map();

  for (const row of breakRows) {
    const key = recordKey(row.user, row.date);
    const existing = breakMinutesMap.get(key) || 0;
    breakMinutesMap.set(key, existing + (row.durationMinutes || 0));
  }

  const records = attendanceRows.map((row) => {
    const breakMinutes = breakMinutesMap.get(recordKey(row.user?._id || row.user, row.date)) || 0;

    return {
      ...row,
      shiftStart: row.shiftStart || row.checkIn || null,
      shiftEnd: row.shiftEnd || row.checkOut || null,
      breakMinutes,
    };
  });

  const summary = {
    totalRecords: records.length,
    presentCount: records.filter((row) => row.status === "present").length,
    halfDayCount: records.filter((row) => row.status === "half-day").length,
    totalWorkMinutes: records.reduce((sum, row) => sum + (row.totalWorkMinutes || 0), 0),
    totalBreakMinutes: records.reduce((sum, row) => sum + (row.breakMinutes || 0), 0),
  };

  summary.averageWorkMinutes =
    summary.totalRecords > 0 ? Math.floor(summary.totalWorkMinutes / summary.totalRecords) : 0;

  return {
    range: {
      month,
      year,
      start,
      end,
    },
    summary,
    records,
  };
}

export function attendanceReportToCsv(report) {
  const header = [
    "Date",
    "Employee Name",
    "Email",
    "Role",
    "Shift Start",
    "Shift End",
    "Status",
    "Work Minutes",
    "Break Minutes",
  ];

  const rows = report.records.map((row) => [
    new Date(row.date).toISOString().slice(0, 10),
    row.user?.name || "",
    row.user?.email || "",
    row.user?.role || "",
    row.shiftStart ? new Date(row.shiftStart).toISOString() : "",
    row.shiftEnd ? new Date(row.shiftEnd).toISOString() : "",
    row.status || "",
    row.totalWorkMinutes || 0,
    row.breakMinutes || 0,
  ]);

  const allRows = [header, ...rows];

  return allRows
    .map((row) =>
      row
        .map((cell) => {
          const raw = String(cell ?? "");
          const escaped = raw.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");
}
