import { supabase } from "@/integrations/supabase/client";

interface ParsedResume {
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
}

// Rule-based career path analysis from a profile object
export async function analyzeCareerPath(profile: any): Promise<any> {
  const skills: string[] = profile.skills || [];
  const experience: any[] = profile.career_progression || [];
  const goals: any = profile.career_goals || {};
  const targetRoles: string[] = goals.targetRoles || [];

  // Determine dominant skill category
  const categories: Record<string, string[]> = {
    frontend: ["javascript", "react", "angular", "vue", "typescript", "html", "css", "tailwind", "nextjs"],
    backend: ["python", "node.js", "java", "go", "php", "django", "flask", "express", "sql", "postgresql", "mongodb"],
    devops: ["docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ci/cd", "ansible"],
    datascience: ["python", "machine learning", "data science", "deep learning", "artificial intelligence", "nlp"],
    mobile: ["swift", "kotlin", "react native", "flutter"],
    fullstack: ["javascript", "react", "node.js", "sql", "typescript"],
  };

  const scores: Record<string, number> = {};
  for (const [cat, catSkills] of Object.entries(categories)) {
    scores[cat] = skills.filter(s => catSkills.includes(s.toLowerCase())).length;
  }

  const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "fullstack";

  // Role suggestions per category
  const roleSuggestions: Record<string, string[]> = {
    frontend: ["Senior Frontend Developer", "React Engineer", "UI/UX Developer", "Frontend Architect"],
    backend: ["Senior Backend Engineer", "API Developer", "Database Engineer", "Backend Architect"],
    devops: ["DevOps Engineer", "Site Reliability Engineer", "Cloud Architect", "Platform Engineer"],
    datascience: ["Machine Learning Engineer", "Data Scientist", "AI Researcher", "Data Engineer"],
    mobile: ["Mobile Developer", "iOS Engineer", "Android Engineer", "Cross-Platform Developer"],
    fullstack: ["Full Stack Engineer", "Technical Lead", "Software Architect", "Engineering Manager"],
  };

  // Skill gap suggestions per category
  const skillGaps: Record<string, string[]> = {
    frontend: ["Performance Optimization", "Accessibility (a11y)", "Testing (Jest/Cypress)", "Design Systems"],
    backend: ["System Design", "Caching Strategies", "Message Queues", "API Security"],
    devops: ["GitOps", "Observability & Monitoring", "Security Hardening", "Cost Optimization"],
    datascience: ["MLOps", "Model Deployment", "Feature Engineering", "Statistical Analysis"],
    mobile: ["App Store Optimization", "Mobile Security", "Offline First Design", "Push Notifications"],
    fullstack: ["System Design", "Team Leadership", "Cloud Architecture", "Performance Tuning"],
  };

  // Certification recommendations
  const certifications: Record<string, string[]> = {
    frontend: ["Meta Front-End Developer Certificate", "Google UX Design Certificate"],
    backend: ["AWS Developer Certification", "MongoDB Developer Certificate"],
    devops: ["AWS Solutions Architect", "Certified Kubernetes Administrator (CKA)"],
    datascience: ["Google Professional ML Engineer", "AWS Machine Learning Specialty"],
    mobile: ["Apple Developer Certification", "Android Associate Developer"],
    fullstack: ["AWS Solutions Architect", "Google Cloud Professional Developer"],
  };

  return {
    suggested_roles: roleSuggestions[dominant] || roleSuggestions.fullstack,
    skill_gaps: skillGaps[dominant] || skillGaps.fullstack,
    recommended_certifications: certifications[dominant] || certifications.fullstack,
    dominant_category: dominant,
    experience_count: experience.length,
    skill_count: skills.length,
  };
}

// Find matching jobs based on skills (used by older components)
export async function findMatchingJobs(skills: string[]): Promise<any[]> {
  const { data: jobs, error } = await supabase.from("jobs").select("*");

  if (error || !jobs || jobs.length === 0) {
    // Return curated fallbacks
    return [
      {
        title: "Senior Frontend Developer",
        company: "Tech Solutions Inc",
        match_percentage: Math.round(
          (skills.filter(s => ["javascript", "react", "typescript"].includes(s)).length / 3) * 100
        ),
        required_skills: ["javascript", "react", "typescript"],
        location: "Remote",
        salary_range: "$90k–$130k",
      },
      {
        title: "Full Stack Developer",
        company: "Digital Innovations",
        match_percentage: Math.round(
          (skills.filter(s => ["javascript", "node.js", "react", "sql"].includes(s)).length / 4) * 100
        ),
        required_skills: ["javascript", "node.js", "react", "sql"],
        location: "Hybrid",
        salary_range: "$85k–$125k",
      },
    ];
  }

  return jobs.map(job => ({
    ...job,
    match_percentage: Math.round(
      (skills.filter(s => job.required_skills.map((r: string) => r.toLowerCase()).includes(s.toLowerCase())).length /
        job.required_skills.length) * 100
    ),
  })).sort((a, b) => b.match_percentage - a.match_percentage);
}

// Parse resume — delegates to ml-services (kept for backward compatibility)
export async function parseResume(resumeUrl: string): Promise<ParsedResume | null> {
  try {
    const { parseResume: parseFromUrl } = await import("@/lib/ml-services");
    return await parseFromUrl(resumeUrl);
  } catch (error) {
    console.error("Error parsing resume:", error);
    return null;
  }
}