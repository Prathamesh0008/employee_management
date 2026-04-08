function toDateMs(value) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getTaskDeadlineMs(task) {
  const date = new Date(task?.taskDate || Date.now());
  date.setHours(23, 59, 59, 999);
  const deadlineMs = date.getTime();
  return Number.isNaN(deadlineMs) ? 0 : deadlineMs;
}

export function formatTaskMinutes(value) {
  const totalMinutes = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  }

  if (minutes === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hr ${minutes} min`;
}

export function formatTaskDuration(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function shouldShowTaskProgress(task) {
  return task?.status === "in-progress" || task?.status === "completed" || Boolean(task?.startedAt);
}

export function getTaskProgressPercent(task, now = Date.now()) {
  if (!task) return 0;
  if (task.status === "completed") return 100;
  if (!task.startedAt || task.status !== "in-progress") return 0;

  const startMs = toDateMs(task.startedAt);
  const nowMs = typeof now === "number" ? now : toDateMs(now);

  if (!startMs || !nowMs) return 0;

  let deadlineMs = getTaskDeadlineMs(task);

  if (!deadlineMs || deadlineMs <= startMs) {
    deadlineMs = startMs + 60 * 60 * 1000;
  }

  const elapsedMs = Math.max(0, nowMs - startMs);
  const totalMs = Math.max(1, deadlineMs - startMs);
  const percent = Math.round((elapsedMs / totalMs) * 100);

  return Math.max(1, Math.min(100, percent));
}

export function getTaskProgressClasses(task, now = Date.now()) {
  const percent = getTaskProgressPercent(task, now);

  if (task?.status === "completed") {
    return "from-emerald-500 to-green-400";
  }

  if (task?.status === "in-progress" && percent >= 100) {
    return "from-rose-500 to-orange-400";
  }

  if (task?.status === "in-progress") {
    return "from-[#A346FF] to-[#A346FF]";
  }

  return "from-slate-500 to-slate-400";
}

export function getTaskTimingText(task, now = Date.now()) {
  if (!task) return "Task not started";

  if (task.status === "completed" && task.completedAt) {
    return `Completed in ${formatTaskMinutes(task.completionMinutes)}`;
  }

  if (task.status === "in-progress" && task.startedAt) {
    const startMs = toDateMs(task.startedAt);
    const nowMs = typeof now === "number" ? now : toDateMs(now);
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));

    return `Running ${formatTaskDuration(elapsedSeconds)}`;
  }

  return "Task not started";
}

export function formatTaskDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

