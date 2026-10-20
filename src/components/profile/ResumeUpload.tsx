import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Loader2, CheckCircle, X, Briefcase } from "lucide-react";
import { parseResumeFile, findJobMatches, type ParsedResume, type JobMatch } from "@/lib/ml-services";

type UploadStep = "idle" | "parsing" | "uploading" | "matching" | "done" | "error";

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  parsing: "Reading your resume…",
  uploading: "Uploading to cloud…",
  matching: "Finding job matches…",
  done: "Analysis complete!",
  error: "Something went wrong",
};

const STEP_PROGRESS: Record<UploadStep, number> = {
  idle: 0, parsing: 25, uploading: 55, matching: 80, done: 100, error: 0,
};

export function ResumeUpload() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<UploadStep>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [jobMatchCount, setJobMatchCount] = useState<number | null>(null);
  const [topMatches, setTopMatches] = useState<JobMatch[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const isWorking = step === "parsing" || step === "uploading" || step === "matching";

  async function processFile(file: File) {
    if (!file) return;

    // Validate file type
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF, Word document, or plain text file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10 MB.",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setParsedResume(null);
    setJobMatchCount(null);
    setTopMatches([]);

    try {
      // Step 1: Parse resume locally from File object (no CORS issues)
      setStep("parsing");
      const parsed = await parseResumeFile(file);
      setParsedResume(parsed);

      // Step 2: Upload to Supabase Storage
      setStep("uploading");
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not signed in",
          description: "Please log in to save your resume.",
          variant: "destructive",
        });
        setStep("error");
        return;
      }

      // Storage policy only allows uploads into a folder named after the user id
      const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(storagePath, file, { upsert: true });
      // Don't fail the whole flow if storage upload fails — parsed data is more important
      if (uploadError) console.warn("Resume upload to storage failed:", uploadError.message);

      // Step 3: Find job matches
      setStep("matching");
      const matches = await findJobMatches(parsed);
      const enrichedMatches = matches.slice(0, 10).map((m) => ({ ...m, saved: false }));
      setJobMatchCount(enrichedMatches.length);
      setTopMatches(enrichedMatches.slice(0, 5));

      // Step 4: Save parsed resume & matches to profile (upsert in case the
      // profile row was never created at signup)
      const { rawText: _rawText, ...parsedToSave } = parsed;
      const { error: saveError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            email: user.email ?? "",
            full_name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "User",
            parsed_resume: {
              ...parsedToSave,
              resumeUrl: uploadError ? undefined : storagePath,
            } as any,
            job_matches: enrichedMatches as any,
            skills: parsed.skills,
            ...(parsed.totalYearsExperience
              ? { experience_years: Math.round(parsed.totalYearsExperience) }
              : {}),
          },
          { onConflict: "user_id" }
        );
      if (saveError) {
        console.error("Saving analysis failed:", saveError);
        toast({
          title: "Analysis done, but not saved",
          description: saveError.message,
          variant: "destructive",
        });
      }

      setStep("done");
      toast({
        title: "Resume analyzed!",
        description: `Top match: ${enrichedMatches[0]?.title ?? "none"} (${Math.round((enrichedMatches[0]?.score ?? 0) * 100)}%)`,
      });
    } catch (err: any) {
      console.error("Resume processing error:", err);
      setStep("error");
      toast({
        title: "Failed to process resume",
        description: err?.message || "Please try again with a different file.",
        variant: "destructive",
      });
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function reset() {
    setStep("idle");
    setFileName(null);
    setParsedResume(null);
    setJobMatchCount(null);
    setTopMatches([]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Your Resume</CardTitle>
          <CardDescription>
            Upload a PDF or Word document — we'll extract your skills, experience, and match you to relevant jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Drop Zone */}
            <label
              htmlFor="resume-upload"
              className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40"}
                ${isWorking ? "pointer-events-none opacity-60" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                {isWorking ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : step === "done" ? (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                ) : (
                  <Upload className="w-10 h-10 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {step === "idle" ? "Click to upload or drag & drop" : STEP_LABELS[step]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT · Max 10 MB</p>
                </div>
                {fileName && (
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    {fileName}
                  </Badge>
                )}
              </div>
              <input
                id="resume-upload"
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileInput}
                disabled={isWorking}
              />
            </label>

            {/* Progress Bar */}
            {step !== "idle" && step !== "error" && (
              <div className="space-y-1">
                <Progress value={STEP_PROGRESS[step]} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{STEP_LABELS[step]}</p>
              </div>
            )}

            {/* Error state */}
            {step === "error" && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <span className="text-sm text-destructive">{STEP_LABELS.error}</span>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="w-4 h-4 mr-1" /> Try again
                </Button>
              </div>
            )}

            {/* Done — upload another */}
            {step === "done" && (
              <Button variant="outline" size="sm" onClick={reset} className="w-full">
                <Upload className="w-4 h-4 mr-2" /> Upload a different resume
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Results */}
      {parsedResume && step === "done" && (
        <>
          {/* Skills Card */}
          {parsedResume.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skills Detected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsedResume.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="capitalize">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No skills found */}
          {parsedResume.skills.length === 0 && (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground text-sm">
                No recognizable skills were detected. Try a text-based PDF (not a scanned image).
              </CardContent>
            </Card>
          )}

          {/* Experience Card */}
          {parsedResume.experience.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Experience Detected
                  {parsedResume.totalYearsExperience ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ~{parsedResume.totalYearsExperience} years total
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parsedResume.experience.map((exp, i) => (
                  <div key={i} className="p-3 border rounded-lg space-y-1">
                    <div className="font-medium text-sm">
                      {exp.title}
                      {exp.company && <span className="text-muted-foreground font-normal"> · {exp.company}</span>}
                    </div>
                    {exp.duration && (
                      <div className="text-xs text-muted-foreground">{exp.duration}</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Top Job Matches */}
          {topMatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Job Matches</CardTitle>
                <CardDescription>Ranked by skill coverage, resume similarity and experience fit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topMatches.map((m, i) => (
                  <div key={i} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{m.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.company}
                          {m.location ? ` · ${m.location}` : ""}
                          {m.salary_range ? ` · ${m.salary_range}` : ""}
                        </div>
                      </div>
                      <Badge>{Math.round(m.score * 100)}%</Badge>
                    </div>
                    <Progress value={m.score * 100} className="h-1.5" />
                    {m.missingSkills && m.missingSkills.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Skills to learn: {m.missingSkills.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Job Matches Summary */}
          {jobMatchCount !== null && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {jobMatchCount} job {jobMatchCount === 1 ? "match" : "matches"} found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Go to the <strong>Saved Items</strong> tab to view them.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}