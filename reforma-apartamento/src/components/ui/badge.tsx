const COLOR_CLASSES: Record<string, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  warning: "bg-warning-bg text-warning-fg",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  info: "bg-secondary/15 text-secondary",
  gold: "bg-gold/15 text-gold",
};

export function Badge({
  children,
  color = "neutral",
}: {
  children: React.ReactNode;
  color?: "neutral" | "warning" | "success" | "danger" | "info" | "gold";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${COLOR_CLASSES[color]}`}
    >
      {children}
    </span>
  );
}
