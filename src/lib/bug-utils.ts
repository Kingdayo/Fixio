export type Bug = {
  id: string;
  title: string;
  module: string;
  description: string;
  expected_result: string;
  actual_result: string;
  raw_input: string;
  created_at: string;
  updated_at: string;
};

export const BUG_COLUMNS =
  "id, title, module, description, expected_result, actual_result, raw_input, created_at, updated_at";

export function formatBugDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatBugTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dateGroupLabel(iso: string): string {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const dayMs = 86_400_000;
  if (day === today) return "Today";
  if (day === today - dayMs) return "Yesterday";
  return formatBugDate(iso);
}

export function groupBugsByDay(bugs: Bug[]): { label: string; date: string; bugs: Bug[] }[] {
  const groups: { label: string; date: string; bugs: Bug[] }[] = [];
  for (const bug of bugs) {
    const label = dateGroupLabel(bug.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.bugs.push(bug);
    } else {
      groups.push({ label, date: formatBugDate(bug.created_at), bugs: [bug] });
    }
  }
  return groups;
}

export function bugReportText(bug: Bug): string {
  return [
    `Bug: ${bug.title}`,
    "",
    `Module: ${bug.module}`,
    "",
    "Description:",
    bug.description,
    "",
    "Expected Result:",
    bug.expected_result,
    "",
    "Actual Result:",
    bug.actual_result,
    "",
    "Date:",
    formatBugDate(bug.created_at),
  ].join("\n");
}

export function isSameMonth(iso: string, reference = new Date()): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
  );
}

export function isToday(iso: string): boolean {
  return startOfDay(new Date(iso)) === startOfDay(new Date());
}

export function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
