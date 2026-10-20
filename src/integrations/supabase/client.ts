import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const DEFAULT_SUPABASE_URL = "https://wmnwhzpezfyhtvgxfrxu.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbndoenBlemZ5aHR2Z3hmcnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyODgwOTIsImV4cCI6MjEwNzg2NDA5Mn0.b-JOPKVwRRvJJl7AFLajMX6QKWoqj2e-yzI-SVTZnIA";

// .env values win; the defaults point at the project the app was set up with.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage
  }
});