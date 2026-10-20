import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { GUEST_PROFILE } from "@/lib/AuthProvider";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CareerGoals = NonNullable<Profile["career_goals"]>;
type JobPreferences = NonNullable<Profile["job_preferences"]>;

interface Props {
  guestProfile?: typeof GUEST_PROFILE;
}

export function CareerPreferences({ guestProfile }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newLocation, setNewLocation] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newShortTermGoal, setNewShortTermGoal] = useState("");
  const [newLongTermGoal, setNewLongTermGoal] = useState("");
  const [minimumSalary, setMinimumSalary] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    if (guestProfile) {
      setProfile(guestProfile as any);
      if (guestProfile.job_preferences) {
        setRemoteOnly(guestProfile.job_preferences.remoteOnly);
        setMinimumSalary(guestProfile.job_preferences.minimumSalary?.toString() || "");
      }
      setLoading(false);
    } else {
      loadProfile();
    }
  }, [guestProfile]);

  function showGuestToast() {
    toast({
      title: "Create an account to save",
      description: "Sign up for free to save your career goals and preferences.",
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
      if (data?.job_preferences) {
        setRemoteOnly(data.job_preferences.remoteOnly);
        setMinimumSalary(data.job_preferences.minimumSalary?.toString() || "");
      }
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

  async function updateCareerGoals(goals: Partial<CareerGoals>) {
    if (!profile) return;
    if (guestProfile) { showGuestToast(); return; }

    try {
      const updatedGoals = {
        ...profile.career_goals,
        ...goals,
      };

      const { error } = await supabase
        .from("profiles")
        .update({ career_goals: updatedGoals })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        career_goals: updatedGoals,
      });

      toast({
        title: "Success",
        description: "Career goals updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update career goals",
        variant: "destructive",
      });
    }
  }

  async function updateJobPreferences(preferences: Partial<JobPreferences>) {
    if (!profile) return;
    if (guestProfile) { showGuestToast(); return; }

    try {
      const updatedPreferences = {
        ...profile.job_preferences,
        ...preferences,
      };

      const { error } = await supabase
        .from("profiles")
        .update({ job_preferences: updatedPreferences })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        job_preferences: updatedPreferences,
      });

      toast({
        title: "Success",
        description: "Job preferences updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job preferences",
        variant: "destructive",
      });
    }
  }

  function addLocation() {
    if (!newLocation.trim()) return;
    const locations = profile?.job_preferences?.preferredLocations || [];
    updateJobPreferences({
      preferredLocations: [...new Set([...locations, newLocation.trim()])],
    });
    setNewLocation("");
  }

  function removeLocation(location: string) {
    const locations = profile?.job_preferences?.preferredLocations || [];
    updateJobPreferences({
      preferredLocations: locations.filter(l => l !== location),
    });
  }

  function addIndustry() {
    if (!newIndustry.trim()) return;
    const industries = profile?.career_goals?.industries || [];
    updateCareerGoals({
      industries: [...new Set([...industries, newIndustry.trim()])],
    });
    setNewIndustry("");
  }

  function removeIndustry(industry: string) {
    const industries = profile?.career_goals?.industries || [];
    updateCareerGoals({
      industries: industries.filter(i => i !== industry),
    });
  }

  function addShortTermGoal() {
    if (!newShortTermGoal.trim()) return;
    const goals = profile?.career_goals?.shortTerm || [];
    updateCareerGoals({
      shortTerm: [...goals, newShortTermGoal.trim()],
    });
    setNewShortTermGoal("");
  }

  function addLongTermGoal() {
    if (!newLongTermGoal.trim()) return;
    const goals = profile?.career_goals?.longTerm || [];
    updateCareerGoals({
      longTerm: [...goals, newLongTermGoal.trim()],
    });
    setNewLongTermGoal("");
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
          <CardTitle>Career Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Short-term Goals</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a short-term goal"
                  value={newShortTermGoal}
                  onChange={(e) => setNewShortTermGoal(e.target.value)}
                />
                <Button onClick={addShortTermGoal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.career_goals?.shortTerm?.map((goal, index) => (
                  <Badge key={index} variant="secondary">
                    {goal}
                    <button
                      onClick={() => {
                        const goals = profile.career_goals?.shortTerm || [];
                        updateCareerGoals({
                          shortTerm: goals.filter((_, i) => i !== index),
                        });
                      }}
                      className="ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Long-term Goals</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a long-term goal"
                  value={newLongTermGoal}
                  onChange={(e) => setNewLongTermGoal(e.target.value)}
                />
                <Button onClick={addLongTermGoal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.career_goals?.longTerm?.map((goal, index) => (
                  <Badge key={index} variant="secondary">
                    {goal}
                    <button
                      onClick={() => {
                        const goals = profile.career_goals?.longTerm || [];
                        updateCareerGoals({
                          longTerm: goals.filter((_, i) => i !== index),
                        });
                      }}
                      className="ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Target Industries</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an industry"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                />
                <Button onClick={addIndustry}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.career_goals?.industries?.map((industry) => (
                  <Badge key={industry} variant="secondary">
                    {industry}
                    <button
                      onClick={() => removeIndustry(industry)}
                      className="ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Preferred Locations</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a location"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
                <Button onClick={addLocation}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.job_preferences?.preferredLocations?.map((location) => (
                  <Badge key={location} variant="secondary">
                    {location}
                    <button
                      onClick={() => removeLocation(location)}
                      className="ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Minimum Salary</Label>
              <Input
                type="number"
                placeholder="Enter minimum salary"
                value={minimumSalary}
                onChange={(e) => setMinimumSalary(e.target.value)}
                onBlur={() => {
                  const salary = parseInt(minimumSalary);
                  if (!isNaN(salary)) {
                    updateJobPreferences({ minimumSalary: salary });
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="remote-only"
                checked={remoteOnly}
                onCheckedChange={(checked) => {
                  setRemoteOnly(checked);
                  updateJobPreferences({ remoteOnly: checked });
                }}
              />
              <Label htmlFor="remote-only">Remote Only</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}