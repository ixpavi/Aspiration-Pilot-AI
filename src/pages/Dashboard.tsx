import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ExternalLink, Info, LogOut, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CareerDashboardTabs, type DashboardTab } from "@/components/dashboard/CareerDashboardTabs";
import { ProfileEdit } from "@/components/profile/ProfileEdit";
import { PROFILE_UPDATED } from "@/components/profile/ResumeUpload";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { learningLinks } from "@/components/career/MatchCard";
import { APPLICATIONS_CHANGED } from "@/lib/applications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/AuthProvider";
import { cn } from "@/lib/utils";

type StoredMatch = { title?: string; company?: string; score?: number; missingSkills?: string[] };

interface Overview {
  name: string;
  bestMatch: StoredMatch | null;
  matchesCount: number;
  resumeScore: number | null;
  hasResume: boolean;
  applicationsCount: number;
  hasTargetRole: boolean;
}

const EMPTY: Overview = {
  name: "",
  bestMatch: null,
  matchesCount: 0,
  resumeScore: null,
  hasResume: false,
  applicationsCount: 0,
  hasTargetRole: false,
};

function bestOf(matches: StoredMatch[]): StoredMatch | null {
  return matches.reduce<StoredMatch | null>((top, m) => ((m.score ?? 0) > (top?.score ?? -1) ? m : top), null);
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isGuest, guestProfile, signOut } = useAuth();
  const [overview, setOverview] = useState<Overview>(EMPTY);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [tab, setTab] = useState<DashboardTab>("matches");

  useEffect(() => {
    if (!loading && !user && !isGuest) navigate("/auth");
  }, [user, loading, isGuest, navigate]);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      const matches = Array.isArray(profile?.job_matches) ? (profile!.job_matches as StoredMatch[]) : [];
      const parsed = profile?.parsed_resume as { quality?: { score: number } } | null;
      setOverview({
        name: profile?.full_name || user.email?.split("@")[0] || "there",
        bestMatch: bestOf(matches),
        matchesCount: matches.length,
        resumeScore: parsed?.quality?.score ?? null,
        hasResume: !!parsed,
        applicationsCount: count || 0,
        hasTargetRole: (profile?.career_goals?.targetRoles?.length ?? 0) > 0 || !!profile?.target_position,
      });
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    if (isGuest && guestProfile) {
      setOverview({
        name: guestProfile.full_name,
        bestMatch: bestOf(guestProfile.job_matches),
        matchesCount: guestProfile.job_matches.length,
        resumeScore: 72,
        hasResume: true,
        applicationsCount: 2,
        hasTargetRole: true,
      });
      setLoadingStats(false);
    } else if (user) {
      loadUserData();
    }
  }, [user, isGuest, guestProfile, loadUserData]);

  // Keep the overview in sync with uploads and application changes made in the tabs
  useEffect(() => {
    if (isGuest) return;
    window.addEventListener(PROFILE_UPDATED, loadUserData);
    window.addEventListener(APPLICATIONS_CHANGED, loadUserData);
    return () => {
      window.removeEventListener(PROFILE_UPDATED, loadUserData);
      window.removeEventListener(APPLICATIONS_CHANGED, loadUserData);
    };
  }, [isGuest, loadUserData]);

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
  }

  if (loading || (!user && !isGuest)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const o = overview;
  const dash = (v: string) => (loadingStats ? "–" : v);
  const gapSkill = o.bestMatch?.missingSkills?.[0];

  const stats = [
    {
      label: "Best match",
      value: dash(o.bestMatch ? `${Math.round((o.bestMatch.score ?? 0) * 100)}%` : "–"),
      sub: o.bestMatch ? o.bestMatch.title : "Upload a resume to see it",
    },
    {
      label: "Resume score",
      value: dash(o.resumeScore !== null ? `${o.resumeScore}` : "–"),
      sub: o.resumeScore !== null ? "out of 100" : "Not scored yet",
    },
    { label: "Job matches", value: dash(String(o.matchesCount)), sub: "ranked from your resume" },
    { label: "Applications", value: dash(String(o.applicationsCount)), sub: "being tracked" },
  ];

  const steps: { label: string; done: boolean; action: () => void; cta: string }[] = [
    { label: "Upload your resume", done: o.hasResume, action: () => setTab("resume"), cta: "Upload" },
    {
      label: o.resumeScore !== null && o.resumeScore < 85 ? `Raise your resume score from ${o.resumeScore} to 85` : "Get a resume score of 85+",
      done: (o.resumeScore ?? 0) >= 85,
      action: () => setTab("resume"),
      cta: "See tips",
    },
    { label: "Track your first application", done: o.applicationsCount > 0, action: () => setTab("matches"), cta: "Pick a job" },
    { label: "Set a target role", done: o.hasTargetRole, action: () => setTab("goals"), cta: "Set role" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {isGuest ? "Guest" : user?.email}
            </span>
            <ThemeToggle />
            {!isGuest && (
              <Button variant="ghost" size="icon" onClick={() => setShowProfileEdit(true)} aria-label="Edit profile">
                <UserPen className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-4 w-4" />
              {isGuest ? "Exit" : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isGuest && (
          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription>
              You're looking at demo data, so changes won't be saved.{" "}
              <Link to="/auth" className="font-medium underline underline-offset-4">
                Create a free account
              </Link>{" "}
              to analyse your own resume.
            </AlertDescription>
          </Alert>
        )}

        <h1 className="text-3xl font-bold sm:text-4xl">
          {loadingStats ? "Welcome back" : `Hi, ${o.name.split(" ")[0]}`}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {o.bestMatch && !loadingStats
            ? `Your resume fits ${o.bestMatch.title} best right now${gapSkill ? `. Learning ${gapSkill} would strengthen it.` : "."}`
            : "Upload your resume and we'll show which jobs you fit and what to learn next."}
        </p>

        <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border bg-card lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "p-4 sm:p-5",
                i % 2 === 1 && "border-l",
                i >= 2 && "border-t lg:border-t-0",
                i === 2 && "lg:border-l"
              )}
            >
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 font-display text-3xl font-bold">{s.value}</dd>
              <dd className="mt-0.5 truncate text-xs text-muted-foreground">{s.sub}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <CareerDashboardTabs value={tab} onValueChange={setTab} />
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border bg-card p-5" aria-labelledby="next-steps-heading">
              <div className="flex items-baseline justify-between">
                <h2 id="next-steps-heading" className="text-lg font-semibold">Next steps</h2>
                <span className="text-sm text-muted-foreground">{doneCount} of {steps.length} done</span>
              </div>
              <ol className="mt-4 space-y-3">
                {steps.map((step) => (
                  <li key={step.label} className="flex items-start gap-3">
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-label="Done" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-label="To do" />
                    )}
                    <div className="flex-1 text-sm">
                      <span className={cn(step.done && "text-muted-foreground line-through")}>{step.label}</span>
                    </div>
                    {!step.done && !isGuest && (
                      <button onClick={step.action} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                        {step.cta}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {gapSkill && (
              <section className="rounded-xl border bg-card p-5" aria-labelledby="learn-next-heading">
                <h2 id="learn-next-heading" className="text-lg font-semibold">Learn next</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="marker font-medium">{gapSkill}</span> is the missing skill for your best
                  match, {o.bestMatch?.title}.
                </p>
                <div className="mt-3 flex gap-3 text-sm">
                  {learningLinks(gapSkill).map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {l.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      {showProfileEdit && !isGuest && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Edit profile">
          <div className="fixed left-1/2 top-1/2 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
            <ProfileEdit />
            <Button variant="outline" onClick={() => { setShowProfileEdit(false); loadUserData(); }}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
