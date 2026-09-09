import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon ? <span aria-hidden className="text-lg">{icon}</span> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        🌱
      </span>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface px-6 py-8 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-3 text-sm font-medium text-primary underline">
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function FieldError({ children }: { children?: string | undefined }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-destructive">{children}</p>;
}

export function Bar({ pct, className }: { pct: number; className?: string | undefined }) {
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="brand-gradient h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-xs italic text-muted-foreground">{children}</p>;
}
