import { describe, it, expect, vi } from 'vitest';

// job-catalog imports the Supabase client, which needs a browser
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import {
  analyzeResumeText,
  extractSkills,
  extractExperience,
  extractEducation,
  normalizeSkill,
  rankJobs,
  totalYears,
  TfIdfModel,
  tokenize,
} from './ml-engine';
import { BUILTIN_JOBS } from './job-catalog';

const NOW = new Date(2026, 9, 21);

const FULLSTACK_RESUME = `Priya Sharma
priya@example.com | Bengaluru
SUMMARY
Software engineer with 4 years of experience building web apps. Good at going the extra mile.
SKILLS
Languages: JavaScript, TypeScript, Python, Java, C
Frameworks: React.js, Node.js, Express, Django, Tailwind
Tools: Git, Docker, AWS (EC2, S3), PostgreSQL, MongoDB, Jira
EXPERIENCE
Senior Software Engineer at Infosys
Jan 2022 – Present
• Built React dashboards and REST APIs in Node.js used by 20k users daily
• Led a team of 4 developers and mentored interns
Software Developer | Digital Labs Pvt Ltd
Jul 2020 - Dec 2021
• Developed Django microservices backed by PostgreSQL and deployed with Docker
EDUCATION
B.Tech in Computer Science, Vellore Institute of Technology
2016 - 2020
`;

const DATA_RESUME = `Rahul Verma
SKILLS
Python, Pandas, NumPy, scikit-learn, TensorFlow, SQL, Tableau, Statistics, Git
EXPERIENCE
Data Scientist at Analytics Hub
Mar 2023 - Present
- Built churn prediction models with scikit-learn and deployed them via Flask APIs
Data Analyst Intern | Quant Labs
Jun 2022 - Feb 2023
- Cleaned and analysed sales data in Excel and SQL
EDUCATION
B.Sc in Statistics, University of Pune
2019 - 2022`;

const DESIGNER_RESUME = `Anika Rao
UI/UX Designer
Skills: Figma, Adobe XD, Wireframing, User Research, Prototyping, Photoshop
Experience
Product Designer, Pixel Works
2021 - 2024
Designed mobile app flows and ran usability testing with 40 participants.`;

describe('extractSkills', () => {
  it('finds canonical skills via aliases', () => {
    const skills = extractSkills('Worked with ReactJS, NodeJS, k8s, Postgres and sklearn.');
    expect(skills).toEqual(expect.arrayContaining(['react', 'node.js', 'kubernetes', 'postgresql', 'scikit-learn']));
  });

  it('does not match skills inside other words', () => {
    const skills = extractSkills('A good digital marketer who loves JavaScript and is going places.');
    expect(skills).not.toContain('go');
    expect(skills).not.toContain('git');
    expect(skills).not.toContain('java');
    expect(skills).toContain('javascript');
  });

  it('only treats ambiguous words as skills when written as proper nouns', () => {
    expect(extractSkills('I will go to the office and express my views.')).not.toEqual(
      expect.arrayContaining(['go'])
    );
    expect(extractSkills('Wrote services in Go and Express.')).toEqual(expect.arrayContaining(['go', 'express']));
  });

  it('only detects single-letter languages in a skills list', () => {
    expect(extractSkills('C. Ramesh, Team R lead')).not.toContain('c');
    expect(extractSkills('Languages: C, C++, Python')).toEqual(expect.arrayContaining(['c', 'c++', 'python']));
  });

  it('adds implied general skills', () => {
    const skills = extractSkills('Built APIs with Django and PostgreSQL');
    expect(skills).toEqual(expect.arrayContaining(['python', 'sql']));
  });

  it('returns nothing for empty text', () => {
    expect(extractSkills('')).toEqual([]);
  });
});

describe('normalizeSkill', () => {
  it('maps aliases and keeps unknown skills lowercased', () => {
    expect(normalizeSkill('ReactJS')).toBe('react');
    expect(normalizeSkill('K8s')).toBe('kubernetes');
    expect(normalizeSkill('Node.js')).toBe('node.js');
    expect(normalizeSkill('Cobol')).toBe('cobol');
  });
});

describe('extractExperience', () => {
  it('parses roles, companies and durations', () => {
    const exp = extractExperience(FULLSTACK_RESUME, NOW);
    expect(exp).toHaveLength(2);
    expect(exp[0]).toMatchObject({ title: 'Senior Software Engineer', company: 'Infosys', duration: 'Jan 2022 – Present' });
    expect(exp[1]).toMatchObject({ title: 'Software Developer', company: 'Digital Labs Pvt Ltd', months: 18 });
  });

  it("does not leak the next role's title into the description", () => {
    const exp = extractExperience(FULLSTACK_RESUME, NOW);
    expect(exp[0].description.join(' ')).not.toContain('Digital Labs');
  });

  it('ignores education date ranges', () => {
    const exp = extractExperience(FULLSTACK_RESUME, NOW);
    expect(exp.some((e) => e.duration.includes('2016'))).toBe(false);
  });

  it('handles year-only and numeric month formats', () => {
    expect(extractExperience('Product Designer, Pixel Works\n2021 - 2024', NOW)[0].months).toBe(48);
    expect(extractExperience('Backend Engineer at Acme\n07/2020 - 12/2021', NOW)[0].months).toBe(18);
  });
});

describe('totalYears', () => {
  it('merges overlapping roles instead of double counting', () => {
    const text = 'Engineer at A\nJan 2020 - Dec 2021\nConsultant at B\nJan 2021 - Dec 2021';
    const exp = extractExperience(text, NOW);
    expect(totalYears(text, exp, NOW)).toBe(2);
  });

  it('falls back to a stated number of years', () => {
    expect(totalYears('Over 7+ years of experience in QA.', [], NOW)).toBe(7);
  });

  it('is never absurdly large (regression: years parsed from the year number)', () => {
    const parsed = analyzeResumeText(FULLSTACK_RESUME, NOW);
    expect(parsed.totalYearsExperience).toBeGreaterThan(4);
    expect(parsed.totalYearsExperience).toBeLessThan(10);
  });
});

describe('extractEducation', () => {
  it('extracts degree, institution and graduation year', () => {
    expect(extractEducation(DATA_RESUME)).toEqual([
      { degree: 'B.Sc in Statistics, University of Pune', institution: 'University of Pune', year: '2022' },
    ]);
    expect(extractEducation('Master of Science from Stanford University, 2018')[0]).toMatchObject({
      institution: 'Stanford University',
      year: '2018',
    });
  });
});

describe('TF-IDF model', () => {
  it('scores identical documents as 1 and unrelated ones as 0', () => {
    const a = tokenize('react typescript frontend');
    const b = tokenize('kubernetes terraform');
    const model = new TfIdfModel().fit([a, b]);
    expect(TfIdfModel.cosine(model.transform(a), model.transform(a))).toBeCloseTo(1);
    expect(TfIdfModel.cosine(model.transform(a), model.transform(b))).toBe(0);
  });
});

describe('rankJobs', () => {
  const top = (resume: string, n = 3) =>
    rankJobs(analyzeResumeText(resume, NOW), BUILTIN_JOBS).slice(0, n).map((m) => m.title);

  it('ranks web roles first for a full-stack resume', () => {
    expect(top(FULLSTACK_RESUME, 2)).toEqual(['Full Stack Engineer', 'Backend Developer']);
  });

  it('ranks data roles first for a data resume', () => {
    expect(top(DATA_RESUME)).toEqual(['Data Scientist', 'Machine Learning Engineer', 'Data Analyst']);
  });

  it('ranks design first for a designer resume', () => {
    expect(top(DESIGNER_RESUME, 1)).toEqual(['UI/UX Designer']);
  });

  it('returns scores in 0..1, sorted, with matching and missing skills', () => {
    const matches = rankJobs(analyzeResumeText(DATA_RESUME, NOW), BUILTIN_JOBS);
    expect(matches).toHaveLength(BUILTIN_JOBS.length);
    for (let i = 0; i < matches.length; i++) {
      expect(matches[i].score).toBeGreaterThanOrEqual(0);
      expect(matches[i].score).toBeLessThanOrEqual(1);
      if (i > 0) expect(matches[i].score).toBeLessThanOrEqual(matches[i - 1].score);
    }
    const ds = matches[0];
    expect(ds.matchingSkills.length + (ds.missingSkills?.length ?? 0)).toBe(
      BUILTIN_JOBS.find((j) => j.title === ds.title)!.required_skills.length
    );
  });

  it('handles an empty resume and an empty job list', () => {
    const empty = analyzeResumeText('', NOW);
    expect(rankJobs(empty, BUILTIN_JOBS).every((m) => m.matchingSkills.length === 0)).toBe(true);
    expect(rankJobs(empty, [])).toEqual([]);
  });

  it('accepts database jobs with non-canonical skill names', () => {
    const [m] = rankJobs(analyzeResumeText('Skills: ReactJS, NodeJS', NOW), [
      { title: 'Web Dev', company: 'X', description: null, required_skills: ['React', 'Node.js'], location: null, salary_range: null },
    ]);
    expect(m.matchingSkills).toEqual(['react', 'node.js']);
  });
});
