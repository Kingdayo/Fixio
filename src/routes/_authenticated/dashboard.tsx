import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { BugComposer } from "@/components/BugComposer";
import { OrbitalLoader } from "@/components/OrbitalLoader";
import { useBugs } from "@/hooks/useBugs";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { dateGroupLabel, isSameMonth, isToday } from "@/lib/bug-utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Fixio" },
      { name: "description", content: "Document a new bug and review your latest QA records." },
      { property: "og:title", content: "Dashboard — Fixio" },
      {
        property: "og:description",
        content: "Document a new bug and review your latest QA records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: bugs = [], isLoading } = useBugs();

  const firstName = (profile?.name || user?.user_metadata?.["name"] || "").split(" ")[0] || "there";
  const stats = [
    { label: "Total bugs", value: bugs.length },
    { label: "This month", value: bugs.filter((bug) => isSameMonth(bug.created_at)).length },
    { label: "Today", value: bugs.filter((bug) => isToday(bug.created_at)).length },
  ];
  const recent = bugs.slice(0, 6);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Hello {firstName}.
          </h1>
        </div>
        <Link
          to="/document"
          className="btn-tactile-brand rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
        >
          + Document new bug
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card-3d card-3d-hover rounded-2xl p-5 relative overflow-hidden group"
          >
            <div className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-brand/5 blur-xl group-hover:bg-brand/15 transition-all duration-300 animate-bubble-float" />
            <p className="label-eyebrow">{stat.label}</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <BugComposer />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">Recent bugs</h2>
          <Link to="/history" className="text-sm font-medium text-brand">
            View all bugs
          </Link>
        </div>

        {isLoading ? (
          <OrbitalLoader label="Loading your bugs…" sublabel="Fetching recent QA records" />
        ) : recent.length === 0 ? (
          <div className="card-3d mt-4 rounded-2xl p-6 text-center">
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
        ) : (
          <ul className="mt-4 space-y-3">
            {recent.map((bug) => (
              <li key={bug.id}>
                <Link
                  to="/bugs/$bugId"
                  params={{ bugId: bug.id }}
                  className="card-3d card-3d-hover block rounded-2xl p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
                      {bug.module}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dateGroupLabel(bug.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-lg font-semibold leading-snug">
                    {bug.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{bug.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
