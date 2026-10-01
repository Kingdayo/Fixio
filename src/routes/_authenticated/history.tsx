import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { OrbitalLoader } from "@/components/OrbitalLoader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBugs } from "@/hooks/useBugs";
import { supabase } from "@/integrations/supabase/client";
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

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

  const allFilteredIds = useMemo(() => filtered.map((b) => b.id), [filtered]);
  const isAllSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }

  function toggleSelectGroup(groupBugIds: string[]) {
    const isGroupFullySelected = groupBugIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isGroupFullySelected) {
        for (const id of groupBugIds) next.delete(id);
      } else {
        for (const id of groupBugIds) next.add(id);
      }
      return next;
    });
  }

  function toggleSelectBug(bugId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bugId)) {
        next.delete(bugId);
      } else {
        next.add(bugId);
      }
      return next;
    });
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);

    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("bugs").delete().in("id", idsToDelete);

    setIsDeleting(false);
    setDeleteConfirmOpen(false);

    if (error) {
      toast.error("Failed to delete selected bugs. Please try again.");
      return;
    }

    const count = idsToDelete.length;
    setSelectedIds(new Set());
    await queryClient.invalidateQueries({ queryKey: ["bugs"] });
    toast.success(`${count} ${count === 1 ? "bug report" : "bug reports"} deleted successfully.`);
  }

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
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={module} onValueChange={setModule}>
            <SelectTrigger
              className="h-11 min-w-[150px] rounded-xl border-2 border-border/80 bg-card px-4 text-sm font-medium text-foreground hover:border-brand/60 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs cursor-pointer"
              aria-label="Filter by module"
            >
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-2 border-border/80 bg-card p-1.5 shadow-elevated text-foreground">
              <SelectItem
                value="all"
                className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
              >
                All modules
              </SelectItem>
              {modules.map((item) => (
                <SelectItem
                  key={item}
                  value={item}
                  className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
                >
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={range} onValueChange={(val) => setRange(val as Range)}>
            <SelectTrigger
              className="h-11 min-w-[130px] rounded-xl border-2 border-border/80 bg-card px-4 text-sm font-medium text-foreground hover:border-brand/60 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs cursor-pointer"
              aria-label="Filter by date"
            >
              <SelectValue placeholder="Any date" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-2 border-border/80 bg-card p-1.5 shadow-elevated text-foreground">
              <SelectItem
                value="all"
                className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
              >
                Any date
              </SelectItem>
              <SelectItem
                value="today"
                className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
              >
                Today
              </SelectItem>
              <SelectItem
                value="month"
                className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
              >
                This month
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(val) => setSort(val as Sort)}>
            <SelectTrigger
              className="h-11 min-w-[140px] rounded-xl border-2 border-border/80 bg-card px-4 text-sm font-medium text-foreground hover:border-brand/60 focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-xs cursor-pointer"
              aria-label="Sort bugs"
            >
              <SelectValue placeholder="Newest first" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-2 border-border/80 bg-card p-1.5 shadow-elevated text-foreground">
              <SelectItem
                value="newest"
                className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
              >
                Newest first
              </SelectItem>
              <SelectItem
                value="oldest"
                className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
              >
                Oldest first
              </SelectItem>
              <SelectItem
                value="edited"
                className="cursor-pointer rounded-xl py-2.5 text-sm font-medium text-foreground focus:bg-brand/10 focus:text-brand"
              >
                Recently edited
              </SelectItem>
            </SelectContent>
          </Select>

          {filtered.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 rounded-xl border-2 border-border/80 bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:border-brand/60 transition-all cursor-pointer"
            >
              <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
              <span>{isAllSelected ? "Deselect all" : "Select all"}</span>
            </button>
          )}

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

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-30 my-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-brand/30 bg-card/95 p-4 shadow-xl backdrop-blur-md animate-scale-in">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand text-brand-foreground font-bold text-xs">
              {selectedIds.size}
            </span>
            <p className="text-sm font-semibold text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? "bug report" : "bug reports"} selected
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              Deselect
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-destructive px-5 py-2.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              Delete selected ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

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
          {groups.map((group) => {
            const groupBugIds = group.bugs.map((b) => b.id);
            const isGroupFullySelected =
              groupBugIds.length > 0 && groupBugIds.every((id) => selectedIds.has(id));

            return (
              <section key={group.label + group.date}>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isGroupFullySelected}
                    onCheckedChange={() => toggleSelectGroup(groupBugIds)}
                    aria-label={`Select group ${group.label}`}
                    className="cursor-pointer"
                  />
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {group.bugs.length} {group.bugs.length === 1 ? "bug" : "bugs"}
                  </span>
                  <button
                    onClick={() => toggleSelectGroup(groupBugIds)}
                    className="text-xs text-muted-foreground hover:text-brand font-medium cursor-pointer"
                  >
                    {isGroupFullySelected ? "Deselect group" : "Select group"}
                  </button>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <ul className="mt-3 space-y-3">
                  {group.bugs.map((bug) => {
                    const isSelected = selectedIds.has(bug.id);

                    return (
                      <li key={bug.id} className="relative">
                        <div
                          className={`card-3d card-3d-hover relative block rounded-2xl p-5 transition-all ${
                            isSelected ? "border-brand bg-brand/5 shadow-md" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectBug(bug.id);
                              }}
                              className="mt-1 flex items-center justify-center cursor-pointer p-1"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectBug(bug.id)}
                                aria-label={`Select bug ${bug.title}`}
                                className="cursor-pointer"
                              />
                            </div>
                            <Link
                              to="/bugs/$bugId"
                              params={{ bugId: bug.id }}
                              className="flex-1 min-w-0"
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
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Batch Deletion */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} bug reports?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "bug report" : "bug reports"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleBatchDelete()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete bug reports"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
