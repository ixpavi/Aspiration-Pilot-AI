import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GUEST_PROFILE } from "@/lib/AuthProvider";
import { MatchCard } from "@/components/career/MatchCard";
import { PROFILE_UPDATED } from "@/components/profile/ResumeUpload";
import { addApplication, listApplications } from "@/lib/applications";
import type { JobMatch } from "@/lib/ml-engine";

type StoredMatch = JobMatch & { saved?: boolean };

interface Props {
  guestProfile?: typeof GUEST_PROFILE;
  onUploadClick?: () => void;
}

const keyOf = (m: { title: string; company: string }) => `${m.title}|${m.company}`;

export function SavedOpportunities({ guestProfile, onUploadClick }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(!guestProfile);
  const [matches, setMatches] = useState<StoredMatch[]>(guestProfile ? (guestProfile.job_matches as StoredMatch[]) : []);
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const [tracked, setTracked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }
    const [{ data, error }, apps] = await Promise.all([
      supabase.from("profiles").select("job_matches").eq("user_id", auth.user.id).maybeSingle(),
      listApplications().catch(() => []),
    ]);
    if (error) {
      toast({ title: "Couldn't load your job matches", description: error.message, variant: "destructive" });
    } else {
      const stored = Array.isArray(data?.job_matches) ? (data!.job_matches as unknown as StoredMatch[]) : [];
      setMatches(stored.map((m) => ({ ...m, saved: m.saved ?? false })));
    }
    setTracked(new Set(apps.map((a) => keyOf({ title: a.position, company: a.company }))));
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (guestProfile) return;
    load();
    window.addEventListener(PROFILE_UPDATED, load);
    return () => window.removeEventListener(PROFILE_UPDATED, load);
  }, [guestProfile, load]);

  const visible = useMemo(() => (filter === "saved" ? matches.filter((m) => m.saved) : matches), [filter, matches]);

  async function toggleSaved(index: number) {
    const target = visible[index];
    const updated = matches.map((m) => (m === target ? { ...m, saved: !m.saved } : m));
    setMatches(updated);
    if (guestProfile) return;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ job_matches: updated as never })
      .eq("user_id", auth.user.id);
    if (error) {
      setMatches(matches);
      toast({ title: "Couldn't update saved jobs", description: error.message, variant: "destructive" });
    }
  }

  async function track(m: StoredMatch) {
    try {
      await addApplication({ position: m.title, company: m.company, location: m.location, salary_range: m.salary_range });
      setTracked((prev) => new Set(prev).add(keyOf(m)));
      toast({ title: "Added to Applications", description: `${m.title} at ${m.company}` });
    } catch (err) {
      toast({ title: "Couldn't track application", description: (err as Error).message, variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-semibold">No job matches yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Upload your resume and we'll rank roles by how well you fit them, and show what's missing.
        </p>
        {onUploadClick && (
          <Button className="mt-4" onClick={onUploadClick}>
            Upload resume
          </Button>
        )}
      </div>
    );
  }

  const savedCount = matches.filter((m) => m.saved).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Job matches</h2>
          <p className="text-sm text-muted-foreground">Ranked by how well your resume fits each role.</p>
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as "all" | "saved")}
          className="rounded-lg border p-0.5"
          aria-label="Filter job matches"
        >
          <ToggleGroupItem value="all" size="sm">All {matches.length}</ToggleGroupItem>
          <ToggleGroupItem value="saved" size="sm">Saved {savedCount}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing saved yet. Use Save on any match to keep it here.
        </div>
      ) : (
        visible.map((m, i) => (
          <MatchCard
            key={keyOf(m)}
            match={m}
            rank={i}
            saved={m.saved}
            onToggleSave={() => toggleSaved(i)}
            tracked={tracked.has(keyOf(m))}
            onTrack={guestProfile ? undefined : () => track(m)}
          />
        ))
      )}
    </div>
  );
}
