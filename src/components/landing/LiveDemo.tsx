import { useEffect, useMemo, useState } from "react";
import { analyzeResumeText, rankJobs } from "@/lib/ml-engine";
import { BUILTIN_JOBS } from "@/lib/job-catalog";
import { cn } from "@/lib/utils";
import { FitMeter } from "@/components/career/FitMeter";

const SAMPLE = `Aarav Mehta
aarav.mehta@email.com | linkedin.com/in/aarav

SKILLS
Python, SQL, Pandas, Excel, Tableau, Git

EXPERIENCE
Data Analyst Intern at RetailCo
Jun 2024 - Present
• Built weekly sales dashboards in Tableau used by 12 store managers
• Automated a reporting script in Python, saving 6 hours a week

EDUCATION
B.Com, University of Mumbai
2021 - 2024`;

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function LiveDemo() {
  const [text, setText] = useState(SAMPLE);
  const debounced = useDebounced(text, 250);

  const result = useMemo(() => {
    const parsed = analyzeResumeText(debounced);
    return { parsed, matches: rankJobs(parsed, BUILTIN_JOBS).slice(0, 3) };
  }, [debounced]);

  const { parsed, matches } = result;
  const hasText = debounced.trim().length > 0;

  return (
    <div className="slab overflow-hidden rounded-lg bg-card">
      <div className="grid md:grid-cols-2">
        <div className="flex flex-col border-b-2 border-edge md:border-b-0 md:border-r-2">
          <div className="flex items-center justify-between px-4 pt-3">
            <label htmlFor="demo-resume" className="text-sm font-medium">
              Your resume
            </label>
            <button
              type="button"
              onClick={() => setText(text === SAMPLE ? "" : SAMPLE)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {text === SAMPLE ? "Clear to paste yours" : "Use the sample"}
            </button>
          </div>
          <textarea
            id="demo-resume"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder="Paste the text of your resume here"
            className="min-h-[280px] flex-1 resize-none bg-transparent px-4 pb-4 pt-2 font-sans text-[13px] leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground md:min-h-[400px]"
          />
        </div>

        <div className="space-y-5 bg-background p-4 sm:p-5" aria-live="polite">
          {!hasText ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Paste a resume on the left and results appear here as you type.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Found {parsed.skills.length} skills
                  {parsed.totalYearsExperience ? `, ${parsed.totalYearsExperience} yrs experience` : ""}
                </h3>
                <p className="mt-2 flex flex-wrap gap-1.5 text-sm">
                  {parsed.skills.length === 0 ? (
                    <span className="text-muted-foreground">No skills recognised yet.</span>
                  ) : (
                    parsed.skills.map((s) => (
                      <span key={s} className="marker font-medium">{s}</span>
                    ))
                  )}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Best-fitting roles</h3>
                <ol className="mt-2 space-y-3">
                  {matches.map((m) => {
                    const pct = Math.round(m.score * 100);
                    return (
                      <li key={m.title}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-semibold">{m.title}</span>
                          <span
                            className={cn(
                              "font-display text-lg font-bold tabular-nums",
                              pct >= 75 ? "text-success" : "text-primary"
                            )}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <FitMeter value={m.score} label={`${pct}% match for ${m.title}`} />
                        </div>
                        {m.missingSkills && m.missingSkills.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">To learn: {m.missingSkills.slice(0, 3).join(", ")}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>

              {parsed.quality && (
                <p className="border-t pt-4 text-sm">
                  Resume score <span className="font-display text-lg font-bold">{parsed.quality.score}</span>
                  <span className="text-muted-foreground">/100. </span>
                  <span className="text-muted-foreground">
                    {parsed.quality.checks.find((c) => !c.passed)?.tip ?? "Every check passed."}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
