import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

// Simple tokenizer function
const tokenize = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);
};

// Expanded common skills dictionary
const commonSkills = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'angular', 'vue', 'nextjs', 'nuxt', 'svelte',
  'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails',
  'mongodb', 'sql', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'sqlite',
  'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify',
  'docker', 'kubernetes', 'terraform', 'ansible',
  'git', 'github', 'gitlab', 'bitbucket',
  'agile', 'scrum', 'kanban', 'jira',
  'machine learning', 'data science', 'deep learning',
  'artificial intelligence', 'nlp', 'computer vision',
  'devops', 'ci/cd', 'jenkins', 'github actions',
  'test driven development', 'unit testing', 'selenium',
  'figma', 'ui/ux', 'photoshop', 'illustrator',
  'product management', 'project management', 'leadership',
  'communication', 'teamwork', 'problem solving',
  'html', 'css', 'sass', 'tailwind', 'bootstrap',
  'rest api', 'graphql', 'microservices', 'websockets',
];

// Function to extract skills from text
function extractSkills(text: string): string[] {
  const skills = new Set<string>();

  // Check for multi-word skills first
  commonSkills.forEach(skill => {
    if (text.toLowerCase().includes(skill)) {
      skills.add(skill);
    }
  });

  return Array.from(skills);
}

// Function to extract experience sections
function extractExperience(text: string): ParsedResume['experience'] {
  const lines = text.split('\n');
  const experience: ParsedResume['experience'] = [];
  let currentExp: Partial<ParsedResume['experience'][0]> = {};

  const datePattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\s*(-|–|to)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}|\b\d{4}\s*(-|–|to)\s*\d{4}|\b\d{4}\s*(-|–|to)\s*present\b/i;
  const titlePattern = /\b(senior|lead|principal|junior|mid|software|developer|engineer|architect|manager|director|consultant|analyst|designer|researcher|intern)\b/i;

  lines.forEach(line => {
    line = line.trim();

    if (datePattern.test(line)) {
      if (currentExp.title) {
        experience.push(currentExp as ParsedResume['experience'][0]);
      }
      currentExp = { duration: line.match(datePattern)![0], description: [] };
    } else if (titlePattern.test(line) && line.length < 100) {
      currentExp.title = line;
      currentExp.company = '';
    } else if (line.length > 30 && currentExp.title) {
      currentExp.description = currentExp.description || [];
      currentExp.description.push(line);
    }
  });

  if (currentExp.title) {
    experience.push(currentExp as ParsedResume['experience'][0]);
  }

  return experience;
}

export interface ParsedResume {
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
    description: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  resumeUrl?: string;
}

export interface JobMatch {
  title: string;
  company: string;
  score: number;
  matchingSkills: string[];
}

// Curated fallback job data when the database is empty
const FALLBACK_JOBS = [
  {
    id: 'fb-1', title: 'Frontend Developer', company: 'TechCorp',
    required_skills: ['javascript', 'react', 'typescript', 'css', 'html'],
    location: 'Remote', salary_range: '$80k–$120k', description: null, created_at: '', updated_at: '',
  },
  {
    id: 'fb-2', title: 'Full Stack Engineer', company: 'StartupXYZ',
    required_skills: ['javascript', 'react', 'node.js', 'sql', 'mongodb'],
    location: 'Hybrid', salary_range: '$90k–$130k', description: null, created_at: '', updated_at: '',
  },
  {
    id: 'fb-3', title: 'Backend Developer', company: 'DataFlow Inc',
    required_skills: ['python', 'sql', 'postgresql', 'docker', 'aws'],
    location: 'Remote', salary_range: '$85k–$125k', description: null, created_at: '', updated_at: '',
  },
  {
    id: 'fb-4', title: 'DevOps Engineer', company: 'CloudBase',
    required_skills: ['docker', 'kubernetes', 'aws', 'ci/cd', 'python'],
    location: 'Remote', salary_range: '$95k–$140k', description: null, created_at: '', updated_at: '',
  },
  {
    id: 'fb-5', title: 'Machine Learning Engineer', company: 'AI Ventures',
    required_skills: ['python', 'machine learning', 'data science', 'artificial intelligence', 'sql'],
    location: 'Remote', salary_range: '$100k–$160k', description: null, created_at: '', updated_at: '',
  },
  {
    id: 'fb-6', title: 'React Developer', company: 'Digital Agency',
    required_skills: ['react', 'javascript', 'typescript', 'node.js'],
    location: 'On-site', salary_range: '$75k–$110k', description: null, created_at: '', updated_at: '',
  },
  {
    id: 'fb-7', title: 'Data Engineer', company: 'Analytics Co',
    required_skills: ['python', 'sql', 'postgresql', 'data science', 'aws'],
    location: 'Hybrid', salary_range: '$90k–$135k', description: null, created_at: '', updated_at: '',
  },
  {
    id: 'fb-8', title: 'Software Architect', company: 'EnterpriseWorks',
    required_skills: ['java', 'aws', 'docker', 'kubernetes', 'agile'],
    location: 'Hybrid', salary_range: '$120k–$180k', description: null, created_at: '', updated_at: '',
  },
];

// Extract text from a PDF File object (avoids CORS; sets pdfjs worker correctly)
async function extractTextFromPDFFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');

  // Must set workerSrc before calling getDocument
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return fullText;
}

// Read plain text / docx as text (best-effort for non-PDF)
async function extractTextFromPlainFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Parse a resume from a File object (PDF or text-based) — no CORS issues
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  try {
    let text = '';

    if (file.type === 'application/pdf') {
      text = await extractTextFromPDFFile(file);
    } else {
      text = await extractTextFromPlainFile(file);
    }

    if (!text.trim()) {
      throw new Error('Could not extract text from the file.');
    }

    const skills = extractSkills(text);
    const experience = extractExperience(text);

    const educationPattern = /\b(?:Bachelor|Master|PhD|B\.?S\.?|M\.?S\.?|Ph\.?D\.?|Degree)\b.*?\b(?:19|20)\d{2}\b/gi;
    const educationMatches = text.match(educationPattern) || [];
    const education = educationMatches.map(match => {
      const parts = match.split(/\s+at\s+|\s+from\s+|\s+,\s+/);
      return {
        degree: parts[0],
        institution: parts[1] || '',
        year: (match.match(/\b(19|20)\d{2}\b/) || [''])[0],
      };
    });

    return { skills, experience, education };
  } catch (error) {
    console.error('Error parsing resume file:', error);
    throw error;
  }
}

// Legacy URL-based parse — fetches then delegates to parseResumeFile
export async function parseResume(resumeUrl: string): Promise<ParsedResume> {
  try {
    const response = await fetch(resumeUrl);
    const blob = await response.blob();
    const file = new File([blob], 'resume.pdf', { type: blob.type || 'application/pdf' });
    return parseResumeFile(file);
  } catch (error) {
    console.error('Error parsing resume from URL:', error);
    throw error;
  }
}

// Find job matches — uses DB jobs with curated fallback
export async function findJobMatches(parsedResume: ParsedResume): Promise<JobMatch[]> {
  try {
    const { data: dbJobs, error } = await supabase.from('jobs').select('*');
    if (error) throw error;

    const jobs = (dbJobs && dbJobs.length > 0) ? dbJobs : FALLBACK_JOBS;

    const matches = jobs.map(job => {
      const jobSkillsLower = job.required_skills.map((s: string) => s.toLowerCase());
      const matchingSkills = parsedResume.skills.filter(skill =>
        jobSkillsLower.includes(skill.toLowerCase())
      );

      const skillMatchRatio = job.required_skills.length > 0
        ? matchingSkills.length / job.required_skills.length
        : 0;
      const maxLen = Math.max(parsedResume.skills.length, job.required_skills.length);
      const similarityScore = maxLen > 0 ? matchingSkills.length / maxLen : 0;
      const experienceMatchScore = calculateExperienceMatch(parsedResume.experience, job);
      const score = similarityScore * 0.4 + skillMatchRatio * 0.4 + experienceMatchScore * 0.2;

      return { title: job.title, company: job.company, score, matchingSkills };
    });

    return matches.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error finding job matches:', error);
    throw error;
  }
}

// Helper: calculate experience match score
function calculateExperienceMatch(experience: ParsedResume['experience'], job: { title: string }): number {
  if (!experience.length) return 0;

  const yearsOfExperience = experience.reduce((total, exp) => {
    const duration = exp.duration.toLowerCase();
    const years = parseInt(duration.match(/\d+/)?.[0] || '0');
    return total + (duration.includes('year') ? years : years / 12);
  }, 0);

  const jobTitleWords = job.title.toLowerCase().split(' ');
  const experienceMatch = experience.some(exp =>
    jobTitleWords.some(word => exp.title.toLowerCase().includes(word) && word.length > 3)
  );

  return (yearsOfExperience > 3 ? 0.7 : 0.3) + (experienceMatch ? 0.3 : 0);
}

// Helper function to calculate the similarity between two texts
function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = [...set1].filter(token => set2.has(token));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.length / union.size;
}