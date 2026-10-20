// Pure resume-analysis and job-ranking engine. No browser or Supabase
// dependencies, so it can be unit-tested in Node.

export interface ParsedResume {
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
    months?: number;
    description: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  totalYearsExperience?: number;
  quality?: ResumeScore;
  rawText?: string;
  resumeUrl?: string;
}

export interface MatchBreakdown {
  skills: number;
  similarity: number;
  experience: number;
  title: number;
}

export interface JobMatch {
  title: string;
  company: string;
  score: number;
  matchingSkills: string[];
  missingSkills?: string[];
  breakdown?: MatchBreakdown;
  location?: string | null;
  salary_range?: string | null;
}

export interface RankableJob {
  title: string;
  company: string;
  description: string | null;
  required_skills: string[];
  location: string | null;
  salary_range: string | null;
  min_years?: number;
}

// ---------------------------------------------------------------------------
// Skill taxonomy: canonical skill -> aliases. Aliases are matched on token
// boundaries, case-insensitively, unless listed in `cs` (case-sensitive) —
// used for words that are also common English ("Go", "Swift", "Express").
// ---------------------------------------------------------------------------
type SkillDef = { aliases?: string[]; cs?: string[] };

export const SKILL_TAXONOMY: Record<string, SkillDef> = {
  // Languages
  'javascript': { aliases: ['javascript', 'js', 'es6', 'ecmascript'] },
  'typescript': { aliases: ['typescript', 'ts'] },
  'python': { aliases: ['python', 'python3'] },
  'java': { aliases: ['java', 'j2ee', 'jdk'] },
  'c++': { aliases: ['c++', 'cpp'] },
  'c#': { aliases: ['c#', 'csharp'] },
  'c': { cs: ['C'] },
  'go': { aliases: ['golang'], cs: ['Go'] },
  'rust': { cs: ['Rust'] },
  'ruby': { aliases: ['ruby'] },
  'php': { aliases: ['php'] },
  'swift': { aliases: ['swiftui'], cs: ['Swift'] },
  'kotlin': { aliases: ['kotlin'] },
  'r': { aliases: ['rstudio'], cs: ['R'] },
  'matlab': { aliases: ['matlab'] },
  'scala': { aliases: ['scala'] },
  'dart': { aliases: ['dart'] },
  'bash': { aliases: ['bash', 'shell scripting', 'shell script'] },
  // Frontend
  'react': { aliases: ['react', 'reactjs', 'react.js', 'react hooks', 'redux'] },
  'angular': { aliases: ['angular', 'angularjs'] },
  'vue': { aliases: ['vue', 'vuejs', 'vue.js'] },
  'nextjs': { aliases: ['nextjs', 'next.js'] },
  'svelte': { aliases: ['svelte'] },
  'html': { aliases: ['html', 'html5'] },
  'css': { aliases: ['css', 'css3', 'sass', 'scss'] },
  'tailwind': { aliases: ['tailwind', 'tailwindcss'] },
  'bootstrap': { aliases: ['bootstrap'] },
  // Backend
  'node.js': { aliases: ['node.js', 'nodejs', 'node js', 'node'] },
  'express': { aliases: ['express.js', 'expressjs'], cs: ['Express'] },
  'django': { aliases: ['django'] },
  'flask': { aliases: ['flask'] },
  'fastapi': { aliases: ['fastapi'] },
  'spring': { aliases: ['spring boot', 'springboot', 'spring framework'], cs: ['Spring'] },
  'laravel': { aliases: ['laravel'] },
  'rails': { aliases: ['ruby on rails', 'rails'] },
  '.net': { aliases: ['.net', 'dotnet', 'asp.net'] },
  'rest api': { aliases: ['rest api', 'rest apis', 'restful', 'rest', 'api development'] },
  'graphql': { aliases: ['graphql'] },
  'microservices': { aliases: ['microservices', 'microservice'] },
  'kafka': { aliases: ['kafka'] },
  // Data stores
  'sql': { aliases: ['sql'] },
  'postgresql': { aliases: ['postgresql', 'postgres'] },
  'mysql': { aliases: ['mysql'] },
  'mongodb': { aliases: ['mongodb', 'mongo'] },
  'redis': { aliases: ['redis'] },
  'sqlite': { aliases: ['sqlite'] },
  'firebase': { aliases: ['firebase'] },
  'elasticsearch': { aliases: ['elasticsearch'] },
  // Cloud / DevOps
  'aws': { aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'] },
  'azure': { aliases: ['azure', 'microsoft azure'] },
  'gcp': { aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  'docker': { aliases: ['docker', 'containerization'] },
  'kubernetes': { aliases: ['kubernetes', 'k8s'] },
  'terraform': { aliases: ['terraform'] },
  'ansible': { aliases: ['ansible'] },
  'ci/cd': { aliases: ['ci/cd', 'ci cd', 'cicd', 'continuous integration', 'jenkins', 'github actions', 'gitlab ci'] },
  'linux': { aliases: ['linux', 'unix', 'ubuntu'] },
  'git': { aliases: ['git', 'github', 'gitlab', 'bitbucket', 'version control'] },
  'networking': { aliases: ['networking', 'tcp/ip', 'computer networks', 'ccna'] },
  // Data / AI
  'machine learning': { aliases: ['machine learning', 'ml'] },
  'deep learning': { aliases: ['deep learning', 'neural networks', 'neural network', 'cnn', 'rnn', 'lstm'] },
  'nlp': { aliases: ['nlp', 'natural language processing'] },
  'computer vision': { aliases: ['computer vision', 'image processing'] },
  'llm': { aliases: ['llm', 'llms', 'large language models', 'generative ai', 'genai', 'langchain', 'prompt engineering'] },
  'tensorflow': { aliases: ['tensorflow', 'keras'] },
  'pytorch': { aliases: ['pytorch', 'torch'] },
  'scikit-learn': { aliases: ['scikit-learn', 'sklearn', 'scikit learn'] },
  'pandas': { aliases: ['pandas'] },
  'numpy': { aliases: ['numpy'] },
  'opencv': { aliases: ['opencv'] },
  'spark': { aliases: ['spark', 'pyspark', 'apache spark', 'hadoop'] },
  'airflow': { aliases: ['airflow'] },
  'statistics': { aliases: ['statistics', 'statistical analysis', 'probability', 'hypothesis testing'] },
  'data analysis': { aliases: ['data analysis', 'data analytics', 'analytics'] },
  'data visualization': { aliases: ['data visualization', 'data visualisation', 'matplotlib', 'seaborn', 'plotly'] },
  'data science': { aliases: ['data science'] },
  'excel': { aliases: ['excel', 'ms excel', 'microsoft excel', 'spreadsheets'] },
  'power bi': { aliases: ['power bi', 'powerbi'] },
  'tableau': { aliases: ['tableau'] },
  'data structures': { aliases: ['data structures', 'algorithms', 'dsa'] },
  'system design': { aliases: ['system design', 'distributed systems', 'software architecture'] },
  // Mobile
  'android': { aliases: ['android', 'android studio'] },
  'ios': { aliases: ['ios', 'xcode'] },
  'react native': { aliases: ['react native'] },
  'flutter': { aliases: ['flutter'] },
  // Testing / Security
  'unit testing': { aliases: ['unit testing', 'jest', 'pytest', 'junit', 'mocha', 'tdd', 'test driven development'] },
  'selenium': { aliases: ['selenium'] },
  'cypress': { aliases: ['cypress', 'playwright'] },
  'cybersecurity': { aliases: ['cybersecurity', 'cyber security', 'information security', 'penetration testing', 'ethical hacking'] },
  'siem': { aliases: ['siem', 'splunk'] },
  // Design
  'figma': { aliases: ['figma'] },
  'adobe xd': { aliases: ['adobe xd'] },
  'photoshop': { aliases: ['photoshop'] },
  'ui/ux': { aliases: ['ui/ux', 'ux', 'ui design', 'ux design', 'user experience', 'user interface'] },
  'user research': { aliases: ['user research', 'usability testing'] },
  'prototyping': { aliases: ['prototyping', 'wireframing', 'wireframes'] },
  // Business / soft skills
  'agile': { aliases: ['agile'] },
  'scrum': { aliases: ['scrum'] },
  'jira': { aliases: ['jira'] },
  'product management': { aliases: ['product management', 'product roadmap', 'product manager'] },
  'project management': { aliases: ['project management', 'pmp', 'project manager'] },
  'leadership': { aliases: ['leadership', 'team lead', 'led a team', 'mentoring', 'mentored'] },
  'communication': { aliases: ['communication', 'presentation skills', 'public speaking'] },
  'teamwork': { aliases: ['teamwork', 'collaboration', 'team player'] },
  'problem solving': { aliases: ['problem solving', 'problem-solving', 'critical thinking'] },
  'seo': { aliases: ['seo', 'search engine optimization'] },
  'digital marketing': { aliases: ['digital marketing', 'sem', 'google ads', 'ppc'] },
  'google analytics': { aliases: ['google analytics'] },
  'content writing': { aliases: ['content writing', 'copywriting', 'technical writing'] },
  'social media': { aliases: ['social media', 'social media marketing'] },
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Token boundaries that work for skills containing symbols (c++, c#, .net, ci/cd).
const boundaryRegex = (alias: string, flags: string) =>
  new RegExp(`(?<![A-Za-z0-9+#])${escapeRegex(alias)}(?![A-Za-z0-9+#]|\\.[A-Za-z])`, flags);

const COMPILED_SKILLS: { skill: string; patterns: RegExp[] }[] = Object.entries(SKILL_TAXONOMY).map(
  ([skill, def]) => ({
    skill,
    patterns: [
      ...(def.aliases || []).map((a) => boundaryRegex(a, 'i')),
      ...(def.cs || []).map((a) => boundaryRegex(a, '')),
    ],
  })
);

// Single-letter languages ("C", "R") only count inside a skills-like list,
// otherwise every initial or bullet would match.
const LIST_CONTEXT_ONLY = new Set(['c', 'r']);

// Knowing a specific tool implies the general skill it belongs to.
const IMPLIES: Record<string, string[]> = {
  'postgresql': ['sql'], 'mysql': ['sql'], 'sqlite': ['sql'],
  'typescript': ['javascript'], 'react': ['javascript'], 'nextjs': ['react', 'javascript'],
  'express': ['node.js'], 'django': ['python'], 'flask': ['python'], 'fastapi': ['python'],
  'pandas': ['python'], 'pytorch': ['deep learning'], 'tensorflow': ['deep learning'],
  'deep learning': ['machine learning'], 'scrum': ['agile'], 'spring': ['java'],
};

export function normalizeSkill(skill: string): string {
  const lower = skill.trim().toLowerCase();
  if (SKILL_TAXONOMY[lower]) return lower;
  for (const [canonical, def] of Object.entries(SKILL_TAXONOMY)) {
    if ((def.aliases || []).includes(lower) || (def.cs || []).some((a) => a.toLowerCase() === lower)) {
      return canonical;
    }
  }
  return lower;
}

export function extractSkills(text: string): string[] {
  const found = new Set<string>();
  const listLines = text
    .split('\n')
    .filter((l) => /,|\||•|·/.test(l) && /skill|language|technolog|tools/i.test(l))
    .join('\n');

  for (const { skill, patterns } of COMPILED_SKILLS) {
    const haystack = LIST_CONTEXT_ONLY.has(skill) ? listLines : text;
    if (haystack && patterns.some((p) => p.test(haystack))) found.add(skill);
  }
  for (const [skill, implied] of Object.entries(IMPLIES)) {
    if (found.has(skill)) implied.forEach((s) => found.add(s));
  }
  return Array.from(found);
}

// ---------------------------------------------------------------------------
// Experience extraction
// ---------------------------------------------------------------------------
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
const MONTH_RE = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_RE = `(?:${MONTH_RE}\\s*'?\\d{2,4}|\\d{1,2}[/.-]\\d{4}|\\d{4})`;
const END_RE = `(?:${DATE_RE}|present|current|now|till date|to date|ongoing)`;
const RANGE_RE = new RegExp(`(${DATE_RE})\\s*(?:-|–|—|to|until)\\s*(${END_RE})`, 'i');

const TITLE_RE = /\b(senior|sr\.?|lead|principal|junior|jr\.?|associate|staff|software|developer|engineer|architect|manager|director|consultant|analyst|designer|researcher|scientist|intern|internship|trainee|specialist|administrator|tester|programmer|executive|head|officer|coordinator)\b/i;
const SECTION_RE = /^(experience|work experience|professional experience|employment|education|skills|projects|certifications?|achievements|summary|objective|profile)\s*:?$/i;

function parseDate(s: string, now: Date, isEnd: boolean): Date | null {
  const t = s.trim().toLowerCase();
  if (/present|current|now|till date|to date|ongoing/.test(t)) return now;
  let m = t.match(new RegExp(`^(${MONTH_RE})\\s*'?(\\d{2,4})$`));
  if (m) {
    const key = m[1].replace('.', '');
    const mon = MONTHS[key.slice(0, 4)] ?? MONTHS[key.slice(0, 3)];
    let year = parseInt(m[2]);
    if (year < 100) year += 2000;
    return new Date(year, mon ?? 0, 1);
  }
  m = t.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (m) return new Date(parseInt(m[2]), Math.min(parseInt(m[1]), 12) - 1, 1);
  m = t.match(/^(\d{4})$/);
  if (m) return new Date(parseInt(m[1]), isEnd ? 11 : 0, 1);
  return null;
}

function monthsBetween(a: Date, b: Date) {
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1);
}

// Text between "Education" and the next section, so degree years are not
// counted as work experience.
function educationSpan(lines: string[]): [number, number] {
  const start = lines.findIndex((l) => /^education\b/i.test(l.trim()));
  if (start < 0) return [-1, -1];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (SECTION_RE.test(lines[i].trim()) && !/^education/i.test(lines[i].trim())) { end = i; break; }
  }
  return [start, end];
}

export function extractExperience(text: string, now = new Date()): ParsedResume['experience'] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const [eduStart, eduEnd] = educationSpan(lines);
  const experience: ParsedResume['experience'] = [];

  lines.forEach((line, i) => {
    if (i >= eduStart && i < eduEnd) return;
    const match = line.match(RANGE_RE);
    if (!match) return;
    const start = parseDate(match[1], now, false);
    const end = parseDate(match[2], now, true);
    if (!start || !end || end < start || start.getFullYear() < 1970) return;

    // Find a job title: same line first, then neighbouring lines.
    const sameLine = line.replace(match[0], '').replace(/[|,–—-]\s*$/, '').trim();
    const candidates = [sameLine, lines[i - 1], lines[i + 1], lines[i - 2]].filter(Boolean) as string[];
    const titleLine = candidates.find((c) => TITLE_RE.test(c) && c.length < 120 && !RANGE_RE.test(c));
    if (!titleLine) return;

    const [titlePart, ...rest] = titleLine.split(/\s+(?:at|@)\s+|\s*[|,–—]\s*/);
    const companyLine = candidates.find((c) => c !== titleLine && !TITLE_RE.test(c) && c.length < 80 && !RANGE_RE.test(c));
    const description: string[] = [];
    for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
      if (RANGE_RE.test(lines[j]) || SECTION_RE.test(lines[j])) break;
      if (lines[j + 1] && RANGE_RE.test(lines[j + 1]) && TITLE_RE.test(lines[j])) break; // next role's title
      if (lines[j].length > 30) description.push(lines[j].replace(/^[•\-*·]\s*/, ''));
    }

    experience.push({
      title: titlePart.trim() || titleLine,
      company: (rest.join(' ').trim() || companyLine || '').replace(/^[•\-*·]\s*/, ''),
      duration: match[0],
      months: monthsBetween(start, end),
      description,
    });
  });

  return experience;
}

// Total years, merging overlapping date ranges so concurrent roles are not double counted.
export function totalYears(text: string, experience: ParsedResume['experience'], now = new Date()): number {
  const intervals: [number, number][] = [];
  for (const exp of experience) {
    const m = exp.duration.match(RANGE_RE);
    if (!m) continue;
    const s = parseDate(m[1], now, false);
    const e = parseDate(m[2], now, true);
    if (s && e) intervals.push([s.getTime(), e.getTime()]);
  }
  intervals.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let cur: [number, number] | null = null;
  for (const iv of intervals) {
    if (cur && iv[0] <= cur[1]) cur[1] = Math.max(cur[1], iv[1]);
    else {
      if (cur) months += monthsBetween(new Date(cur[0]), new Date(cur[1]));
      cur = [...iv];
    }
  }
  if (cur) months += monthsBetween(new Date(cur[0]), new Date(cur[1]));

  // Fall back to an explicit "N years of experience" statement.
  const stated = text.match(/(\d{1,2})(?:\.\d)?\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|industry\s+|work\s+)?experience/i);
  const statedYears = stated ? parseInt(stated[1]) : 0;
  return Math.round(Math.max(months / 12, statedYears) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Education extraction
// ---------------------------------------------------------------------------
const DEGREE_RE = /\b(ph\.?\s?d|doctorate|m\.?\s?tech|m\.?\s?e\b|m\.?\s?sc|m\.?\s?s\b|m\.?\s?c\.?\s?a|mba|master(?:'s)?(?: of [a-z ]+)?|b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|b\.?\s?s\b|b\.?\s?c\.?\s?a|b\.?\s?com|b\.?\s?a\b|bachelor(?:'s)?(?: of [a-z ]+)?|diploma|associate(?:'s)? degree|high school|12th|hsc|ssc)\b/i;

export function extractEducation(text: string): ParsedResume['education'] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const education: ParsedResume['education'] = [];
  const seen = new Set<string>();

  lines.forEach((line, i) => {
    const m = line.match(DEGREE_RE);
    if (!m || line.length > 200) return;
    const context = [line, lines[i + 1] || '', lines[i - 1] || ''].join(' ');
    const years = context.match(/\b(19|20)\d{2}\b/g) || [];
    const instSegment = context
      .split(/\s*[,|–—]\s*|\s+(?:at|from)\s+/)
      .find((seg) => /University|Institute|College|School|Academy|\bIIT|\bNIT|\bIIIT/.test(seg));
    const instMatch = instSegment?.match(/(.*?(?:University|Institute|College|School|Academy|IIT|NIT|IIIT)[A-Za-z.&' ]*)/);
    const degree = line.length < 100 ? line : m[0];
    const key = m[0].toLowerCase().replace(/[.\s]/g, '');
    if (seen.has(key)) return;
    seen.add(key);
    education.push({
      degree,
      institution: instMatch ? instMatch[1].trim() : '',
      year: years.length ? years[years.length - 1] : '',
    });
  });

  return education;
}

// ---------------------------------------------------------------------------
// TF-IDF text model
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(
  'a an and are as at be by for from has have in is it its of on or that the to was were will with you your we our they this their i me my us can using used use work worked working team teams role new build built across'.split(' ')
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/[\s/-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
    .map(stem);
}

// Light suffix stripping so "developing"/"developed"/"develops" share a token.
function stem(t: string): string {
  const m = t.match(/(ing|ed|es|s)$/);
  return m && t.length - m[0].length >= 4 ? t.slice(0, -m[0].length) : t;
}

type Vector = Map<string, number>;

export class TfIdfModel {
  private idf = new Map<string, number>();
  private docCount = 0;

  fit(docs: string[][]) {
    this.docCount = docs.length;
    const df = new Map<string, number>();
    for (const doc of docs) for (const t of new Set(doc)) df.set(t, (df.get(t) || 0) + 1);
    for (const [t, n] of df) this.idf.set(t, Math.log((1 + this.docCount) / (1 + n)) + 1);
    return this;
  }

  transform(doc: string[]): Vector {
    const tf = new Map<string, number>();
    for (const t of doc) tf.set(t, (tf.get(t) || 0) + 1);
    const vec: Vector = new Map();
    let norm = 0;
    for (const [t, n] of tf) {
      const w = (1 + Math.log(n)) * (this.idf.get(t) ?? Math.log(1 + this.docCount) + 1);
      vec.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of vec) vec.set(t, w / norm);
    return vec;
  }

  static cosine(a: Vector, b: Vector): number {
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    let dot = 0;
    for (const [t, w] of small) dot += w * (large.get(t) || 0);
    return dot;
  }
}

// ---------------------------------------------------------------------------
// Full analysis + ranking
// ---------------------------------------------------------------------------
export function analyzeResumeText(text: string, now = new Date()): ParsedResume {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const skills = extractSkills(clean);
  const experience = extractExperience(clean, now);
  const education = extractEducation(clean);
  const parsed: ParsedResume = {
    skills,
    experience,
    education,
    totalYearsExperience: totalYears(clean, experience, now),
    rawText: clean.slice(0, 20000),
  };
  parsed.quality = scoreResume(clean, parsed);
  return parsed;
}

function jobDocument(job: RankableJob): string {
  // Title and skills repeated to weight them above boilerplate description text.
  return [job.title, job.title, job.required_skills.join(' '), job.required_skills.join(' '), job.description || ''].join(' ');
}

function resumeDocument(resume: ParsedResume): string {
  return [
    resume.rawText || '',
    resume.skills.join(' '),
    resume.experience.map((e) => `${e.title} ${e.description.join(' ')}`).join(' '),
  ].join(' ');
}

export function rankJobs(resume: ParsedResume, jobs: RankableJob[]): JobMatch[] {
  if (!jobs.length) return [];
  const resumeSkills = new Set(resume.skills.map(normalizeSkill));
  const years = resume.totalYearsExperience ?? 0;

  const jobDocs = jobs.map((j) => tokenize(jobDocument(j)));
  const resumeDoc = tokenize(resumeDocument(resume));
  const model = new TfIdfModel().fit([...jobDocs, resumeDoc]);
  const resumeVec = model.transform(resumeDoc);
  const sims = jobDocs.map((d) => TfIdfModel.cosine(resumeVec, model.transform(d)));
  const maxSim = Math.max(...sims, 1e-9);

  const titleTokens = new Set(tokenize(resume.experience.map((e) => e.title).join(' ')));

  const matches = jobs.map((job, i) => {
    const required = job.required_skills.map(normalizeSkill);
    const matchingSkills = required.filter((s) => resumeSkills.has(s));
    const missingSkills = required.filter((s) => !resumeSkills.has(s));
    const coverage = required.length ? matchingSkills.length / required.length : 0;

    const semantic = sims[i] / maxSim; // relative semantic similarity, 0..1

    const minYears = job.min_years ?? inferMinYears(job);
    // Under-qualified candidates score proportionally; heavily over-qualified
    // candidates are nudged away from entry-level roles.
    let expFit = minYears === 0 ? 1 : Math.min(1, years / minYears);
    if (minYears === 0 && years > 4) expFit = 0.4;

    const jobTitleTokens = tokenize(job.title).filter((t) => t.length > 2);
    const titleOverlap = jobTitleTokens.length
      ? jobTitleTokens.filter((t) => titleTokens.has(t)).length / jobTitleTokens.length
      : 0;

    const score = 0.5 * coverage + 0.25 * semantic + 0.15 * expFit + 0.1 * titleOverlap;

    return {
      title: job.title,
      company: job.company,
      score: Math.round(score * 1000) / 1000,
      matchingSkills,
      missingSkills,
      breakdown: {
        skills: round2(coverage),
        similarity: round2(semantic),
        experience: round2(expFit),
        title: round2(titleOverlap),
      },
      location: job.location,
      salary_range: job.salary_range,
    };
  });

  return matches.sort((a, b) => b.score - a.score);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function inferMinYears(job: RankableJob): number {
  const m = (job.description || '').match(/(\d{1,2})\+?\s*(?:years?|yrs?)/i);
  if (m) return parseInt(m[1]);
  if (/senior|sr\.|lead|principal|architect|manager/i.test(job.title)) return 5;
  if (/junior|jr\.|intern|graduate|entry/i.test(job.title)) return 0;
  return 2;
}

// ---------------------------------------------------------------------------
// Resume quality score: checks recruiters and applicant-tracking systems
// commonly care about. Each check carries a weight; the score is out of 100.
// ---------------------------------------------------------------------------
export interface ResumeCheck {
  id: string;
  label: string;
  passed: boolean;
  tip: string;
  weight: number;
}

export interface ResumeScore {
  score: number;
  checks: ResumeCheck[];
}

const ACTION_VERBS = /\b(built|led|developed|designed|implemented|created|launched|improved|reduced|increased|managed|delivered|automated|optimi[sz]ed|analy[sz]ed|architected|migrated|mentored|shipped|owned|drove|founded|streamlined|deployed|trained|researched)\b/gi;

export function scoreResume(text: string, parsed: ParsedResume): ResumeScore {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean).length;
  const quantified = lines.filter((l) => /\d+\s?(%|x\b|k\b|\+|users|customers|clients|people|hours|days|ms|million|lakh|crore)|[$₹€£]\s?\d/i.test(l));
  const actionVerbCount = (text.match(ACTION_VERBS) || []).length;
  const hasSection = (re: RegExp) => lines.some((l) => re.test(l) && l.length < 40);

  const checks: ResumeCheck[] = [
    {
      id: 'contact', weight: 10,
      label: 'Contact details',
      passed: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) && /(\+?\d[\d\s-]{8,}\d|linkedin\.com|github\.com)/i.test(text),
      tip: 'Add an email address plus a phone number or LinkedIn/GitHub link at the top.',
    },
    {
      id: 'sections', weight: 15,
      label: 'Standard sections',
      passed: hasSection(/^(work |professional )?experience|employment/i) && hasSection(/^education/i) && hasSection(/^(technical )?skills/i),
      tip: 'Use clear "Experience", "Education" and "Skills" headings so screening software can find them.',
    },
    {
      id: 'skills', weight: 20,
      label: 'Enough relevant skills',
      passed: parsed.skills.length >= 8,
      tip: `Only ${parsed.skills.length} recognisable skills found. List the tools and technologies you actually use (aim for 8+).`,
    },
    {
      id: 'experience', weight: 15,
      label: 'Dated work history',
      passed: parsed.experience.length > 0,
      tip: 'Give each role a title and a date range like "Jan 2022 – Present" so your experience can be counted.',
    },
    {
      id: 'impact', weight: 20,
      label: 'Measurable impact',
      passed: quantified.length >= 3,
      tip: `${quantified.length} line${quantified.length === 1 ? '' : 's'} with numbers. Show results: "cut load time by 40%", "served 20k users".`,
    },
    {
      id: 'verbs', weight: 10,
      label: 'Action verbs',
      passed: actionVerbCount >= 5,
      tip: 'Start bullet points with verbs like built, led, reduced, launched.',
    },
    {
      id: 'length', weight: 10,
      label: 'Sensible length',
      passed: words >= 200 && words <= 1000,
      tip: words < 200
        ? `About ${words} words. Add detail on what you did and achieved (200–1000 words reads well).`
        : `About ${words} words. Trim to the most relevant points (under 1000 words).`,
    },
  ];

  const total = checks.reduce((acc, c) => acc + c.weight, 0);
  const earned = checks.filter((c) => c.passed).reduce((acc, c) => acc + c.weight, 0);
  return { score: Math.round((earned / total) * 100), checks };
}
