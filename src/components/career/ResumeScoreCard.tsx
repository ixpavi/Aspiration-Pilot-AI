import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResumeScore } from "@/lib/ml-engine";

function verdict(score: number) {
  if (score >= 85) return "Ready to send";
  if (score >= 60) return "Good, with a few fixes";
  return "Needs work before you apply";
}

export function ResumeScoreCard({ quality }: { quality: ResumeScore }) {
  const { score, checks } = quality;
  const circumference = 2 * Math.PI * 34;
  const failing = checks.filter((c) => !c.passed);

  return (
    <section className="rounded-xl border bg-card p-5" aria-labelledby="resume-score-heading">
      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="8" className="stroke-muted" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={cn(score >= 85 ? "stroke-success" : score >= 60 ? "stroke-primary" : "stroke-destructive")}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold">
            {score}
          </div>
        </div>
        <div>
          <h3 id="resume-score-heading" className="text-lg font-semibold">Resume score</h3>
          <p className="text-sm text-muted-foreground">{verdict(score)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {checks.length - failing.length} of {checks.length} checks passed
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {[...failing, ...checks.filter((c) => c.passed)].map((c) => (
          <li key={c.id} className="flex gap-2.5 text-sm">
            {c.passed ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Passed" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-label="Not passed" />
            )}
            <div>
              <span className={cn("font-medium", c.passed && "text-muted-foreground")}>{c.label}</span>
              {!c.passed && <p className="text-muted-foreground">{c.tip}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
