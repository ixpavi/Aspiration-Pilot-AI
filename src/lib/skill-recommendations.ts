import type { Database } from '@/integrations/supabase/types';
import { getJobCatalog } from '@/lib/job-catalog';
import { normalizeSkill } from '@/lib/ml-engine';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SkillRecommendation {
  skill: string;
  relevance: number;
  reason: string;
  requiredBy: number; // Number of jobs requiring this skill
  growthTrend: 'rising' | 'stable' | 'declining';
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = Beginner, 5 = Expert
}

const COMMON_TECH_SKILLS = {
  'javascript': { category: 'programming', difficulty: 2 },
  'typescript': { category: 'programming', difficulty: 3 },
  'python': { category: 'programming', difficulty: 2 },
  'react': { category: 'frontend', difficulty: 3 },
  'node.js': { category: 'backend', difficulty: 3 },
  'sql': { category: 'database', difficulty: 2 },
  'postgresql': { category: 'database', difficulty: 3 },
  'mongodb': { category: 'database', difficulty: 2 },
  'aws': { category: 'cloud', difficulty: 4 },
  'azure': { category: 'cloud', difficulty: 4 },
  'docker': { category: 'devops', difficulty: 3 },
  'kubernetes': { category: 'devops', difficulty: 4 },
  'git': { category: 'tooling', difficulty: 1 },
  'machine learning': { category: 'ai', difficulty: 4 },
  'data analysis': { category: 'data', difficulty: 3 },
  'product management': { category: 'business', difficulty: 4 },
  'agile': { category: 'methodology', difficulty: 2 },
  'ui/ux': { category: 'design', difficulty: 3 },
  'graphql': { category: 'api', difficulty: 3 },
  'ci/cd': { category: 'devops', difficulty: 3 },
} as const;

const SKILL_RELATIONSHIPS = {
  'frontend': ['javascript', 'typescript', 'react', 'ui/ux'],
  'backend': ['node.js', 'python', 'sql', 'postgresql'],
  'fullstack': ['javascript', 'react', 'node.js', 'sql'],
  'data science': ['python', 'machine learning', 'data analysis'],
  'devops': ['docker', 'kubernetes', 'aws', 'ci/cd'],
  'product': ['agile', 'product management', 'ui/ux'],
};

// Curated fallback recommendations shown when no jobs exist in the DB
const FALLBACK_RECOMMENDATIONS: SkillRecommendation[] = [
  { skill: 'typescript', relevance: 0.9, reason: 'Industry standard for scalable JavaScript projects', requiredBy: 80, growthTrend: 'rising', difficulty: 3 },
  { skill: 'docker', relevance: 0.85, reason: 'Essential for modern deployments and local dev parity', requiredBy: 75, growthTrend: 'rising', difficulty: 3 },
  { skill: 'aws', relevance: 0.8, reason: 'Most popular cloud platform in the industry', requiredBy: 70, growthTrend: 'rising', difficulty: 4 },
  { skill: 'postgresql', relevance: 0.75, reason: 'Leading open-source relational database', requiredBy: 65, growthTrend: 'stable', difficulty: 3 },
  { skill: 'python', relevance: 0.85, reason: 'Top language for automation, data, and backend', requiredBy: 78, growthTrend: 'rising', difficulty: 2 },
  { skill: 'graphql', relevance: 0.7, reason: 'Modern API standard replacing REST in many projects', requiredBy: 50, growthTrend: 'rising', difficulty: 3 },
  { skill: 'kubernetes', relevance: 0.65, reason: 'Standard container orchestration platform', requiredBy: 45, growthTrend: 'rising', difficulty: 4 },
  { skill: 'machine learning', relevance: 0.75, reason: 'High-demand AI/ML skills across all industries', requiredBy: 60, growthTrend: 'rising', difficulty: 4 },
  { skill: 'agile', relevance: 0.6, reason: 'Universal methodology used by most tech teams', requiredBy: 55, growthTrend: 'stable', difficulty: 2 },
  { skill: 'ui/ux', relevance: 0.65, reason: 'User-centered design is increasingly valued in engineering roles', requiredBy: 40, growthTrend: 'stable', difficulty: 3 },
];

// Title words too generic to identify a role family
const GENERIC_TITLE_WORDS = new Set(['senior', 'junior', 'lead', 'principal', 'engineer', 'developer', 'software', 'specialist', 'associate', 'staff']);

export async function getSkillRecommendations(
  profile: Profile,
  limit = 10
): Promise<SkillRecommendation[]> {
  // Get current skills (from both skills array and skill_assessments)
  const currentSkills = new Set([
    ...(profile.skills || []).map(normalizeSkill),
    ...(profile.skill_assessments || []).map((s: any) => normalizeSkill(String(s.skill || ''))),
    ...(((profile.parsed_resume as any)?.skills as string[] | undefined) || []).map(normalizeSkill),
  ]);

  // Get target roles from career goals
  const targetRoles = profile.career_goals?.targetRoles || [];
  const targetIndustries = profile.career_goals?.industries || [];

  // Jobs from the database, or the built-in catalog when the table is empty
  const jobs = await getJobCatalog();

  if (jobs.length === 0) {
    return FALLBACK_RECOMMENDATIONS
      .filter(rec => !currentSkills.has(rec.skill.toLowerCase()))
      .slice(0, limit);
  }

  // Build skill frequency map from jobs
  const skillFrequency = new Map<string, number>();
  const skillsByRole = new Map<string, Set<string>>();

  jobs.forEach(job => {
    job.required_skills.forEach(skill => {
      const s = normalizeSkill(skill);
      skillFrequency.set(s, (skillFrequency.get(s) || 0) + 1);
    });

    if (job.title) {
      const normalizedTitle = job.title.toLowerCase();
      const skillSet = skillsByRole.get(normalizedTitle) || new Set();
      job.required_skills.forEach(skill => skillSet.add(normalizeSkill(skill)));
      skillsByRole.set(normalizedTitle, skillSet);
    }
  });

  // Get relevant skills based on target roles: from the role keyword map and
  // from catalog jobs whose title resembles the target role
  const relevantSkills = new Set<string>();
  targetRoles.forEach(role => {
    const roleWords = role.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !GENERIC_TITLE_WORDS.has(w));
    for (const [title, skillSet] of skillsByRole) {
      if (roleWords.some(w => title.includes(w))) skillSet.forEach(s => relevantSkills.add(s));
    }
    const roleKey = Object.keys(SKILL_RELATIONSHIPS).find(k =>
      role.toLowerCase().includes(k)
    );
    if (roleKey) {
      SKILL_RELATIONSHIPS[roleKey as keyof typeof SKILL_RELATIONSHIPS].forEach(skill =>
        relevantSkills.add(skill)
      );
    }
  });

  // Skills missing from the user's best resume matches are the most direct
  // gaps to close. Keep the highest-scoring match each skill comes from.
  const gapFromMatch = new Map<string, { title: string; score: number }>();
  const storedMatches = (Array.isArray(profile.job_matches) ? profile.job_matches : []) as {
    title?: string; score?: number; missingSkills?: string[];
  }[];
  storedMatches.slice(0, 3).forEach(match => {
    (match.missingSkills || []).forEach(raw => {
      const skill = normalizeSkill(raw);
      const score = match.score ?? 0;
      if (!gapFromMatch.has(skill) || gapFromMatch.get(skill)!.score < score) {
        gapFromMatch.set(skill, { title: match.title || 'your top match', score });
      }
    });
  });

  // Calculate recommendations from DB skills
  const recommendations: SkillRecommendation[] = [];

  for (const [skill, frequency] of skillFrequency.entries()) {
    if (currentSkills.has(skill)) continue;

    const skillInfo = COMMON_TECH_SKILLS[skill as keyof typeof COMMON_TECH_SKILLS] ?? { difficulty: 3 };

    let relevance = 0;

    const gap = gapFromMatch.get(skill);
    if (gap) relevance += 0.5 * gap.score;
    if (relevantSkills.has(skill)) relevance += 0.4;
    relevance += Math.min(frequency / (jobs.length || 1), 0.3);

    const complementarySkills = Object.values(SKILL_RELATIONSHIPS)
      .filter(skills => (skills as readonly string[]).includes(skill))
      .flat();
    const complementaryScore = complementarySkills.length > 0
      ? complementarySkills.filter(s => currentSkills.has(s)).length / complementarySkills.length
      : 0;
    relevance += complementaryScore * 0.3;

    let reason = '';
    if (gap) {
      reason = `Missing for your top match: ${gap.title}`;
    } else if (relevantSkills.has(skill)) {
      reason = targetRoles.length > 0
        ? `Required for ${targetRoles.slice(0, 2).join(' or ')} roles`
        : 'Relevant to your target career path';
    } else if (complementaryScore > 0) {
      reason = 'Complements your current skill set';
    } else {
      reason = `Required by ${frequency} job${frequency !== 1 ? 's' : ''} in the market`;
    }

    const growthTrend: 'rising' | 'stable' | 'declining' =
      frequency >= (jobs.length || 1) * 0.2 ? 'rising' : 'stable';

    recommendations.push({
      skill,
      relevance: Math.min(relevance, 1),
      reason,
      requiredBy: frequency,
      growthTrend,
      difficulty: skillInfo.difficulty as 1 | 2 | 3 | 4 | 5,
    });
  }

  return recommendations
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

export async function getSkillProgressInsights(profile: Profile) {
  const currentSkills = profile.skill_assessments || [];
  const progressHistory = profile.career_progression || [];

  const skillProgress = new Map<string, {
    initialLevel: number;
    currentLevel: number;
    timeSpan: number; // in days
  }>();

  currentSkills.forEach((skill: any) => {
    const firstMention = progressHistory.find((p: any) =>
      p.skillsGained && p.skillsGained.includes(skill.skill)
    );

    if (firstMention) {
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(firstMention.date).getTime()) /
        (1000 * 60 * 60 * 24)
      );

      skillProgress.set(skill.skill, {
        initialLevel: 1,
        currentLevel: skill.level,
        timeSpan: daysSince,
      });
    }
  });

  const insights = [];

  for (const [skill, progress] of skillProgress.entries()) {
    if (progress.timeSpan <= 0) continue;
    const velocityPerMonth = (progress.currentLevel - progress.initialLevel) /
                             (progress.timeSpan / 30);

    if (velocityPerMonth > 0.5) {
      insights.push({
        skill,
        type: 'fast-progress',
        message: `You're making great progress in ${skill}! Keep it up.`,
      });
    } else if (velocityPerMonth < 0.1 && progress.timeSpan > 90) {
      insights.push({
        skill,
        type: 'stagnant',
        message: `Consider spending more focused time on ${skill} — progress has been slow.`,
      });
    }
  }

  // If no progress data, generate encouraging generic insights from skill assessments
  if (insights.length === 0 && currentSkills.length > 0) {
    const highLevelSkills = (currentSkills as any[])
      .filter(s => s.level >= 4)
      .slice(0, 2);
    highLevelSkills.forEach((skill: any) => {
      insights.push({
        skill: skill.skill,
        type: 'fast-progress',
        message: `You have a high proficiency in ${skill.skill}. Consider mentoring others or applying for senior roles.`,
      });
    });
  }

  return insights;
}