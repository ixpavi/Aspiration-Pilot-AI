import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wmnwhzpezfyhtvgxfrxu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbndoenBlemZ5aHR2Z3hmcnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyODgwOTIsImV4cCI6MjEwNzg2NDA5Mn0.b-JOPKVwRRvJJl7AFLajMX6QKWoqj2e-yzI-SVTZnIA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage
  }
});