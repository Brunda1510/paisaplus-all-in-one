import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PaisaPluse — Track. Save. Grow." },
      {
        name: "description",
        content:
          "A student-first money app: track expenses, grow a money tree for every goal, and get AI savings insights.",
      },
      { property: "og:title", content: "PaisaPluse — Track. Save. Grow." },
      {
        property: "og:description",
        content: "Track expenses, grow money goals and get AI savings guidance.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: "🎯", title: "Money Tree Goals", text: "Watch a tree grow as your savings reach the target." },
  { icon: "📊", title: "Expense Tracker", text: "Log spends by category with live charts." },
  { icon: "🤖", title: "AI Insights", text: "Spot your biggest leaks from your real data." },
  { icon: "💰", title: "Smart Deposits", text: "Estimate maturity with compound interest." },
  { icon: "🔮", title: "Future Me", text: "Project savings years ahead." },
  { icon: "🏆", title: "Badges", text: "Earn rewards for real money habits." },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="brand-gradient grid size-9 place-items-center rounded-xl text-lg">🌱</span>
          <span className="font-display text-lg font-semibold">PaisaPluse</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Get started</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 text-center sm:pt-16">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          Track. Save. Grow.
        </p>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Your money, growing like a{" "}
          <span className="bg-clip-text text-transparent brand-gradient">money tree</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          PaisaPluse is a student-first finance app: real expense tracking, savings goals you can
          watch grow, deposit estimates and AI guidance — all in one place.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Create free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ mode: "login" }}>
              I already have an account
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="surface p-5">
            <span className="text-2xl" aria-hidden>
              {f.icon}
            </span>
            <h2 className="mt-3 font-display text-base font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
