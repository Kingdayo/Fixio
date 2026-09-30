import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Quill" },
      { name: "description", content: "Choose a new password for your Quill account." },
      { property: "og:title", content: "Set a new password — Quill" },
      { property: "og:description", content: "Choose a new password for your Quill account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-card p-6 shadow-card ring-1 ring-border sm:p-8"
      >
        <h1 className="font-display text-2xl font-bold">Set a new password</h1>
        <label className="mt-6 block text-sm font-medium" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-70"
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
