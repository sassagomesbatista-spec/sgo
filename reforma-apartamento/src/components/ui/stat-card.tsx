import { clsx } from "clsx";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "accent" | "success" | "danger" | "gold";
}) {
  const toneClasses: Record<string, string> = {
    neutral: "text-foreground",
    accent: "text-accent",
    success: "text-success",
    danger: "text-danger",
    gold: "text-gold",
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={clsx("mt-1.5 text-xl font-semibold tabular-nums", toneClasses[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
