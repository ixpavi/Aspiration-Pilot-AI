import { useState } from "react";
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FitMeter } from "@/components/career/FitMeter";
import type { JobMatch } from "@/lib/ml-engine";

export function learningLinks(skill: string) {
  const q = encodeURIComponent(skill);
  return [
    { label: "Courses", href: `https://www.coursera.org/search?query=${q}` },
    { label: "Videos", href: `https://www.youtube.com/results?search_query=learn+${q}` },
  ];
}

const BREAKDOWN_LABELS: { key: keyof NonNullable<JobMatch["breakdown"]>; label: string; weight: string }[] = [
  { key: "skills", label: "Required skills you have", weight: "50%" },
  { key: "similarity", label: "Resume similarity", weight: "25%" },
  { key: "experience", label: "Experience fit", weight: "15%" },
  { key: "title", label: "Past job titles", weight: "10%" },
];

function scoreTone(score: number) {
  if (score >= 0.75) return "text-success";
  if (score >= 0.5) return "text-primary";
  return "text-muted-foreground";
}

interface MatchCardProps {
  match: JobMatch & { saved?: boolean };
  rank?: number;
  saved?: boolean;
  onToggleSave?: () => void;
  tracked?: boolean;
  onTrack?: () => void;
  defaultOpen?: boolean;
}

export function MatchCard({ match, rank, saved, onToggleSave, tracked, onTrack, defaultOpen }: MatchCardProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const pct = Math.round(match.score * 100);
  const missing = match.missingSkills || [];
  const detailsId = `match-details-${rank ?? match.title.replace(/\W+/g, "-")}`;

  return (
    <article className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug">{match.title}</h3>
          <p className="text-sm text-muted-foreground">
            {[match.company, match.location, match.salary_range].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="text-right">
          <div className={cn("font-display text-3xl font-bold leading-none", scoreTone(match.score))}>{pct}%</div>
          <div className="mt-1 text-xs text-muted-foreground">match</div>
        </div>
      </div>

      <div className="mt-3">
        <FitMeter value={match.score} label={`${pct}% match for ${match.title}`} />
      </div>

      {match.matchingSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.matchingSkills.map((s) => (
            <span key={s} className="marker text-xs font-medium">{s}</span>
          ))}
          {missing.map((s) => (
            <span key={s} className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown className={cn("mr-1 h-4 w-4 transition-transform", open && "rotate-180")} />
          Why this match
        </Button>
        <div className="ml-auto flex gap-2">
          {onToggleSave && (
            <Button variant="outline" size="sm" onClick={onToggleSave} aria-pressed={!!saved}>
              {saved ? <BookmarkCheck className="mr-1.5 h-4 w-4" /> : <Bookmark className="mr-1.5 h-4 w-4" />}
              {saved ? "Saved" : "Save"}
            </Button>
          )}
          {onTrack && (
            <Button size="sm" onClick={onTrack} disabled={tracked}>
              <Send className="mr-1.5 h-4 w-4" />
              {tracked ? "Tracking" : "Track application"}
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div id={detailsId} className="mt-3 space-y-4 border-t pt-4">
          {match.breakdown ? (
            <dl className="space-y-2">
              {BREAKDOWN_LABELS.map(({ key, label, weight }) => {
                const v = Math.round((match.breakdown![key] ?? 0) * 100);
                return (
                  <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
                    <dt>
                      {label} <span className="text-xs text-muted-foreground">({weight} of score)</span>
                    </dt>
                    <dd className="tabular-nums text-muted-foreground">{v}%</dd>
                    <div className="col-span-2">
                      <FitMeter value={v / 100} size="sm" label={label} />
                    </div>
                  </div>
                );
              })}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Upload your resume again to see the full score breakdown.</p>
          )}

          {missing.length > 0 ? (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Skills to learn for this role</h4>
              <ul className="space-y-1.5">
                {missing.map((skill) => (
                  <li key={skill} className="flex flex-wrap items-center gap-x-3 text-sm">
                    <span className="font-medium">{skill}</span>
                    {learningLinks(skill).map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                      >
                        {l.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-success">You already have every skill this role asks for.</p>
          )}
        </div>
      )}
    </article>
  );
}
