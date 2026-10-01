import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { OrbitalLoader } from "@/components/OrbitalLoader";
import { useBugs } from "@/hooks/useBugs";
import { formatBugDate, groupBugsByDay, isSameMonth, isToday } from "@/lib/bug-utils";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Bug history — Fixio" },
      {
        name: "description",
        content: "Search, filter and reopen every bug report you have documented.",
      },
      { property: "og:title", content: "Bug history — Fixio" },
      {
        property: "og:description",
        content: "Search, filter and reopen every bug report you have documented.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

type Sort = "newest" | "oldest" | "edited";
type Range = "all" | "today" | "month";

const controlClass =
  "rounded-xl border-2 border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-brand/60 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs cursor-pointer";

function HistoryPage() {
  const { data: bugs = [], isLoading } = useBugs();
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const [range, setRange] = useState<Range>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const modules = useMemo(
    () => Array.from(new Set(bugs.map((bug) => bug.module).filter(Boolean))).sort(),
    [bugs],
  );

  const filtersActive = Boolean(query) || module !== "all" || range !== "all" || sort !== "newest";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = bugs.filter((bug) => {
      if (module !== "all" && bug.module !== module) return false;
      if (range === "today" && !isToday(bug.created_at)) return false;
      if (range === "month" && !isSameMonth(bug.created_at)) return false;
      if (!needle) return true;
      return [bug.title, bug.module, bug.description, bug.expected_result, bug.actual_result]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    list = [...list].sort((a, b) => {
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "edited") return b.updated_at.localeCompare(a.updated_at);
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [bugs, query, module, range, sort]);

  const groups = groupBugsByDay(filtered);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Bug history</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {bugs.length} documented {bugs.length === 1 ? "bug" : "bugs"}
          </h1>
        </div>
        <Link
          to="/document"
          className="btn-tactile-brand rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
        >
          + Document new bug
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, modules, descriptions, results…"
          className={`${controlClass} w-full`}
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={module}
            onChange={(event) => setModule(event.target.value)}
            className={controlClass}
            aria-label="Filter by module"
          >
            <option value="all">All modules</option>
            {modules.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as Range)}
            className={controlClass}
            aria-label="Filter by date"
          >
            <option value="all">Any date</option>
            <option value="today">Today</option>
            <option value="month">This month</option>
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className={controlClass}
            aria-label="Sort bugs"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="edited">Recently edited</option>
          </select>
          {filtersActive && (
            <button
              onClick={() => {
                setQuery("");
                setModule("all");
                setRange("all");
                setSort("newest");
              }}
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <OrbitalLoader label="Loading bug history…" sublabel="Fetching all QA records" />
      ) : bugs.length === 0 ? (
        <div className="card-3d mt-8 rounded-2xl p-8 text-center">
          <p className="text-[15px] font-medium">No bugs documented yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your first bug and it will automatically be organized into a professional QA
            report.
          </p>
          <Link
            to="/document"
            className="btn-tactile-brand mt-4 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Document Your First Bug
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-3d mt-8 rounded-2xl p-8 text-center">
          <p className="text-[15px] font-medium">
            {query.trim()
              ? "No bugs found matching your search."
              : "No bugs match the selected filters."}
          </p>
          {filtersActive && (
            <button
              onClick={() => {
                setQuery("");
                setModule("all");
                setRange("all");
                setSort("newest");
              }}
              className="mt-3 text-sm font-semibold text-brand underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.label + group.date}>
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group.label}
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {group.bugs.length} {group.bugs.length === 1 ? "bug" : "bugs"}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <ul className="mt-3 space-y-3">
                {group.bugs.map((bug) => (
                  <li key={bug.id}>
                    <Link
                      to="/bugs/$bugId"
                      params={{ bugId: bug.id }}
                      className="card-3d card-3d-hover block rounded-2xl p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
                          {bug.module}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatBugDate(bug.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 font-display text-lg font-semibold leading-snug">
                        {bug.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/70">
                        {bug.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
