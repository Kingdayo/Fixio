import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { bugReportText, formatBugDate, type Bug } from "@/lib/bug-utils";
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

type Props = {
  bug: Bug;
  onDocumentAnother?: () => void;
  onDeleted?: () => void;
  animate?: boolean;
};

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] leading-relaxed outline-none transition-colors focus:border-brand";

export function BugReportCard({ bug, onDocumentAnother, onDeleted, animate }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(bug);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("bugs")
      .update({
        title: draft.title.trim(),
        module: draft.module.trim(),
        description: draft.description.trim(),
        expected_result: draft.expected_result.trim(),
        actual_result: draft.actual_result.trim(),
      })
      .eq("id", bug.id);
    setSaving(false);

    if (error) {
      toast.error("Your changes could not be saved. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["bugs"] });
    await queryClient.invalidateQueries({ queryKey: ["bug", bug.id] });
    setEditing(false);
    toast.success("Bug updated successfully.");
  }

  async function handleDelete() {
    const { error } = await supabase.from("bugs").delete().eq("id", bug.id);
    if (error) {
      toast.error("This bug could not be deleted. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["bugs"] });
    setDeleteOpen(false);
    toast.success("Bug deleted successfully.");
    if (onDeleted) onDeleted();
    else navigate({ to: "/history" });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bugReportText(bug));
      toast.success("Report copied to your clipboard.");
    } catch {
      toast.error("Copying isn't available in this browser.");
    }
  }

  const display = editing ? draft : bug;

  return (
    <>
      <div
        className={`card-3d card-3d-hover relative overflow-hidden rounded-3xl p-6 sm:p-8 ${animate ? "animate-rise" : ""}`}
      >
        {/* Bubbly background glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-brand/10 blur-2xl animate-bubble-float" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5 items-center justify-center">
                <span className="absolute size-3 rounded-full bg-brand/40 animate-ping" />
                <span className="size-2 rounded-full bg-brand" />
              </span>
              <p className="label-eyebrow">Bug report</p>
            </div>
            {editing ? (
              <input
                className={`${fieldClass} mt-1.5 font-display text-xl font-bold`}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            ) : (
              <h2 className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl text-foreground">
                {display.title}
              </h2>
            )}
          </div>
          {!editing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/90 backdrop-blur-xs px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-brand" />
              {display.module}
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 bg-secondary/30 rounded-2xl p-4 sm:p-6 border border-border/60">
          <div>
            <p className="label-eyebrow">Module</p>
            {editing ? (
              <input
                className={`${fieldClass} mt-1.5`}
                value={draft.module}
                onChange={(event) => setDraft({ ...draft, module: event.target.value })}
              />
            ) : (
              <p className="mt-1 text-[15px] font-semibold text-foreground">{display.module}</p>
            )}
          </div>
          <div>
            <p className="label-eyebrow">Documented date</p>
            <p className="mt-1 text-[15px] font-medium text-foreground/90">
              {formatBugDate(bug.created_at)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="label-eyebrow">Description</p>
            {editing ? (
              <textarea
                rows={3}
                className={`${fieldClass} mt-1.5 resize-none`}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            ) : (
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">
                {display.description}
              </p>
            )}
          </div>
          <div>
            <p className="label-eyebrow">Expected result</p>
            {editing ? (
              <textarea
                rows={3}
                className={`${fieldClass} mt-1.5 resize-none`}
                value={draft.expected_result}
                onChange={(event) => setDraft({ ...draft, expected_result: event.target.value })}
              />
            ) : (
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">
                {display.expected_result}
              </p>
            )}
          </div>
          <div>
            <p className="label-eyebrow">Actual result</p>
            {editing ? (
              <textarea
                rows={3}
                className={`${fieldClass} mt-1.5 resize-none`}
                value={draft.actual_result}
                onChange={(event) => setDraft({ ...draft, actual_result: event.target.value })}
              />
            ) : (
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">
                {display.actual_result}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
          {editing ? (
            <>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="btn-tactile-brand rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-60 active:scale-95 transition-all"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => {
                  setDraft(bug);
                  setEditing(false);
                }}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setDraft(bug);
                  setEditing(true);
                }}
                className="btn-tactile-brand rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground active:scale-95 transition-all"
              >
                Edit
              </button>
              <button
                onClick={() => void handleCopy()}
                className="btn-tactile-secondary rounded-full bg-secondary px-6 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/80 active:scale-95 transition-all"
              >
                Copy report
              </button>
              <button
                onClick={() => setDeleteOpen(true)}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive active:scale-95"
              >
                Delete
              </button>
              {onDocumentAnother && (
                <button
                  onClick={onDocumentAnother}
                  className="btn-tactile-primary rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground active:scale-95 transition-all sm:ml-auto"
                >
                  + Document another bug
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bug?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete bug</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
