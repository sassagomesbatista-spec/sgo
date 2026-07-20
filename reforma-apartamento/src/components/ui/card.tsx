import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("rounded-2xl border border-border bg-surface p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-foreground">{children}</h2>;
}

export function CardSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-xs text-muted-foreground">{children}</p>;
}
