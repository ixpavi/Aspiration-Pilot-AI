import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FitMeter } from "@/components/career/FitMeter";
import { learningLinks } from "@/components/career/MatchCard";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSkillRecommendations, getSkillProgressInsights } from "@/lib/skill-recommendations";
import { ExternalLink, Loader2, TrendingUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { GUEST_PROFILE } from "@/lib/AuthProvider";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface SkillRecommendation {
  skill: string;
  relevance: number;
  reason: string;
  requiredBy: number;
  growthTrend: 'rising' | 'stable' | 'declining';
  difficulty: 1 | 2 | 3 | 4 | 5;
}

interface SkillInsight {
  skill: string;
  type: string;
  message: string;
}

interface Props {
  guestProfile?: typeof GUEST_PROFILE;
}

export function SkillRecommendations({ guestProfile }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recommendations, setRecommendations] = useState<SkillRecommendation[]>([]);
  const [insights, setInsights] = useState<SkillInsight[]>([]);

  useEffect(() => {
    if (guestProfile) {
      loadGuestRecommendations();
    } else {
      loadProfileAndRecommendations();
    }
  }, [guestProfile]);

  async function loadGuestRecommendations() {
    setProfile(guestProfile as any);
    const [recs, ins] = await Promise.all([
      getSkillRecommendations(guestProfile as any),
      getSkillProgressInsights(guestProfile as any),
    ]);
    setRecommendations(recs);
    setInsights(ins);
    setLoading(false);
  }

  async function loadProfileAndRecommendations() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(profile);

      if (profile) {
        const [recommendations, insights] = await Promise.all([
          getSkillRecommendations(profile),
          getSkillProgressInsights(profile)
        ]);

        setRecommendations(recommendations);
        setInsights(insights);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }


  async function startLearningSkill(skill: string) {
    if (!profile) return;
    if (guestProfile) {
      toast({
        title: "Create an account to track learning",
        description: "Sign up for free to add skills to your learning journey.",
      });
      return;
    }

    try {
      const updatedSkills = [
        ...(profile.skills || []),
        skill
      ];

      const newAssessment = {
        skill,
        level: 1,
        lastAssessed: new Date().toISOString(),
        endorsements: 0
      };

      const updatedAssessments = [
        ...(profile.skill_assessments || []),
        newAssessment
      ];

      const { error } = await supabase
        .from("profiles")
        .update({
          skills: updatedSkills,
          skill_assessments: updatedAssessments
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        skills: updatedSkills,
        skill_assessments: updatedAssessments
      });

      // Remove the skill from recommendations
      setRecommendations(prev => prev.filter(r => r.skill !== skill));

      toast({
        title: `Added ${skill} to your skills`,
        description: "Track your level in the Progress tab.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add skill",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const DIFFICULTY = ["", "Beginner", "Easy", "Intermediate", "Advanced", "Expert"];

  return (
    <div className="space-y-8">
      <section aria-labelledby="skills-to-learn-heading">
        <h2 id="skills-to-learn-heading" className="text-xl font-semibold">Skills to learn</h2>
        <p className="text-sm text-muted-foreground">
          Ranked by how much each one would improve your best matches.
        </p>

        {recommendations.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Upload your resume to get recommendations based on your matches.
          </div>
        ) : (
          <ol className="mt-4 divide-y rounded-lg border bg-card">
            {recommendations.map((rec, i) => (
              <li key={rec.skill} className="grid gap-3 p-4 sm:grid-cols-[2rem_1fr_auto] sm:items-center">
                <span className="hidden font-display text-lg font-bold text-muted-foreground sm:block">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold">{rec.skill}</span>
                    <span className="text-xs text-muted-foreground">
                      {DIFFICULTY[rec.difficulty]}, needed by {rec.requiredBy} {rec.requiredBy === 1 ? "role" : "roles"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                  <div className="mt-2 max-w-xs">
                    <FitMeter value={rec.relevance} size="sm" label={`Relevance of ${rec.skill}`} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {learningLinks(rec.skill).map((l) => (
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
                  <Button variant="outline" size="sm" onClick={() => startLearningSkill(rec.skill)}>
                    I'm learning this
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {insights.length > 0 && (
        <section aria-labelledby="skill-insights-heading">
          <h2 id="skill-insights-heading" className="text-xl font-semibold">Progress notes</h2>
          <ul className="mt-3 space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex gap-3 rounded-lg border bg-card p-4 text-sm">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>{insight.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
