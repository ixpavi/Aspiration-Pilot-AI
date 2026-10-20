import { Link, useNavigate } from "react-router-dom";
import { BookOpenCheck, ClipboardList, FileSearch, Gauge, ListOrdered, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { useAuth } from "@/lib/AuthProvider";

const STEPS = [
  {
    title: "Reads your resume",
    body: "Pulls out 120+ skills (it knows ReactJS is React and k8s is Kubernetes), your roles, dates and degrees from a PDF, Word file or plain text.",
  },
  {
    title: "Ranks every role",
    body: "Scores each job on the skills it needs that you have, how closely your resume reads like the job, your years of experience and past titles.",
  },
  {
    title: "Tells you what's next",
    body: "Shows the exact skills standing between you and each role, with courses to close the gap, and how to make your resume stronger.",
  },
];

const FEATURES = [
  { icon: ListOrdered, title: "Ranked job matches", body: "See why each role fits, part by part, and save the ones worth chasing." },
  { icon: Gauge, title: "Resume score", body: "Seven checks recruiters' screening software cares about, with a fix for each one you miss." },
  { icon: BookOpenCheck, title: "Skills to learn", body: "The gaps that matter for your best matches, ranked, with links to courses and videos." },
  { icon: ClipboardList, title: "Application tracker", body: "Track roles from applied to offer without a spreadsheet." },
  { icon: FileSearch, title: "PDF and Word support", body: "Upload the resume you already have. No reformatting." },
  { icon: ShieldCheck, title: "Private by default", body: "Your resume is read in your browser. Only the results are saved to your account." },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user, continueAsGuest } = useAuth();

  function exploreDemo() {
    continueAsGuest();
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">Create account</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="container mx-auto grid items-center gap-10 px-4 pb-20 pt-8 lg:grid-cols-[5fr_7fr] lg:gap-14 lg:pt-14">
          <div className="max-w-xl">
            <h1 className="text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">
              See which jobs your resume already fits.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              CareerPath AI reads your resume the way screening software does, ranks real roles by how well you fit,
              and shows exactly which skills to learn next. Try it here: edit the sample or paste your own.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={user ? "/dashboard" : "/auth"}>{user ? "Open dashboard" : "Analyse my resume"}</Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" onClick={exploreDemo}>
                  Explore with demo data
                </Button>
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free. No resume leaves your browser.</p>
          </div>

          <LiveDemo />
        </section>

        <section className="border-y bg-muted/40 py-20" aria-labelledby="how-heading">
          <div className="container mx-auto px-4">
            <h2 id="how-heading" className="max-w-2xl text-3xl font-bold sm:text-4xl">
              How the matching works
            </h2>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-border md:block" aria-hidden="true" />}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20" aria-labelledby="features-heading">
          <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 id="features-heading" className="text-3xl font-bold sm:text-4xl">
                Everything in your dashboard
              </h2>
              <p className="mt-4 max-w-sm text-muted-foreground">
                One place to understand where you stand and decide what to do about it.
              </p>
            </div>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold">{title}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-foreground py-16 text-background">
          <div className="container mx-auto flex flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">Find out where you stand.</h2>
              <p className="mt-2 opacity-75">Upload your resume and get your matches in under a minute.</p>
            </div>
            <Button asChild size="lg" className="bg-marker text-[hsl(var(--marker-ink))] hover:bg-marker/90">
              <Link to={user ? "/dashboard" : "/auth"}>{user ? "Open dashboard" : "Create free account"}</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="container mx-auto flex flex-col items-start justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <Logo />
        <p>© {new Date().getFullYear()} CareerPath AI</p>
      </footer>
    </div>
  );
};

export default Landing;
