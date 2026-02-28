export type JobStatus = "Pending" | "Running" | "Complete" | "Failed";

export type StageName =
  | "URL Validation"
  | "Scraping"
  | "Summarization"
  | "Applicability"
  | "Materiality";

export type StageStatus = JobStatus;

export interface ValidationResult {
  targetUrl: string;
  userAgent: string;
  robotsUrl: string;
  canScrape: boolean;
  reason: string;
  crawlDelaySeconds: number | null;
}

export interface ScrapeResult {
  identifier: string;
  files: {
    cleanedHtml: string[];
    pdf: string[];
  };
}

export interface SummarizationFileResult {
  filename: string;
  status: "success" | "failure" | "pending" | "running";
  summaryHtml?: string; // The actual summary output HTML
  reasoning?: string;   // LLM reasoning (shown in collapsible)
  error?: string;
}

export interface SummarizationResult {
  files: SummarizationFileResult[];
}

export interface Stage {
  name: StageName;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  details?: string;
  validationResult?: ValidationResult;
  scrapeResult?: ScrapeResult;
  summarizationResult?: SummarizationResult;
  applicabilityResult?: SummarizationResult;
  materialityResult?: SummarizationResult;
}

export interface Job {
  id: string;
  url: string;
  status: JobStatus;
  currentStage: StageName;
  stages: Stage[];
  createdAt: string;
}
