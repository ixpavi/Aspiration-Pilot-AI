import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  APPLICATION_STATUSES,
  APPLICATIONS_CHANGED,
  addApplication,
  deleteApplication,
  listApplications,
  updateApplication,
  type Application,
  type ApplicationStatus,
} from "@/lib/applications";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-secondary text-secondary-foreground",
  interview: "bg-primary/15 text-primary",
  offer: "bg-marker text-[hsl(var(--marker-ink))]",
  accepted: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export function ApplicationTracker() {
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");

  const load = useCallback(async () => {
    try {
      setApps(await listApplications());
    } catch (err) {
      toast({ title: "Couldn't load applications", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    window.addEventListener(APPLICATIONS_CHANGED, load);
    return () => window.removeEventListener(APPLICATIONS_CHANGED, load);
  }, [load]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!position.trim() || !company.trim()) return;
    setAdding(true);
    try {
      await addApplication({ position: position.trim(), company: company.trim() });
      setPosition("");
      setCompany("");
      setShowForm(false);
      toast({ title: "Application added" });
    } catch (err) {
      toast({ title: "Couldn't add application", description: (err as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function changeStatus(id: string, status: ApplicationStatus) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    try {
      await updateApplication(id, { status });
    } catch (err) {
      toast({ title: "Couldn't update status", description: (err as Error).message, variant: "destructive" });
      load();
    }
  }

  async function remove(id: string) {
    const previous = apps;
    setApps((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteApplication(id);
      toast({ title: "Application removed" });
    } catch (err) {
      setApps(previous);
      toast({ title: "Couldn't remove application", description: (err as Error).message, variant: "destructive" });
    }
  }

  const counts = APPLICATION_STATUSES.map((s) => ({ ...s, count: apps.filter((a) => a.status === s.value).length }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Applications</h2>
          <p className="text-sm text-muted-foreground">
            Keep every role you've applied for in one place and update it as you hear back.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} aria-expanded={showForm}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add application
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="app-position">Role</Label>
            <Input id="app-position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Data Analyst" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="app-company">Company</Label>
            <Input id="app-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Analytics Co" required />
          </div>
          <Button type="submit" disabled={adding}>
            {adding && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Add
          </Button>
        </form>
      )}

      {apps.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {counts.map((c) => (
            <div key={c.value} className="rounded-lg border bg-card px-3 py-2">
              <div className="font-display text-2xl font-bold">{c.count}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No applications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use "Track application" on a job match, or add one yourself.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {apps.map((app) => (
            <li key={app.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{app.position}</div>
                <div className="text-sm text-muted-foreground">
                  {app.company}
                  {app.location ? `, ${app.location}` : ""}
                  . Added {new Date(app.applied_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </div>
              </div>
              <Select value={app.status} onValueChange={(v) => changeStatus(app.id, v as ApplicationStatus)}>
                <SelectTrigger
                  className={cn("h-8 w-[140px] border-0 text-xs font-medium", STATUS_STYLES[app.status])}
                  aria-label={`Status for ${app.position} at ${app.company}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => remove(app.id)}
                aria-label={`Remove ${app.position} at ${app.company}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
