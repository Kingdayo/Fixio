import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useSession } from "@/hooks/useSession";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fixio — Turn raw bug notes into QA reports" },
      {
        name: "description",
        content:
          "Paste a bug exactly as you observed it. Fixio writes the title, module, description, expected and actual result, and files it to your private history.",
      },
      { property: "og:title", content: "Fixio — Turn raw bug notes into QA reports" },
      {
        property: "og:description",
        content:
          "Paste a bug exactly as you observed it. Fixio writes the structured QA report and files it to your private history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Live motion background orbs */}
      <div className="pointer-events-none fixed top-12 left-12 size-96 rounded-full glow-orb-brand animate-float-drift z-0" />
      <div className="pointer-events-none fixed bottom-16 right-16 size-80 rounded-full glow-orb-info animate-float-drift z-0 [animation-delay:-5s]" />

      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-brand font-display text-lg font-bold text-brand-foreground shadow-sm animate-glow-bubble">
              F
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Fixio</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/auth"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-sm font-medium text-muted-foreground">Personal QA log</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Describe what broke. Get a proper bug report.
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-foreground/70">
          Paste the issue exactly as you saw it. Fixio writes the title, module, description,
          expected result and actual result, then files it to your own private history.
        </p>
        <div className="mt-8">
          <Link
            to="/auth"
            className="inline-flex rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-brand-foreground transition-transform active:scale-95"
          >
            Start documenting
          </Link>
        </div>

        <div className="mt-16 overflow-hidden rounded-3xl bg-card p-6 shadow-card ring-1 ring-border sm:p-8">
          <p className="label-eyebrow">You type</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/80">
            “Google sign up gives server error.”
          </p>
          <div className="my-6 h-px bg-border" />
          <p className="label-eyebrow">Fixio files</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold">
            Server Error During Google Sign-Up
          </h2>
          <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <p className="label-eyebrow">Module</p>
              <p className="mt-1 text-[15px] font-medium">Sign Up - Google</p>
            </div>
            <div>
              <p className="label-eyebrow">Expected result</p>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/80">
                The user should be able to complete registration using the Google sign-up option.
              </p>
            </div>
            <div>
              <p className="label-eyebrow">Description</p>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/80">
                When a user attempts to register using the Google sign-up option, the process
                results in a server error.
              </p>
            </div>
            <div>
              <p className="label-eyebrow">Actual result</p>
              <p className="mt-1 text-[15px] leading-relaxed text-foreground/80">
                The Google sign-up process returns a server error.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
