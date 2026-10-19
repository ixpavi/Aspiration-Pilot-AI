import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CareerProgress } from "@/components/profile/CareerProgress";
import { CareerPreferences } from "@/components/profile/CareerPreferences";
import { SkillRecommendations } from "@/components/profile/SkillRecommendations";
import { ProfileSettingsTab } from "@/components/profile/ProfileSettingsTab";
import { SavedOpportunities } from "@/components/profile/SavedOpportunities";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { useAuth } from "@/lib/AuthProvider";
import { GUEST_PROFILE } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

function GuestLock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create a free account to use this feature and save your progress.
        </p>
      </div>
      <Button asChild size="sm">
        <Link to="/auth">Create Free Account</Link>
      </Button>
    </div>
  );
}

export function CareerDashboardTabs() {
  const { isGuest } = useAuth();

  return (
    <Tabs defaultValue="progress" className="w-full">
      <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-6">
        <TabsTrigger value="progress">Career Progress</TabsTrigger>
        <TabsTrigger value="preferences">Goals &amp; Preferences</TabsTrigger>
        <TabsTrigger value="recommendations">Skill Recommendations</TabsTrigger>
        <TabsTrigger value="settings">Profile Settings</TabsTrigger>
        <TabsTrigger value="saved">Saved Items</TabsTrigger>
        <TabsTrigger value="resume">Resume Upload</TabsTrigger>
      </TabsList>

      {/* Career Progress — guests see demo data */}
      <TabsContent value="progress" className="mt-4">
        <CareerProgress guestProfile={isGuest ? GUEST_PROFILE : undefined} />
      </TabsContent>

      {/* Goals & Preferences — guests see demo data */}
      <TabsContent value="preferences" className="mt-4">
        <CareerPreferences guestProfile={isGuest ? GUEST_PROFILE : undefined} />
      </TabsContent>

      {/* Skill Recommendations — guests see demo data */}
      <TabsContent value="recommendations" className="mt-4">
        <SkillRecommendations guestProfile={isGuest ? GUEST_PROFILE : undefined} />
      </TabsContent>

      {/* Profile Settings — lock for guests */}
      <TabsContent value="settings" className="mt-4">
        {isGuest ? (
          <GuestLock label="Profile Settings require an account" />
        ) : (
          <ProfileSettingsTab />
        )}
      </TabsContent>

      {/* Saved Items — guests see demo job matches */}
      <TabsContent value="saved" className="mt-4">
        <SavedOpportunities guestProfile={isGuest ? GUEST_PROFILE : undefined} />
      </TabsContent>

      {/* Resume Upload — lock for guests */}
      <TabsContent value="resume" className="mt-4">
        {isGuest ? (
          <GuestLock label="Resume Upload requires an account" />
        ) : (
          <ResumeUpload />
        )}
      </TabsContent>
    </Tabs>
  );
}
