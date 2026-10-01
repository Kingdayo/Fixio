import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { History, Home, PenLine, User } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { initialsFrom } from "@/lib/bug-utils";
import { OrbitalLoader } from "@/components/OrbitalLoader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: Home },
  { to: "/document", label: "Document Bug", short: "Document", icon: PenLine },
  { to: "/history", label: "Bug History", short: "History", icon: History },
  { to: "/profile", label: "Profile", short: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading } = useSession();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const name = profile?.name || user?.user_metadata?.["name"] || "";
  const email = profile?.email || user?.email || "";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-brand font-display text-lg font-bold text-brand-foreground">
                Q
              </span>
              <span className="font-display text-lg font-semibold tracking-tight">Quill</span>
            </Link>
            <span className="ml-1 hidden rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
              Personal QA log
            </span>
          </div>

          <nav className="hidden items-center gap-1.5 md:flex">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground active:scale-95"
                activeProps={{ className: "bg-secondary text-foreground font-semibold shadow-xs" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground lg:inline">{today}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid size-9 place-items-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
                  aria-label="Account menu"
                >
                  {initialsFrom(name, email)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate font-medium">{name || "Your account"}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleSignOut()}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="animate-page-entry mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
        {sessionLoading ? (
          <OrbitalLoader label="Loading Quill…" sublabel="Initializing session" />
        ) : (
          children
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-brand" }}
            >
              <item.icon className="size-5" />
              {item.short}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
