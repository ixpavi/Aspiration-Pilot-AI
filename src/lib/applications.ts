import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Application = Database['public']['Tables']['job_applications']['Row'];

// Must match the CHECK constraint on job_applications.status
export const APPLICATION_STATUSES = [
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]['value'];

// Fired after any change so other widgets (dashboard stats) can refresh.
export const APPLICATIONS_CHANGED = 'careerpath:applications-changed';
const notify = () => window.dispatchEvent(new Event(APPLICATIONS_CHANGED));

export async function listApplications(): Promise<Application[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .order('applied_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addApplication(input: {
  position: string;
  company: string;
  location?: string | null;
  salary_range?: string | null;
  notes?: string | null;
  status?: ApplicationStatus;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to track applications.');
  const { error } = await supabase.from('job_applications').insert({
    user_id: user.id,
    position: input.position,
    company: input.company,
    location: input.location ?? null,
    salary_range: input.salary_range ?? null,
    notes: input.notes ?? null,
    status: input.status ?? 'applied',
  });
  if (error) throw error;
  notify();
}

export async function updateApplication(id: string, changes: Partial<Pick<Application, 'status' | 'notes'>>) {
  const { error } = await supabase.from('job_applications').update(changes).eq('id', id);
  if (error) throw error;
  notify();
}

export async function deleteApplication(id: string) {
  const { error } = await supabase.from('job_applications').delete().eq('id', id);
  if (error) throw error;
  notify();
}
