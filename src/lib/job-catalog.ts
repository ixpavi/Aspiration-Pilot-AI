import { supabase } from '@/integrations/supabase/client';

export interface CatalogJob {
  id: string;
  title: string;
  company: string;
  description: string | null;
  required_skills: string[];
  location: string | null;
  salary_range: string | null;
  min_years?: number;
}

// Built-in job catalog used when the `jobs` table is empty or unreachable.
// Skill names must use the canonical names from SKILL_TAXONOMY in ml-services.ts.
export const BUILTIN_JOBS: CatalogJob[] = [
  {
    id: 'bi-1', title: 'Frontend Developer', company: 'TechCorp', location: 'Remote', salary_range: '$80k–$120k', min_years: 1,
    required_skills: ['javascript', 'typescript', 'react', 'html', 'css', 'git'],
    description: 'Build responsive, accessible user interfaces for web applications. Work with designers to turn mockups into reusable components, manage client state, and optimise page performance.',
  },
  {
    id: 'bi-2', title: 'Full Stack Engineer', company: 'StartupXYZ', location: 'Hybrid', salary_range: '$90k–$130k', min_years: 2,
    required_skills: ['javascript', 'typescript', 'react', 'node.js', 'express', 'sql', 'mongodb', 'rest api'],
    description: 'Own features end to end: React frontends, Node.js REST APIs and database schemas. Deploy and monitor services in the cloud and collaborate in an agile team.',
  },
  {
    id: 'bi-3', title: 'Backend Developer', company: 'DataFlow Inc', location: 'Remote', salary_range: '$85k–$125k', min_years: 2,
    required_skills: ['python', 'django', 'sql', 'postgresql', 'docker', 'rest api', 'aws'],
    description: 'Design and build scalable backend services and APIs. Model relational data, write efficient queries, containerise services and maintain high test coverage.',
  },
  {
    id: 'bi-4', title: 'Java Backend Engineer', company: 'FinServe', location: 'On-site', salary_range: '$95k–$140k', min_years: 3,
    required_skills: ['java', 'spring', 'microservices', 'sql', 'kafka', 'docker', 'rest api'],
    description: 'Develop high-throughput microservices for financial transactions using Java and Spring Boot. Event-driven architecture with Kafka, relational databases, and strong testing culture.',
  },
  {
    id: 'bi-5', title: 'DevOps Engineer', company: 'CloudBase', location: 'Remote', salary_range: '$95k–$140k', min_years: 3,
    required_skills: ['docker', 'kubernetes', 'aws', 'terraform', 'ci/cd', 'linux', 'python'],
    description: 'Automate infrastructure and deployment pipelines. Manage Kubernetes clusters, infrastructure as code with Terraform, monitoring and incident response on Linux systems.',
  },
  {
    id: 'bi-6', title: 'Cloud Engineer', company: 'SkyNet Systems', location: 'Hybrid', salary_range: '$90k–$135k', min_years: 2,
    required_skills: ['aws', 'azure', 'linux', 'terraform', 'networking', 'python'],
    description: 'Design, migrate and operate cloud infrastructure on AWS and Azure. Networking, identity, cost optimisation and automation scripting.',
  },
  {
    id: 'bi-7', title: 'Machine Learning Engineer', company: 'AI Ventures', location: 'Remote', salary_range: '$100k–$160k', min_years: 2,
    required_skills: ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'sql'],
    description: 'Train, evaluate and deploy machine learning models to production. Build data pipelines, feature engineering, model monitoring and experiment tracking.',
  },
  {
    id: 'bi-8', title: 'Data Scientist', company: 'Insight Labs', location: 'Hybrid', salary_range: '$95k–$145k', min_years: 1,
    required_skills: ['python', 'statistics', 'machine learning', 'pandas', 'numpy', 'sql', 'data visualization'],
    description: 'Analyse large datasets to answer business questions. Build predictive models, run A/B tests and communicate insights with clear visualisations.',
  },
  {
    id: 'bi-9', title: 'Data Analyst', company: 'Analytics Co', location: 'On-site', salary_range: '$60k–$90k', min_years: 0,
    required_skills: ['sql', 'excel', 'power bi', 'tableau', 'python', 'data visualization', 'statistics'],
    description: 'Turn raw data into dashboards and reports. Write SQL queries, clean data in Excel and Python, and present findings to stakeholders.',
  },
  {
    id: 'bi-10', title: 'Data Engineer', company: 'StreamWorks', location: 'Remote', salary_range: '$100k–$145k', min_years: 2,
    required_skills: ['python', 'sql', 'spark', 'airflow', 'aws', 'kafka', 'postgresql'],
    description: 'Build and maintain batch and streaming data pipelines. Data warehousing, ETL orchestration with Airflow, and big data processing with Spark.',
  },
  {
    id: 'bi-11', title: 'NLP Engineer', company: 'LangTech', location: 'Remote', salary_range: '$110k–$165k', min_years: 2,
    required_skills: ['python', 'nlp', 'deep learning', 'pytorch', 'machine learning', 'llm'],
    description: 'Build language understanding systems: text classification, entity extraction, retrieval and large language model fine-tuning and evaluation.',
  },
  {
    id: 'bi-12', title: 'Computer Vision Engineer', company: 'VisionAI', location: 'Hybrid', salary_range: '$105k–$155k', min_years: 2,
    required_skills: ['python', 'computer vision', 'deep learning', 'pytorch', 'opencv', 'tensorflow'],
    description: 'Develop image and video understanding models for detection, segmentation and tracking. Optimise models for edge deployment.',
  },
  {
    id: 'bi-13', title: 'Android Developer', company: 'MobileFirst', location: 'On-site', salary_range: '$80k–$120k', min_years: 1,
    required_skills: ['kotlin', 'java', 'android', 'git', 'rest api'],
    description: 'Build native Android apps with Kotlin. Integrate REST APIs, manage offline storage and publish to the Play Store.',
  },
  {
    id: 'bi-14', title: 'iOS Developer', company: 'AppForge', location: 'Hybrid', salary_range: '$85k–$125k', min_years: 1,
    required_skills: ['swift', 'ios', 'git', 'rest api'],
    description: 'Create native iOS applications using Swift and SwiftUI. Work closely with design and backend teams to ship polished mobile experiences.',
  },
  {
    id: 'bi-15', title: 'Cross-Platform Mobile Developer', company: 'Appify', location: 'Remote', salary_range: '$75k–$115k', min_years: 1,
    required_skills: ['react native', 'flutter', 'javascript', 'typescript', 'rest api'],
    description: 'Ship mobile apps for Android and iOS from a single codebase using React Native or Flutter.',
  },
  {
    id: 'bi-16', title: 'UI/UX Designer', company: 'Pixel Studio', location: 'Hybrid', salary_range: '$70k–$110k', min_years: 1,
    required_skills: ['figma', 'ui/ux', 'user research', 'prototyping', 'adobe xd'],
    description: 'Design intuitive user experiences through research, wireframes and high-fidelity prototypes. Maintain a design system and run usability tests.',
  },
  {
    id: 'bi-17', title: 'QA Automation Engineer', company: 'QualityFirst', location: 'Remote', salary_range: '$70k–$105k', min_years: 1,
    required_skills: ['selenium', 'unit testing', 'python', 'java', 'ci/cd', 'cypress'],
    description: 'Automate functional and regression test suites, integrate tests into CI/CD pipelines and track product quality metrics.',
  },
  {
    id: 'bi-18', title: 'Cybersecurity Analyst', company: 'SecureNet', location: 'On-site', salary_range: '$85k–$130k', min_years: 2,
    required_skills: ['cybersecurity', 'networking', 'linux', 'python', 'siem'],
    description: 'Monitor and respond to security incidents, perform vulnerability assessments and harden systems and networks.',
  },
  {
    id: 'bi-19', title: 'Product Manager', company: 'BuildIt', location: 'Hybrid', salary_range: '$100k–$150k', min_years: 3,
    required_skills: ['product management', 'agile', 'scrum', 'jira', 'communication', 'leadership', 'data analysis'],
    description: 'Define product vision and roadmap, write requirements, prioritise the backlog and work with engineering and design to deliver customer value.',
  },
  {
    id: 'bi-20', title: 'Project Manager', company: 'DeliverCo', location: 'On-site', salary_range: '$80k–$120k', min_years: 3,
    required_skills: ['project management', 'agile', 'scrum', 'jira', 'communication', 'leadership'],
    description: 'Plan and track project timelines, budgets and risks. Coordinate cross-functional teams and report status to stakeholders.',
  },
  {
    id: 'bi-21', title: 'Software Architect', company: 'EnterpriseWorks', location: 'Hybrid', salary_range: '$130k–$185k', min_years: 7,
    required_skills: ['java', 'microservices', 'aws', 'docker', 'kubernetes', 'system design', 'leadership'],
    description: 'Own the technical architecture of large distributed systems. Make design decisions, mentor engineers and set engineering standards.',
  },
  {
    id: 'bi-22', title: 'Junior Software Developer', company: 'CodeStart', location: 'On-site', salary_range: '$50k–$75k', min_years: 0,
    required_skills: ['python', 'java', 'javascript', 'git', 'sql', 'data structures'],
    description: 'Entry-level role writing and testing code under mentorship. Learn the codebase, fix bugs and build small features. Fresh graduates and interns welcome.',
  },
  {
    id: 'bi-23', title: 'Python Developer', company: 'ScriptLabs', location: 'Remote', salary_range: '$75k–$115k', min_years: 1,
    required_skills: ['python', 'flask', 'django', 'sql', 'rest api', 'git'],
    description: 'Build web services, automation scripts and integrations in Python using Flask or Django.',
  },
  {
    id: 'bi-24', title: 'Digital Marketing Specialist', company: 'GrowthHub', location: 'Hybrid', salary_range: '$50k–$80k', min_years: 1,
    required_skills: ['seo', 'digital marketing', 'google analytics', 'content writing', 'social media'],
    description: 'Plan and execute online campaigns across search and social. Track performance in analytics tools and optimise for conversions.',
  },
];

// Jobs from the database when available, otherwise the built-in catalog.
export async function getJobCatalog(): Promise<CatalogJob[]> {
  try {
    const { data, error } = await supabase.from('jobs').select('*');
    if (!error && data && data.length > 0) {
      return data.map((j) => ({ ...j, required_skills: j.required_skills || [] }));
    }
  } catch (err) {
    console.warn('Could not load jobs from database, using built-in catalog', err);
  }
  return BUILTIN_JOBS;
}
