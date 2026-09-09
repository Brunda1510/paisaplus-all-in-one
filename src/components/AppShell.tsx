import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Menu, X, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { friendlyError } from "@/lib/finance";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/goals", label: "Goals", icon: "🎯" },
  { to: "/deposits", label: "Deposits", icon: "💰" },
  { to: "/expenses", label: "Expenses", icon: "📊" },
  { to: "/insights", label: "AI Insights", icon: "🤖" },
  { to: "/savings-plan", label: "Savings Plan", icon: "💡" },
  { to: "/badges", label: "Badges", icon: "🏆" },
  { to: "/chat", label: "AI Chat", icon: "💬" },
  { to: "/future-me", label: "Future Me", icon: "🔮" },
  { to: "/profile", label: "Profile", icon: "👤" },
] as const;

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Logged out");
    navigate({ to: "/auth" });
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}
      <button
        onClick={logout}
        className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LogOut className="size-4" aria-hidden />
        Logout
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto">{nav}</div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
        <Brand />
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>
      {open ? (
        <div className="sticky top-[57px] z-30 bg-sidebar px-4 pb-4 lg:hidden">{nav}</div>
      ) : null}

      <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-10")}>
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2">
      <span className="brand-gradient grid size-9 place-items-center rounded-xl text-lg shadow-glow">
        🌱
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-semibold text-sidebar-foreground">
          PaisaPluse
        </span>
        <span className="block text-[11px] text-sidebar-foreground/60">Track. Save. Grow.</span>
      </span>
    </Link>
  );
}
