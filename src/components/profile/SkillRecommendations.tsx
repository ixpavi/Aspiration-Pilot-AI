import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSkillRecommendations, getSkillProgressInsights } from "@/lib/skill-recommendations";
import { ArrowUp, ArrowRight, Minus, Loader2, TrendingUp, Award } from "lucide-react";
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
        .single();

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
        title: "Success",
        description: `Added ${skill} to your learning journey`,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Skill Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 border rounded-lg"
              >
                {insight.type === 'fast-progress' ? (
                  <TrendingUp className="w-5 h-5 text-green-500 mt-1" />
                ) : (
                  <Award className="w-5 h-5 text-blue-500 mt-1" />
                )}
                <div>
                  <div className="font-medium">{insight.skill}</div>
                  <div className="text-sm text-gray-500">{insight.message}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.skill}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rec.skill}</span>
                      <Badge variant={
                        rec.growthTrend === 'rising' ? 'default' :
                        rec.growthTrend === 'stable' ? 'secondary' :
                        'outline'
                      }>
                        {rec.growthTrend === 'rising' && <ArrowUp className="w-3 h-3 mr-1" />}
                        {rec.growthTrend === 'stable' && <ArrowRight className="w-3 h-3 mr-1" />}
                                                {rec.growthTrend === 'declining' && <Minus className="w-3 h-3 mr-1" />}
                        {rec.growthTrend}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{rec.reason}</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => startLearningSkill(rec.skill)}
                  >
                    Start Learning
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Relevance</span>
                    <span>{Math.round(rec.relevance * 100)}%</span>
                  </div>
                  <Progress value={rec.relevance * 100} />
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div>
                    Required by {rec.requiredBy} jobs
                  </div>
                  <div>
                    Difficulty: {Array(rec.difficulty).fill('★').join('')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}