// Run: node create-test-user.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://bmsvdiqcbgizuwdtpkkm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc3ZkaXFjYmdpenV3ZHRwa2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NjYyNDAsImV4cCI6MjA3NTA0MjI0MH0.NgIEAGoXJDmrvpAyrselNrWSB3C4v54xw12aH6WjlNQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_EMAIL = "demo@careerpath.ai";
const TEST_PASSWORD = "demo1234";
const TEST_NAME = "Demo User";

async function run() {
  console.log("Creating test account...\n");

  // Try signing in first (account may already exist)
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!signInError && signInData.user) {
    console.log("✅ Account already exists and login works!");
    console.log("─────────────────────────────────────");
    console.log("  Email   :", TEST_EMAIL);
    console.log("  Password:", TEST_PASSWORD);
    console.log("─────────────────────────────────────");
    await supabase.auth.signOut();
    return;
  }

  // Account doesn't exist — create it
  const { data, error } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: { data: { full_name: TEST_NAME } },
  });

  if (error) {
    console.error("❌ Failed to create account:", error.message);
    console.log("\nTry signing up manually on the app at http://localhost:5173/auth");
    return;
  }

  // Create profile row
  if (data.user) {
    await supabase.from("profiles").insert([{
      user_id: data.user.id,
      email: TEST_EMAIL,
      full_name: TEST_NAME,
      job_title: "Software Developer",
      target_position: "Senior Software Engineer",
      experience_years: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]).select();
  }

  console.log("✅ Test account created successfully!");
  console.log("─────────────────────────────────────");
  console.log("  Email   :", TEST_EMAIL);
  console.log("  Password:", TEST_PASSWORD);
  console.log("─────────────────────────────────────");
  console.log("\nOpen http://localhost:5173/auth and log in with these credentials.");

  if (data.user?.email_confirmed_at === null) {
    console.log("\n⚠️  NOTE: If email confirmation is required by your Supabase project,");
    console.log("   go to Supabase Dashboard → Authentication → Email Templates");
    console.log("   and disable 'Confirm email' OR check your inbox to confirm first.");
  }
}

run();
