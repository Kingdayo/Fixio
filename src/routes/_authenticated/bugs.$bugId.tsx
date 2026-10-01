import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { BugReportCard } from "@/components/BugReportCard";
import { OrbitalLoader } from "@/components/OrbitalLoader";
import { useBug } from "@/hooks/useBugs";

export const Route = createFileRoute("/_authenticated/bugs/$bugId")({
  head: () => ({
    meta: [
      { title: "Bug report — Fixio" },
      { name: "description", content: "Review, edit, copy or delete this documented bug report." },
      { property: "og:title", content: "Bug report — Fixio" },
      {
        property: "og:description",
        content: "Review, edit, copy or delete this documented bug report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BugDetail,
});

function BugDetail() {
  const { bugId } = useParams({ from: "/_authenticated/bugs/$bugId" });
  const { data: bug, isLoading } = useBug(bugId);
  const navigate = useNavigate();

  return (
    <AppShell>
      <Link to="/history" className="text-sm font-medium text-muted-foreground">
        ← Back to history
      </Link>

      {isLoading ? (
        <OrbitalLoader label="Loading bug report…" sublabel="Retrieving QA details" />
      ) : !bug ? (
        <p className="mt-6 rounded-2xl bg-card p-8 text-center text-[15px] font-medium shadow-card ring-1 ring-border">
          This bug report is no longer available.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          <BugReportCard
            bug={bug}
            onDocumentAnother={() => navigate({ to: "/document" })}
            onDeleted={() => navigate({ to: "/history" })}
          />
          <details className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
            <summary className="cursor-pointer text-sm font-semibold">Original input</summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
              {bug.raw_input}
            </p>
          </details>
        </div>
      )}
    </AppShell>
  );
}
