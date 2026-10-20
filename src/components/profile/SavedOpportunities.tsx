import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bookmark } from "lucide-react";
import { GUEST_PROFILE } from "@/lib/AuthProvider";

type JobMatch = {
  title: string;
  company: string;
  score: number;
  matchingSkills: string[];
  saved?: boolean;
  link?: string;
};

type SavedCourse = {
  id: string;
  title: string;
  provider: string;
  focusArea: string;
  link: string;
  saved: boolean;
};

const defaultCourses: SavedCourse[] = [
  {
    id: "aws-ai",
    title: "AWS Machine Learning Specialty",
    provider: "Amazon Web Services",
    focusArea: "Cloud & AI",
    link: "https://www.aws.training",
    saved: false,
  },
  {
    id: "meta-front-end",
    title: "Meta Front-End Developer Professional Certificate",
    provider: "Coursera",
    focusArea: "Front-end Engineering",
    link: "https://www.coursera.org",
    saved: false,
  },
  {
    id: "mit-ai",
    title: "Machine Learning with Python",
    provider: "MIT xPro",
    focusArea: "Data Science",
    link: "https://xpro.mit.edu",
    saved: false,
  },
];

interface Props {
  guestProfile?: typeof GUEST_PROFILE;
}

export function SavedOpportunities({ guestProfile }: Props) {
  const { toast } = useToast();
  const [loadingMatches, setLoadingMatches] = useState(!guestProfile);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>(
    guestProfile ? (guestProfile.job_matches as JobMatch[]) : []
  );
  const [courses, setCourses] = useState<SavedCourse[]>(defaultCourses);
  const [showAllMatches, setShowAllMatches] = useState(!!guestProfile); // guests see all matches by default

  useEffect(() => {
    if (guestProfile) {
      // Guest data already loaded in initial state — nothing to do
      setLoadingMatches(false);
      return;
    }
    const storedCourses =
      typeof window !== "undefined"
        ? window.localStorage.getItem("aspiration-saved-courses")
        : null;

    if (storedCourses) {
      try {
        const parsed = JSON.parse(storedCourses) as SavedCourse[];
        setCourses(parsed);
      } catch (error) {
        console.warn("Unable to parse saved courses from storage", error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "aspiration-saved-courses",
        JSON.stringify(courses)
      );
    }
  }, [courses]);

  useEffect(() => {
    const loadMatches = async () => {
      setLoadingMatches(true);
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setLoadingMatches(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("job_matches")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (error) {
        toast({
          title: "Unable to load job matches",
          description: "Please try again later.",
          variant: "destructive",
        });
        setLoadingMatches(false);
        return;
      }

      const matches = (data?.job_matches as JobMatch[] | null) ?? [];
      setJobMatches(
        matches.map((match) => ({
          ...match,
          saved: match.saved ?? false,
        }))
      );
      setLoadingMatches(false);
    };

    loadMatches();
  }, [toast]);

  const savedJobs = useMemo(
    () => jobMatches.filter((match) => match.saved),
    [jobMatches]
  );

  const savedCourses = useMemo(
    () => courses.filter((course) => course.saved),
    [courses]
  );

  const matchesToDisplay = showAllMatches ? jobMatches : savedJobs;

  const toggleJobSaved = async (index: number) => {
    const updatedMatches = jobMatches.map((match, idx) =>
      idx === index ? { ...match, saved: !match.saved } : match
    );

    setJobMatches(updatedMatches);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      toast({
        title: "Sign in required",
        description: "Log in to keep items in your saved list.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ job_matches: updatedMatches as unknown as JobMatch[] })
      .eq("user_id", authData.user.id);

    if (error) {
      toast({
        title: "Couldn't update saved jobs",
        description: "Please try again.",
        variant: "destructive",
      });
      return;
    }

    const isSavedNow = updatedMatches[index].saved;
    toast({
      title: isSavedNow ? "Job saved" : "Job removed",
      description: isSavedNow
        ? "We'll keep this role handy for you."
        : "This role has been removed from your saved list.",
    });
  };

  const toggleCourseSaved = (courseId: string) => {
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId
          ? {
              ...course,
              saved: !course.saved,
            }
          : course
      )
    );

    const course = courses.find((item) => item.id === courseId);
    const isSaved = course?.saved;

    toast({
      title: isSaved ? "Course removed" : "Course saved",
      description: isSaved
        ? "The course has been removed from your saved list."
        : "Course added to your saved learning plan.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Saved Roles</CardTitle>
          <CardDescription>
            Keep track of the jobs that match your resume and feel worth
            revisiting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {showAllMatches
                ? "Showing every role we've analyzed from your resume."
                : "Showing only the positions you've saved."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllMatches((prev) => !prev)}
            >
              {showAllMatches ? "View saved" : "View all matches"}
            </Button>
          </div>

          {loadingMatches ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading matches…
            </div>
          ) : matchesToDisplay.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Bookmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">No saved roles yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your resume or browse recommendations to save roles that
                inspire you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchesToDisplay.map((match, index) => (
                <div
                  key={`${match.title}-${match.company}-${index}`}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {match.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {match.company}
                      </p>
                    </div>
                    <Button
                      variant={match.saved ? "secondary" : "outline"}
                      onClick={() => toggleJobSaved(jobMatches.indexOf(match))}
                    >
                      {match.saved ? "Saved" : "Save role"}
                    </Button>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Match score: {(match.score * 100).toFixed(0)}%</Badge>
                    {match.matchingSkills.slice(0, 5).map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  {match.link && (
                    <Button
                      variant="link"
                      className="mt-2 px-0"
                      onClick={() => window.open(match.link, "_blank")}
                    >
                      View posting
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Saved Courses & Certifications</CardTitle>
          <CardDescription>
            Build a learning path that supports your next career move.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedCourses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium text-foreground">No saved courses yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap the save button on any course to keep it on your radar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedCourses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {course.provider} • {course.focusArea}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(course.link, "_blank")}
                      >
                        Explore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCourseSaved(course.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Not seeing the right course? Save one of these recommendations to
              build your personalized learning list.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {courses.map((course) => (
                <div
                  key={`suggested-${course.id}`}
                  className="rounded-lg border p-4"
                >
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {course.provider} • {course.focusArea}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="link"
                        className="px-0"
                        onClick={() => window.open(course.link, "_blank")}
                      >
                        View
                      </Button>
                      <Button
                        variant={course.saved ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleCourseSaved(course.id)}
                      >
                        {course.saved ? "Saved" : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
