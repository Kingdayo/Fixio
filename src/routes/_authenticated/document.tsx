import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { BugComposer } from "@/components/BugComposer";

export const Route = createFileRoute("/_authenticated/document")({
  head: () => ({
    meta: [
      { title: "Document a bug — Fixio" },
      {
        name: "description",
        content: "Paste a raw bug observation and Fixio turns it into a structured QA report.",
      },
      { property: "og:title", content: "Document a bug — Fixio" },
      {
        property: "og:description",
        content: "Paste a raw bug observation and Fixio turns it into a structured QA report.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentBug,
});

function DocumentBug() {
  return (
    <AppShell>
      <p className="label-eyebrow">Document bug</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Describe the bug in your own words.
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-foreground/70">
        Write it exactly as you observed it. Fixio handles the title, module, description, expected
        result and actual result, and saves the record to your history.
      </p>
      <div className="mt-8">
        <BugComposer heading="Raw bug observation" />
      </div>
    </AppShell>
  );
}
