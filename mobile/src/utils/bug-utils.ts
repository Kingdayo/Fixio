import { format, isToday as isTodayDate, isThisMonth as isThisMonthDate, parseISO } from "date-fns";

export type Bug = {
  id: string;
  user_id?: string;
  title: string;
  module: string;
  description: string;
  expected_result: string;
  actual_result: string;
  raw_input: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export function formatBugDate(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = parseISO(isoString);
    return format(date, "MMM d, yyyy · h:mm a");
  } catch {
    return isoString;
  }
}

export function isToday(isoString: string): boolean {
  if (!isoString) return false;
  try {
    return isTodayDate(parseISO(isoString));
  } catch {
    return false;
  }
}

export function isSameMonth(isoString: string): boolean {
  if (!isoString) return false;
  try {
    return isThisMonthDate(parseISO(isoString));
  } catch {
    return false;
  }
}

export function dateGroupLabel(isoString: string): string {
  if (!isoString) return "Other";
  try {
    const date = parseISO(isoString);
    if (isTodayDate(date)) return "Today";
    return format(date, "MMMM d, yyyy");
  } catch {
    return "Other";
  }
}

export type BugGroup = {
  label: string;
  date: string;
  bugs: Bug[];
};

export function groupBugsByDay(bugs: Bug[]): BugGroup[] {
  const groupsMap = new Map<string, { label: string; bugs: Bug[] }>();

  for (const bug of bugs) {
    const dateStr = bug.created_at ? bug.created_at.slice(0, 10) : "unknown";
    const label = dateGroupLabel(bug.created_at);

    if (!groupsMap.has(dateStr)) {
      groupsMap.set(dateStr, { label, bugs: [] });
    }
    groupsMap.get(dateStr)!.bugs.push(bug);
  }

  return Array.from(groupsMap.entries()).map(([date, data]) => ({
    date,
    label: data.label,
    bugs: data.bugs,
  }));
}

export function initialsFrom(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "FX";
}

export function bugReportText(bug: Bug): string {
  return `BUG REPORT: ${bug.title}
Module: ${bug.module}
Date: ${formatBugDate(bug.created_at)}

DESCRIPTION:
${bug.description}

EXPECTED RESULT:
${bug.expected_result}

ACTUAL RESULT:
${bug.actual_result}`;
}
