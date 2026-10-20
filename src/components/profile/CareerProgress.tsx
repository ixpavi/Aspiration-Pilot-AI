import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { GUEST_PROFILE } from "@/lib/AuthProvider";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type SkillAssessment = NonNullable<Profile["skill_assessments"]>[number];
type CareerProgress = NonNullable<Profile["career_progression"]>[number];

interface Props {
  guestProfile?: typeof GUEST_PROFILE;
}

export function CareerProgress({ guestProfile }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillAssessment | null>(null);
  const [skillLevel, setSkillLevel] = useState(1);
  const [newAchievement, setNewAchievement] = useState("");

  useEffect(() => {
    if (guestProfile) {
      // Use guest demo data directly — no Supabase call needed
      setProfile(guestProfile as any);
      setLoading(false);
    } else {
      loadProfile();
    }
  }, [guestProfile]);

  function showGuestToast() {
    toast({
      title: "Create an account to save",
      description: "Sign up for free to track your skills and progress.",
    });
  }

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }

  }

  async function addSkill() {
    if (!profile || !newSkill.trim()) return;
    if (guestProfile) { showGuestToast(); return; }

    try {
      const newSkillAssessment: SkillAssessment = {
        skill: newSkill.trim(),
        level: skillLevel,
        lastAssessed: new Date().toISOString(),
        endorsements: 0,
      };

      const updatedSkills = [
        ...(profile.skill_assessments || []),
        newSkillAssessment,
      ];

      const { error } = await supabase
        .from("profiles")
        .update({ skill_assessments: updatedSkills })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        skill_assessments: updatedSkills,
      });

      setNewSkill("");
      setSkillLevel(1);

      toast({
        title: "Success",
        description: "Skill added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add skill",
        variant: "destructive",
      });
    }
  }

  async function updateSkillLevel(skill: SkillAssessment, newLevel: number) {
    if (!profile) return;

    try {
      const updatedSkills = profile.skill_assessments?.map(s =>
        s.skill === skill.skill
          ? { ...s, level: newLevel, lastAssessed: new Date().toISOString() }
          : s
      );

      const { error } = await supabase
        .from("profiles")
        .update({ skill_assessments: updatedSkills })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        skill_assessments: updatedSkills,
      });

      toast({
        title: "Success",
        description: "Skill level updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update skill level",
        variant: "destructive",
      });
    }
  }

  async function addCareerProgress() {
    if (!profile || !newAchievement.trim()) return;

    try {
      const newProgress: CareerProgress = {
        date: new Date().toISOString(),
        title: profile.job_title || "",
        company: "",
        achievements: [newAchievement.trim()],
        skillsGained: [],
      };

      const updatedProgress = [
        ...(profile.career_progression || []),
        newProgress,
      ];

      const { error } = await supabase
        .from("profiles")
        .update({ career_progression: updatedProgress })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        career_progression: updatedProgress,
      });

      setNewAchievement("");

      toast({
        title: "Success",
        description: "Achievement added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add achievement",
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
          <CardTitle>Skills Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new skill"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
              />
              <Button onClick={addSkill}>
                <Plus className="w-4 h-4 mr-2" />
                Add Skill
              </Button>
            </div>
            
            <div className="grid gap-4">
              {profile?.skill_assessments?.map((skill) => (
                <div
                  key={skill.skill}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{skill.skill}</div>
                    <div className="text-sm text-gray-500">
                      Last assessed: {new Date(skill.lastAssessed).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="w-32">
                    <Slider
                      value={[skill.level]}
                      min={1}
                      max={5}
                      step={1}
                      onValueChange={([value]) => updateSkillLevel(skill, value)}
                    />
                  </div>
                  <Badge variant="secondary">
                    {skill.endorsements} endorsements
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Career Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new achievement"
                value={newAchievement}
                onChange={(e) => setNewAchievement(e.target.value)}
              />
              <Button onClick={addCareerProgress}>
                <Plus className="w-4 h-4 mr-2" />
                Add Achievement
              </Button>
            </div>

            <div className="space-y-4">
              {profile?.career_progression?.map((progress, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex justify-between">
                    <div className="font-medium">
                      {progress.title} at {progress.company}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(progress.date).toLocaleDateString()}
                    </div>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {progress.achievements.map((achievement, i) => (
                      <li key={i} className="text-sm">{achievement}</li>
                    ))}
                  </ul>
                  {progress.skillsGained.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {progress.skillsGained.map((skill, i) => (
                        <Badge key={i} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}