import { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Guest profile — realistic demo data shown when user skips login
// ---------------------------------------------------------------------------
export const GUEST_PROFILE = {
  id: 'guest',
  user_id: 'guest',
  full_name: 'Guest Explorer',
  email: 'guest@careerpath.ai',
  job_title: 'Software Developer',
  target_position: 'Senior Software Engineer',
  bio: 'Exploring career opportunities with CareerPath AI.',
  experience_years: 3,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  skills: ['javascript', 'react', 'node.js', 'typescript', 'sql'],
  skill_assessments: [
    { skill: 'javascript', level: 4, lastAssessed: new Date().toISOString(), endorsements: 5 },
    { skill: 'react', level: 4, lastAssessed: new Date().toISOString(), endorsements: 3 },
    { skill: 'node.js', level: 3, lastAssessed: new Date().toISOString(), endorsements: 2 },
    { skill: 'typescript', level: 3, lastAssessed: new Date().toISOString(), endorsements: 2 },
    { skill: 'sql', level: 2, lastAssessed: new Date().toISOString(), endorsements: 1 },
  ],
  career_goals: {
    shortTerm: ['Complete AWS certification', 'Contribute to open source'],
    longTerm: ['Become a Tech Lead', 'Build a SaaS product'],
    targetRoles: ['Senior Frontend Engineer', 'Full Stack Developer'],
    industries: ['SaaS', 'FinTech'],
  },
  job_preferences: {
    preferredLocations: ['Remote', 'Bengaluru'],
    minimumSalary: 1200000,
    remoteOnly: true,
    industries: ['Technology', 'Startups'],
    companyTypes: ['Startup', 'Scale-up'],
  },
  career_progression: [
    {
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      title: 'Junior Developer',
      company: 'StartupCo',
      achievements: ['Built internal dashboard', 'Reduced API latency by 40%'],
      skillsGained: ['react', 'node.js'],
    },
  ],
  parsed_resume: null,
  job_matches: [
    { title: 'Senior Frontend Developer', company: 'TechCorp', location: 'Remote', salary_range: '$80k–$120k', score: 0.92, matchingSkills: ['react', 'typescript', 'javascript'], missingSkills: ['css'], breakdown: { skills: 0.83, similarity: 1, experience: 1, title: 1 }, saved: false },
    { title: 'Full Stack Engineer', company: 'StartupXYZ', location: 'Hybrid', salary_range: '$90k–$130k', score: 0.85, matchingSkills: ['react', 'node.js', 'sql'], missingSkills: ['express', 'mongodb'], breakdown: { skills: 0.75, similarity: 0.94, experience: 1, title: 0.5 }, saved: false },
    { title: 'React Developer', company: 'Digital Agency', location: 'On-site', salary_range: '$75k–$110k', score: 0.8, matchingSkills: ['react', 'javascript', 'typescript'], missingSkills: ['rest api'], breakdown: { skills: 0.75, similarity: 0.8, experience: 1, title: 0.5 }, saved: false },
  ],
};

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
type AuthContextType = {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  guestProfile: typeof GUEST_PROFILE | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  continueAsGuest: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function ensureProfile(user: User) {
  try {
    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        email: user.email ?? '',
        full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User',
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );
    if (error) console.error('Could not ensure profile row:', error.message);
  } catch (err) {
    console.error('Could not ensure profile row:', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Restore guest session across page refreshes
    const savedGuest = sessionStorage.getItem('careerpath_guest');
    if (savedGuest === 'true') setIsGuest(true);

    // Make sure the profile row exists before exposing the user, so every
    // screen can rely on it (signup insert fails when email confirmation is on).
    const applySession = async (sessionUser: User | null) => {
      if (sessionUser) await ensureProfile(sessionUser);
      setUser(sessionUser);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session?.user ?? null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: awaiting Supabase calls inside this callback can deadlock the client
      setTimeout(() => applySession(session?.user ?? null), 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const continueAsGuest = () => {
    sessionStorage.setItem('careerpath_guest', 'true');
    setIsGuest(true);
  };

  const signIn = async (email: string, password: string) => {
    sessionStorage.removeItem('careerpath_guest');
    setIsGuest(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    sessionStorage.removeItem('careerpath_guest');
    setIsGuest(false);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    return { error: signUpError };
  };

  const signOut = async () => {
    sessionStorage.removeItem('careerpath_guest');
    setIsGuest(false);
    return supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    loading,
    isGuest,
    guestProfile: isGuest ? GUEST_PROFILE : null,
    signIn,
    signUp,
    signOut,
    continueAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}