import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { structureBug } from "@/lib/bugs.functions";
import type { Bug } from "@/lib/bug-utils";
import { BugReportCard } from "@/components/BugReportCard";
import { OrbitalLoader } from "@/components/OrbitalLoader";

export function BugComposer({ heading = "Document a new bug" }: { heading?: string }) {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Bug | null>(null);
  const run = useServerFn(structureBug);
  const queryClient = useQueryClient();

  async function handleSubmit() {
    if (busy) return;

    if (!raw.trim()) {
      toast.error("Please describe the bug before continuing.");
      return;
    }

    setBusy(true);
    try {
      const outcome = await run({ data: { rawInput: raw } });
      if (!outcome.ok) {
        if (outcome.reason === "empty" || outcome.reason === "insufficient") {
          toast.error(
            "Please provide a little more detail about the issue so it can be documented accurately.",
          );
        } else if (outcome.reason === "rate_limit") {
          toast.error(
            "AI processing is temporarily unavailable. Quota or rate limit reached. Please try again later.",
          );
        } else if (outcome.reason === "missing_key") {
          toast.error("AI processing is temporarily unavailable. Please try again later.");
        } else if (outcome.reason === "save") {
          toast.error("Bug processing succeeded, but saving failed. Please try again.");
        } else {
          toast.error("Unable to process the bug right now. Please try again.");
        }
        return;
      }

      setResult(outcome.bug as Bug);
      setRaw("");
      await queryClient.invalidateQueries({ queryKey: ["bugs"] });
      toast.success("Bug documented successfully. Saved to your bug history.");
    } catch (error) {
      console.error("Bug processing failed:", error);
      toast.error("Unable to process the bug right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="card-3d relative overflow-hidden rounded-3xl p-6 sm:p-8">
        {/* Glowing bubbly backdrop decoration */}
        <div className="pointer-events-none absolute -top-20 -right-20 size-60 rounded-full bg-brand/10 blur-2xl animate-bubble-float" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-info/10 blur-2xl animate-bubble-float [animation-delay:-2.5s]" />

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <span className="relative grid size-7 place-items-center rounded-lg bg-brand/10 text-brand shadow-sm">
            <span className="absolute size-4 rounded-full bg-brand/20 animate-ping" />
            <span className="block size-3 rounded-full bg-brand animate-pulse" />
          </span>
          <h2 className="font-display text-xl font-bold tracking-tight">{heading}</h2>
          <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            Paste raw observation
          </span>
        </div>

        <div className="relative mt-5">
          <textarea
            rows={5}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            disabled={busy}
            className="w-full resize-none rounded-2xl border-2 border-border/80 bg-background/80 px-4.5 py-4 text-[15px] leading-relaxed outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-brand focus:bg-card focus:shadow-[0_0_0_4px_oklch(0.679_0.2_38/0.15)] disabled:opacity-60"
            placeholder="Example: When a learner tries to log in through the web version on a mobile device, they are redirected to the App Store instead of the dashboard."
          />

          {/* Unique Animated Loading Overlay */}
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-card/90 backdrop-blur-md animate-scale-in z-10 p-6 text-center shadow-lg">
              <OrbitalLoader
                label="Structuring QA Bug Report…"
                sublabel="Extracting titles, modules, expectations, and factual context"
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => void handleSubmit()}
            disabled={busy || !raw.trim()}
            className={`btn-tactile-brand rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-brand-foreground transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              busy ? "animate-shimmer-btn" : ""
            }`}
          >
            {busy ? "Organizing bug…" : "Document bug"}
          </button>
          <button
            onClick={() => setRaw("")}
            disabled={busy || !raw}
            className="rounded-full px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all active:scale-95 disabled:opacity-40"
          >
            Clear
          </button>
          <span className="ml-auto hidden text-xs font-medium text-muted-foreground sm:inline-flex items-center gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
            <span className="size-1.5 rounded-full bg-brand" />
            Structured automatically into 6 fields
          </span>
        </div>
      </div>

      {result && (
        <section className="animate-scale-in">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-brand/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.15em] text-brand">
              Organized report
            </span>
            <span className="h-px flex-1 bg-border/80" />
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
