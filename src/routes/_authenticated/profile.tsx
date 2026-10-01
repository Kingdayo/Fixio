import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useBugs } from "@/hooks/useBugs";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { formatBugDate } from "@/lib/bug-utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Quill" },
      { name: "description", content: "Manage your name, password and account details in Quill." },
      { property: "og:title", content: "Profile — Quill" },
      {
        property: "og:description",
        content: "Manage your name, password and account details in Quill.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-brand";

function ProfilePage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: bugs = [] } = useBugs();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile?.name !== undefined) setName(profile.name);
  }, [profile?.name]);

  async function handleSaveName() {
    if (!user) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", user.id);
    setSavingName(false);
    if (error) {
      toast.error("Your name could not be saved. Please try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Profile updated successfully.");
  }

  async function handleChangePassword() {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success("Password updated successfully.");
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell>
      <p className="label-eyebrow">Profile</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Your account
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <p className="label-eyebrow">Bugs documented</p>
          <p className="mt-2 font-display text-3xl font-bold">{bugs.length}</p>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <p className="label-eyebrow">Email</p>
          <p className="mt-2 truncate text-[15px] font-medium">{profile?.email || user?.email}</p>
        </div>
        <div className="rounded-2xl bg-card p-5 shadow-card ring-1 ring-border">
          <p className="label-eyebrow">Member since</p>
          <p className="mt-2 text-[15px] font-medium">
            {profile?.created_at ? formatBugDate(profile.created_at) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-card p-6 shadow-card ring-1 ring-border">
          <h2 className="font-display text-lg font-semibold">Name</h2>
          <label className="mt-4 block text-sm font-medium" htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button
            onClick={() => void handleSaveName()}
            disabled={savingName || !name.trim()}
            className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            {savingName ? "Saving…" : "Save name"}
          </button>
        </section>

        <section className="rounded-3xl bg-card p-6 shadow-card ring-1 ring-border">
          <h2 className="font-display text-lg font-semibold">Password</h2>
          <label className="mt-4 block text-sm font-medium" htmlFor="current-password">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            className={inputClass}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="profile-new-password">
            New password
          </label>
          <input
            id="profile-new-password"
            type="password"
            minLength={8}
            className={inputClass}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button
            onClick={() => void handleChangePassword()}
            disabled={savingPassword || newPassword.length < 8 || !currentPassword}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
          >
            {savingPassword ? "Saving…" : "Change password"}
          </button>
        </section>
      </div>

      <button
        onClick={() => void handleSignOut()}
        className="mt-8 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground transition-transform active:scale-95"
      >
        Log out
      </button>
    </AppShell>
  );
}
