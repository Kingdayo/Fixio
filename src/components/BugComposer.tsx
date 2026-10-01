import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { structureBug } from "@/lib/bugs.functions";
import type { Bug } from "@/lib/bug-utils";
import { BugReportCard } from "@/components/BugReportCard";

export function BugComposer({ heading = "Document a new bug" }: { heading?: string }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Bug | null>(null);
  const run = useServerFn(structureBug);
  const queryClient = useQueryClient();

  async function handleSubmit() {
    if (!raw.trim()) {
      toast.error("Please describe the bug before continuing.");
      return;
    }
    setBusy(true);
    try {
      const outcome = await run({ data: { rawInput: raw } });
      if (!outcome.ok) {
        if (outcome.reason === "insufficient") {
          toast.error(
            "Please provide a little more detail about the issue so it can be documented accurately.",
          );
        } else if (outcome.reason === "save") {
          toast.error("Your bug could not be saved. Please try again.");
        } else {
          toast.error("The bug could not be organized right now. Please try again.");
        }
        return;
      }
      setResult(outcome.bug as Bug);
      setRaw("");
      await queryClient.invalidateQueries({ queryKey: ["bugs"] });
      toast.success("Bug documented successfully. Saved to your bug history.");
    } catch (error) {
      console.error(error);
      toast.error("The bug could not be organized right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="card-3d rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-brand/10">
            <span className="block size-2.5 rounded-sm bg-brand" />
          </span>
          <h2 className="font-display text-lg font-semibold">{heading}</h2>
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            Paste the raw observation
          </span>
        </div>
        <textarea
          rows={5}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          disabled={busy}
          className="mt-4 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3.5 text-[15px] leading-relaxed outline-none transition-all placeholder:text-muted-foreground/70 focus:border-brand focus:bg-card focus:shadow-[0_0_0_3px_oklch(0.679_0.2_38/0.2)] disabled:opacity-70"
          placeholder="Example: When a learner tries to log in through the web version on a mobile device, they are redirected to the App Store instead of the dashboard."
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleSubmit()}
            disabled={busy}
            className="btn-tactile-primary rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {busy ? "Organizing…" : "Document bug"}
          </button>
          <button
            onClick={() => setRaw("")}
            disabled={busy || !raw}
            className="rounded-full px-4 py-3 text-sm font-medium text-muted-foreground transition-transform active:scale-95 disabled:opacity-50"
          >
            Clear
          </button>
          <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
            {busy ? "Organizing bug report…" : "Structured into 6 fields automatically"}
          </span>
        </div>
      </div>

      {result && (
        <section>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
              Organized report
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-4">
            <BugReportCard
              bug={result}
              animate
              onDeleted={() => setResult(null)}
              onDocumentAnother={() => {
                setResult(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
