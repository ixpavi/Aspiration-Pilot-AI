import { cn } from "@/lib/utils";

// Fit shown as ten discrete blocks, like a gauge, so 70% and 75% read as
// "seven blocks" instead of a hairline difference in bar length.
export function FitMeter({
  value,
  size = "md",
  label,
}: {
  value: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * 10);
  const strong = value >= 0.75;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-label={label}
      className={cn("flex", size === "md" ? "gap-1" : "gap-0.5")}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-[2px]",
            size === "md" ? "h-2.5" : "h-1.5",
            i < filled ? (strong ? "bg-success" : "bg-primary") : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
