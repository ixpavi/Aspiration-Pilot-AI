import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getJobCatalog } from '@/lib/job-catalog';
import { analyzeResumeText, rankJobs, type ParsedResume, type JobMatch } from '@/lib/ml-engine';

export type { ParsedResume, JobMatch } from '@/lib/ml-engine';

// Extract text from a PDF, keeping line breaks so section/date parsing works.
async function extractTextFromPDFFile(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // Worker is bundled by Vite, so this works offline and never mismatches versions.
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    for (const item of content.items as any[]) {
      if (typeof item.str !== 'string') continue;
      const y = item.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) fullText += '\n';
      else if (fullText && !fullText.endsWith(' ') && !fullText.endsWith('\n')) fullText += ' ';
      fullText += item.str;
      if (item.hasEOL) fullText += '\n';
      if (y !== undefined) lastY = y;
    }
    fullText += '\n';
  }
  return fullText.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

async function extractTextFromDocxFile(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return extractTextFromPDFFile(file);
  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractTextFromDocxFile(file);
  }
  if (name.endsWith('.doc') || file.type === 'application/msword') {
    throw new Error('Old .doc files are not supported. Please save your resume as PDF or .docx and try again.');
  }
  return file.text();
}

// Parse a resume File (PDF, DOCX or TXT) entirely in the browser.
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const text = await extractResumeText(file);
  if (!text.trim()) {
    throw new Error('Could not extract any text. If this is a scanned PDF, please upload a text-based version.');
  }
  return analyzeResumeText(text);
}

// Legacy URL-based parse — fetches then delegates to parseResumeFile
export async function parseResume(resumeUrl: string): Promise<ParsedResume> {
  const response = await fetch(resumeUrl);
  const blob = await response.blob();
  const file = new File([blob], 'resume.pdf', { type: blob.type || 'application/pdf' });
  return parseResumeFile(file);
}

// Rank jobs (database or built-in catalog) against a parsed resume.
export async function findJobMatches(parsedResume: ParsedResume): Promise<JobMatch[]> {
  const jobs = await getJobCatalog();
  return rankJobs(parsedResume, jobs);
}
