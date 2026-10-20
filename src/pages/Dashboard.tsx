import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  Target,
  Briefcase,
  BookOpen,
  Sparkles,
  CheckCircle,
  LogOut,
  User,
  Info,
} from "lucide-react";
import { CareerDashboardTabs } from "@/components/dashboard/CareerDashboardTabs";
import { ProfileEdit } from "@/components/profile/ProfileEdit";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/AuthProvider";

interface DashboardStats {
  careerScore: number;
  careerScoreSub: string;
  resumeSkillsCount: number;
  skillsCompleted: number;
  skillsTotal: number;
  applicationsCount: number;
  jobMatchesCount: number;
  userName: string;
  targetPosition: string;
}

const DEFAULT_CAREER_PATH = [
  { label: "Junior Developer", done: true },
  { label: "Mid-Level Developer", done: true },
  { label: "Senior Developer", done: false, current: true },
  { label: "Lead Developer", done: false },
  { label: "Software Architect", done: false },
];

type ScoredMatch = { title?: string; score?: number };

// Best resume match when there is one, otherwise the average self-assessed level.
function computeCareerScore(assessments: { level: number }[], matches: ScoredMatch[]) {
  const best = matches.reduce<ScoredMatch | null>(
    (top, m) => ((m.score ?? 0) > (top?.score ?? -1) ? m : top),
    null
  );
  if (best) {
    return { careerScore: Math.round((best.score ?? 0) * 100), careerScoreSub: `Best fit: ${best.title}` };
  }
  if (assessments.length > 0) {
    const avg = assessments.reduce((acc, s) => acc + s.level / 5, 0) / assessments.length;
    return { careerScore: Math.round(avg * 100), careerScoreSub: "Based on your assessed skills" };
  }
  return { careerScore: 0, careerScoreSub: "Upload a resume to get scored" };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isGuest, guestProfile, signOut } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    careerScore: 0,
    careerScoreSub: "Based on your skills",
    resumeSkillsCount: 0,
    skillsCompleted: 0,
    skillsTotal: 0,
    applicationsCount: 0,
    jobMatchesCount: 0,
    userName: "",
    targetPosition: "Software Architect",
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [careerPath, setCareerPath] = useState(DEFAULT_CAREER_PATH);

  // Redirect if not authenticated and not guest
  useEffect(() => {
    if (!loading && !user && !isGuest) {
      navigate("/auth");
    }
  }, [user, loading, isGuest, navigate]);

  // Load stats — guest uses guestProfile directly
  useEffect(() => {
    if (isGuest && guestProfile) {
      loadGuestStats();
    } else if (user) {
      loadUserData();
    }
  }, [user, isGuest, guestProfile]);

  function loadGuestStats() {
    if (!guestProfile) return;
    const skills = guestProfile.skill_assessments || [];
    const skillsCompleted = skills.filter((s) => s.level >= 3).length;
    const skillsTotal = skills.length;

    setStats({
      ...computeCareerScore(skills, guestProfile.job_matches || []),
      resumeSkillsCount: 0,
      skillsCompleted,
      skillsTotal,
      applicationsCount: 2,
      jobMatchesCount: guestProfile.job_matches?.length || 0,
      userName: guestProfile.full_name,
      targetPosition: guestProfile.target_position,
    });

    if (guestProfile.target_position) {
      setCareerPath([
        ...DEFAULT_CAREER_PATH.slice(0, -1),
        { label: guestProfile.target_position, done: false },
      ]);
    }

    setLoadingStats(false);
  }

  async function loadUserData() {
    setLoadingStats(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (profile) {
        const skills = profile.skill_assessments || [];
        const skillsCompleted = skills.filter((s: any) => s.level >= 3).length;
        const skillsTotal = skills.length;
        const jobMatches = Array.isArray(profile.job_matches) ? (profile.job_matches as ScoredMatch[]) : [];
        const resumeSkills = (profile.parsed_resume as { skills?: string[] } | null)?.skills || [];

        const { count: appCount } = await supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user!.id);

        if (profile.target_position) {
          setCareerPath([
            ...DEFAULT_CAREER_PATH.slice(0, -1),
            { label: profile.target_position, done: false },
          ]);
        }

        setStats({
          ...computeCareerScore(skills, jobMatches),
          resumeSkillsCount: resumeSkills.length,
          skillsCompleted,
          skillsTotal,
          applicationsCount: appCount || 0,
          jobMatchesCount: jobMatches.length,
          userName: profile.full_name || user!.email?.split("@")[0] || "there",
          targetPosition: profile.target_position || "Software Architect",
        });
      } else {
        setStats((prev) => ({
          ...prev,
          userName: user!.email?.split("@")[0] || "there",
        }));
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/auth");
  }

  const initials = stats.userName
    ? stats.userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "G";

  const insights = [
    {
      title: "Career Match Score",
      value: loadingStats ? "—" : `${stats.careerScore}%`,
      sub: stats.careerScoreSub,
      icon: <TrendingUp className="w-5 h-5 text-primary" />,
    },
    {
      title: "Skills Assessed",
      value: loadingStats ? "—" : `${stats.skillsCompleted}/${stats.skillsTotal}`,
      sub: stats.resumeSkillsCount > 0
        ? `${stats.resumeSkillsCount} skills found in your resume`
        : `${stats.skillsTotal} skills added`,
      icon: <Target className="w-5 h-5 text-primary" />,
    },
    {
      title: "Job Matches",
      value: loadingStats ? "—" : stats.jobMatchesCount.toString(),
      sub: "From your resume",
      icon: <Briefcase className="w-5 h-5 text-primary" />,
    },
  ];

  if (loading || (!user && !isGuest)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">CareerPath AI</span>
            {isGuest && (
              <Badge variant="secondary" className="text-xs ml-1">
                Guest
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {isGuest ? "Guest Explorer" : user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{isGuest ? "Exit" : "Sign Out"}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Guest Banner */}
        {isGuest && (
          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>
                You're exploring with <strong>demo data</strong>. Your changes won't be saved.{" "}
                <Link to="/auth" className="underline font-medium hover:text-primary">
                  Create a free account
                </Link>{" "}
                to save your progress.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Dashboard</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back,{" "}
            <span className="text-primary capitalize">
              {loadingStats ? "…" : stats.userName}
            </span>
            !
          </h1>
          <p className="text-muted-foreground">
            Here's your personalized career guidance for today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {insights.map((insight, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {insight.icon}
                  {insight.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">{insight.value}</div>
                <div className="text-sm text-muted-foreground">{insight.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabs */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <CareerDashboardTabs />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Career Path */}
            <Card>
              <CardHeader>
                <CardTitle>Career Path Progress</CardTitle>
                <CardDescription>Your journey to {stats.targetPosition}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {careerPath.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.done ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (step as any).current ? (
                      <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/10 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        step.done
                          ? "text-foreground"
                          : (step as any).current
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                    {(step as any).current && (
                      <Badge variant="secondary" className="text-xs ml-auto">
                        Current
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!isGuest && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowProfileEdit(true)}
                  >
                    <User className="mr-2 w-4 h-4" />
                    Edit Profile
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (isGuest) {
                      navigate("/auth");
                    } else {
                      setShowResumeUpload(true);
                    }
                  }}
                >
                  <BookOpen className="mr-2 w-4 h-4" />
                  {isGuest ? "Sign Up to Upload Resume" : "Upload Resume"}
                </Button>
                {!isGuest && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={loadUserData}
                  >
                    <TrendingUp className="mr-2 w-4 h-4" />
                    Refresh Stats
                  </Button>
                )}
                {isGuest && (
                  <Button asChild className="w-full">
                    <Link to="/auth">
                      <Sparkles className="mr-2 w-4 h-4" />
                      Create Free Account
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Dialogs — real users only */}
            {showProfileEdit && !isGuest && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
                <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
                  <ProfileEdit />
                  <Button variant="outline" onClick={() => { setShowProfileEdit(false); loadUserData(); }}>
                    Close & Refresh
                  </Button>
                </div>
              </div>
            )}

            {showResumeUpload && !isGuest && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
                <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
                  <ResumeUpload />
                  <Button variant="outline" onClick={() => { setShowResumeUpload(false); loadUserData(); }}>
                    Close & Refresh
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
