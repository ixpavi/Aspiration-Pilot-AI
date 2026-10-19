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
    { title: 'Senior Frontend Developer', company: 'TechCorp', score: 0.92, matchingSkills: ['react', 'typescript', 'javascript'], saved: false },
    { title: 'Full Stack Engineer', company: 'StartupXYZ', score: 0.85, matchingSkills: ['react', 'node.js', 'sql'], saved: false },
    { title: 'React Developer', company: 'Digital Agency', score: 0.80, matchingSkills: ['react', 'javascript', 'typescript'], saved: false },
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Restore guest session across page refreshes
    const savedGuest = sessionStorage.getItem('careerpath_guest');
    if (savedGuest === 'true') {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
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
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (!signUpError && signUpData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          user_id: signUpData.user.id,
          email,
          full_name: name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
      if (profileError) console.error('Profile creation error:', profileError);
    }

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