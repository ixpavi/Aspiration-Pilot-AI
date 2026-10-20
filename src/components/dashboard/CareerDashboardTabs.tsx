import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CareerProgress } from "@/components/profile/CareerProgress";
import { CareerPreferences } from "@/components/profile/CareerPreferences";
import { SkillRecommendations } from "@/components/profile/SkillRecommendations";
import { ProfileSettingsTab } from "@/components/profile/ProfileSettingsTab";
import { SavedOpportunities } from "@/components/profile/SavedOpportunities";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { ApplicationTracker } from "@/components/career/ApplicationTracker";
import { useAuth } from "@/lib/AuthProvider";
import { GUEST_PROFILE } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export type DashboardTab = "matches" | "resume" | "skills" | "applications" | "progress" | "goals" | "settings";

const TABS: { value: DashboardTab; label: string }[] = [
  { value: "matches", label: "Job matches" },
  { value: "resume", label: "Resume" },
  { value: "skills", label: "Skills to learn" },
  { value: "applications", label: "Applications" },
  { value: "progress", label: "Progress" },
  { value: "goals", label: "Goals" },
  { value: "settings", label: "Settings" },
];

function GuestLock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">Create a free account to use this and keep your progress.</p>
      </div>
      <Button asChild size="sm">
        <Link to="/auth">Create free account</Link>
      </Button>
    </div>
  );
}

interface Props {
  value: DashboardTab;
  onValueChange: (tab: DashboardTab) => void;
}

export function CareerDashboardTabs({ value, onValueChange }: Props) {
  const { isGuest } = useAuth();
  const guest = isGuest ? GUEST_PROFILE : undefined;

  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as DashboardTab)} className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/70 p-1">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="matches" className="mt-6">
        <SavedOpportunities guestProfile={guest} onUploadClick={() => onValueChange("resume")} />
      </TabsContent>

      <TabsContent value="resume" className="mt-6">
        {isGuest ? <GuestLock label="Resume analysis needs an account" /> : <ResumeUpload />}
      </TabsContent>

      <TabsContent value="skills" className="mt-6">
        <SkillRecommendations guestProfile={guest} />
      </TabsContent>

      <TabsContent value="applications" className="mt-6">
        {isGuest ? <GuestLock label="Application tracking needs an account" /> : <ApplicationTracker />}
      </TabsContent>

      <TabsContent value="progress" className="mt-6">
        <CareerProgress guestProfile={guest} />
      </TabsContent>

      <TabsContent value="goals" className="mt-6">
        <CareerPreferences guestProfile={guest} />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        {isGuest ? <GuestLock label="Settings need an account" /> : <ProfileSettingsTab />}
      </TabsContent>
    </Tabs>
  );
}
