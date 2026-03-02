import type { ApiClient, CreateJobInput, DashboardStats } from "./api.types";
import type { Job, Stage, StageName, ValidationResult, ScrapeResult, SummarizationFileResult } from "@/types/job";
import { mockJobs } from "@/data/mockJobs";
import { getPrompt } from "@/config/prompts";

const STAGES: StageName[] = [
  "URL Validation",
  "Scraping",
  "Summarization",
  "Materiality",
  "Applicability",
];

const STAGE_DETAILS: Record<StageName, string> = {
  "URL Validation": "Checking robots.txt and scraping permissions...",
  Scraping: "Extracting regulatory content from page...",
  Summarization: "Generating executive summary and compliance points...",
  Applicability: "Assessing regulatory applicability to business lines...",
  Materiality: "Evaluating materiality impact across dimensions...",
};

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** Call our Next.js proxy route which talks to the real validation API */
async function callValidationApi(url: string): Promise<{
  success: boolean;
  data?: {
    target_url: string;
    user_agent: string;
    robots_url: string;
    can_scrape: boolean;
    reason: string;
    crawl_delay_seconds: number | null;
  };
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ url });
    const resp = await fetch(`/api/validate?${params.toString()}`);
    return await resp.json();
  } catch {
    return { success: false, error: "Failed to reach validation API" };
  }
}

/** Call our Next.js proxy for AI summarization */
async function callAiResponse(
  filename: string,
  prompt: string,
  identifier: number
): Promise<{ status?: string; summary_html?: string; reasoning?: string; error?: string; details?: string }> {
  try {
    const resp = await fetch("/api/ai-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        prompt,
        identifier,
      }),
    });
    return await resp.json();
  } catch {
    return { status: "failure", error: "Failed to reach AI Response API" };
  }
}

/** Call our Next.js proxy route which talks to the real scraping API */
async function callScrapeApi(url: string, identifier: string, crawlDelay: number | null): Promise<{
  identifier?: string;
  files?: {
    cleaned_html?: string[];
    pdf?: string[];
  };
  error?: string;
}> {
  try {
    const resp = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        max_level: 1,
        identifier: parseInt(identifier, 10),
        crawl_delay: crawlDelay,
      }),
    });
    return await resp.json();
  } catch {
    return { error: "Failed to reach scraping API" };
  }
}

/** Get next job ID from server */
async function getNextJobIdFromServer(): Promise<number> {
  try {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    return parseInt(data.id, 10);
  } catch {
    return Date.now(); // fallback
  }
}

/** Load jobs from server */
async function loadJobsFromServer(): Promise<Job[]> {
  try {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    return data.jobs ?? [];
  } catch {
    return [];
  }
}

/** Save a single job to server */
async function saveJobToServer(job: Job) {
  try {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
  } catch { /* ignore */ }
}

/** Save a new job to server */
async function createJobOnServer(job: Job) {
  try {
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
  } catch { /* ignore */ }
}

export class MockApiClient implements ApiClient {
  private jobs: Job[] = [];
  private loaded = false;

  private async ensureLoaded() {
    if (!this.loaded) {
      this.jobs = await loadJobsFromServer();
      this.loaded = true;
    }
  }

  async listJobs(): Promise<Job[]> {
    // Always fetch from server for fresh cross-browser data
    const serverJobs = await loadJobsFromServer();
    // Merge: keep local in-progress jobs that server might not have yet
    for (const local of this.jobs) {
      if (!serverJobs.find((s) => s.id === local.id)) {
        serverJobs.push(local);
      }
    }
    this.jobs = serverJobs;
    return [...this.jobs].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
  }

  async getJob(id: string): Promise<Job> {
    await this.ensureLoaded();
    const job = this.jobs.find((j) => j.id === id);
    if (!job) throw new Error("Job not found");
    return JSON.parse(JSON.stringify(job));
  }

  async createJob({ url }: CreateJobInput): Promise<Job> {
    const id = await getNextJobIdFromServer();
    const now = new Date().toISOString();
    const stages: Stage[] = STAGES.map((name) => ({
      name,
      status: "Pending" as const,
    }));
    const job: Job = {
      id: String(id),
      url,
      status: "Pending",
      currentStage: "URL Validation",
      stages,
      createdAt: now,
    };
    this.jobs.unshift(job);
    await createJobOnServer(job);
    this.simulateProgress(job.id);
    await delay(250);
    return JSON.parse(JSON.stringify(job));
  }

  async getDashboardStats(): Promise<DashboardStats> {
    await this.ensureLoaded();
    // Also refresh from server
    const serverJobs = await loadJobsFromServer();
    if (serverJobs.length > 0) this.jobs = serverJobs;
    const total = this.jobs.length;
    const complete = this.jobs.filter((j) => j.status === "Complete").length;
    const successRate = total ? Math.round((complete / total) * 100) + "%" : "0%";
    const completedJobs = this.jobs.filter((j) => j.status === "Complete");
    const totalMs = completedJobs.reduce(
      (sum, j) =>
        sum + j.stages.reduce((s, stage) => s + (stage.durationMs ?? 0), 0),
      0
    );
    const avgMs = completedJobs.length
      ? Math.round(totalMs / completedJobs.length)
      : 0;
    return {
      totalJobs: total,
      successRate,
      avgProcessingTime: avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : "N/A",
    };
  }

  private async simulateProgress(id: string) {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return;

    await delay(500);

    /* ── Stage 1: URL Validation (real API call) ── */
    const valStage = job.stages[0];
    const valStart = Date.now();
    valStage.status = "Running";
    valStage.startedAt = new Date().toISOString();
    valStage.details = STAGE_DETAILS["URL Validation"];
    job.currentStage = "URL Validation";
    job.status = "Running";

    const result = await callValidationApi(job.url);

    valStage.completedAt = new Date().toISOString();
    valStage.durationMs = Date.now() - valStart;

    if (result.success && result.data) {
      const d = result.data;
      const vr: ValidationResult = {
        targetUrl: d.target_url,
        userAgent: d.user_agent,
        robotsUrl: d.robots_url,
        canScrape: d.can_scrape,
        reason: d.reason,
        crawlDelaySeconds: d.crawl_delay_seconds,
      };
      valStage.validationResult = vr;

      if (!d.can_scrape) {
        /* Scraping not allowed — fail the validation stage and stop */
        valStage.status = "Failed";
        valStage.details = `Scraping not allowed: ${d.reason}`;
        job.status = "Failed";
        await saveJobToServer(job);
        return;
      }

      valStage.status = "Complete";
      valStage.details = `Scraping is allowed. ${d.reason}`;
    } else {
      /* API error — fail gracefully */
      valStage.status = "Failed";
      valStage.details = `Validation API error: ${result.error ?? "Unknown error"}`;
      job.status = "Failed";
      await saveJobToServer(job);
      return;
    }
    await saveJobToServer(job);

    /* ── Stage 2: Scraping (real API call) ── */
    const scrapeStage = job.stages[1];
    const scrapeStart = Date.now();
    scrapeStage.status = "Running";
    scrapeStage.startedAt = new Date().toISOString();
    scrapeStage.details = STAGE_DETAILS["Scraping"];
    job.currentStage = "Scraping";

    const crawlDelay = valStage.validationResult?.crawlDelaySeconds ?? null;
    const scrapeResult = await callScrapeApi(job.url, job.id, crawlDelay);

    scrapeStage.completedAt = new Date().toISOString();
    scrapeStage.durationMs = Date.now() - scrapeStart;

    if (scrapeResult.error) {
      scrapeStage.status = "Failed";
      scrapeStage.details = `Scraping API error: ${scrapeResult.error}`;
      job.status = "Failed";
      await saveJobToServer(job);
      return;
    }

    const htmlFiles = scrapeResult.files?.cleaned_html ?? [];
    const pdfFiles = scrapeResult.files?.pdf ?? [];
    scrapeStage.scrapeResult = {
      identifier: scrapeResult.identifier ?? job.id,
      files: {
        cleanedHtml: htmlFiles,
        pdf: pdfFiles,
      },
    };
    scrapeStage.status = "Complete";
    const totalFiles = htmlFiles.length + pdfFiles.length;
    scrapeStage.details = `Scraped ${totalFiles} file(s): ${htmlFiles.length} HTML, ${pdfFiles.length} PDF.`;
    await saveJobToServer(job);

    /* ── Stage 3: Summarization (real AI API call per file) ── */
    const sumStage = job.stages[2];
    const sumStart = Date.now();
    sumStage.status = "Running";
    sumStage.startedAt = new Date().toISOString();
    sumStage.details = STAGE_DETAILS["Summarization"];
    job.currentStage = "Summarization";

    const summaryPrompt = getPrompt("summarization");
    const filesToSummarize = htmlFiles.length > 0 ? htmlFiles : [];

    // Initialize file results as pending
    const fileResults: SummarizationFileResult[] = filesToSummarize.map((f) => ({
      filename: f,
      status: "pending" as const,
    }));
    sumStage.summarizationResult = { files: fileResults };

    // Process each file sequentially
    let allSuccess = true;
    for (let i = 0; i < filesToSummarize.length; i++) {
      const fname = filesToSummarize[i];
      fileResults[i].status = "running";

      const aiResult = await callAiResponse(fname, summaryPrompt, parseInt(job.id, 10));

      if (aiResult.summary_html) {
        fileResults[i].status = "success";
        fileResults[i].summaryHtml = aiResult.summary_html;
        fileResults[i].reasoning = aiResult.reasoning;
      } else {
        fileResults[i].status = "failure";
        fileResults[i].error = aiResult.error ?? aiResult.details ?? "Unknown error";
        allSuccess = false;
      }
    }

    sumStage.completedAt = new Date().toISOString();
    sumStage.durationMs = Date.now() - sumStart;

    if (filesToSummarize.length === 0) {
      sumStage.status = "Complete";
      sumStage.details = "No HTML files to summarize.";
    } else if (allSuccess) {
      sumStage.status = "Complete";
      sumStage.details = `Summarized ${filesToSummarize.length} file(s) in ${(sumStage.durationMs / 1000).toFixed(1)}s.`;
    } else {
      const failCount = fileResults.filter((f) => f.status === "failure").length;
      sumStage.status = "Complete";
      sumStage.details = `Summarized ${filesToSummarize.length - failCount}/${filesToSummarize.length} file(s). ${failCount} failed.`;
    }
    await saveJobToServer(job);

    /* ── Stage 4: Materiality (real AI API call per file) ── */
    const matStage = job.stages[3];
    const matStart = Date.now();
    matStage.status = "Running";
    matStage.startedAt = new Date().toISOString();
    matStage.details = STAGE_DETAILS["Materiality"];
    job.currentStage = "Materiality";

    const materialityPrompt = getPrompt("materiality");
    const matFileResults: SummarizationFileResult[] = filesToSummarize.map((f) => ({
      filename: f,
      status: "pending" as const,
    }));
    matStage.materialityResult = { files: matFileResults };

    let matAllSuccess = true;
    for (let i = 0; i < filesToSummarize.length; i++) {
      const fname = filesToSummarize[i];
      matFileResults[i].status = "running";
      const aiResult = await callAiResponse(fname, materialityPrompt, parseInt(job.id, 10));
      if (aiResult.summary_html) {
        matFileResults[i].status = "success";
        matFileResults[i].summaryHtml = aiResult.summary_html;
        matFileResults[i].reasoning = aiResult.reasoning;
      } else {
        matFileResults[i].status = "failure";
        matFileResults[i].error = aiResult.error ?? aiResult.details ?? "Unknown error";
        matAllSuccess = false;
      }
    }

    matStage.completedAt = new Date().toISOString();
    matStage.durationMs = Date.now() - matStart;
    if (filesToSummarize.length === 0) {
      matStage.status = "Complete";
      matStage.details = "No HTML files to analyze.";
    } else if (matAllSuccess) {
      matStage.status = "Complete";
      matStage.details = `Analyzed materiality for ${filesToSummarize.length} file(s) in ${(matStage.durationMs / 1000).toFixed(1)}s.`;
    } else {
      const failCount = matFileResults.filter((f) => f.status === "failure").length;
      matStage.status = "Complete";
      matStage.details = `Analyzed ${filesToSummarize.length - failCount}/${filesToSummarize.length} file(s). ${failCount} failed.`;
    }
    await saveJobToServer(job);

    /* ── Stage 5: Applicability (real AI API call per file) ── */
    const appStage = job.stages[4];
    const appStart = Date.now();
    appStage.status = "Running";
    appStage.startedAt = new Date().toISOString();
    appStage.details = STAGE_DETAILS["Applicability"];
    job.currentStage = "Applicability";

    const applicabilityPrompt = getPrompt("applicability");
    const appFileResults: SummarizationFileResult[] = filesToSummarize.map((f) => ({
      filename: f,
      status: "pending" as const,
    }));
    appStage.applicabilityResult = { files: appFileResults };

    let appAllSuccess = true;
    for (let i = 0; i < filesToSummarize.length; i++) {
      const fname = filesToSummarize[i];
      appFileResults[i].status = "running";
      const aiResult = await callAiResponse(fname, applicabilityPrompt, parseInt(job.id, 10));
      if (aiResult.summary_html) {
        appFileResults[i].status = "success";
        appFileResults[i].summaryHtml = aiResult.summary_html;
        appFileResults[i].reasoning = aiResult.reasoning;
      } else {
        appFileResults[i].status = "failure";
        appFileResults[i].error = aiResult.error ?? aiResult.details ?? "Unknown error";
        appAllSuccess = false;
      }
    }

    appStage.completedAt = new Date().toISOString();
    appStage.durationMs = Date.now() - appStart;
    if (filesToSummarize.length === 0) {
      appStage.status = "Complete";
      appStage.details = "No HTML files to analyze.";
    } else if (appAllSuccess) {
      appStage.status = "Complete";
      appStage.details = `Analyzed applicability for ${filesToSummarize.length} file(s) in ${(appStage.durationMs / 1000).toFixed(1)}s.`;
    } else {
      const failCount = appFileResults.filter((f) => f.status === "failure").length;
      appStage.status = "Complete";
      appStage.details = `Analyzed ${filesToSummarize.length - failCount}/${filesToSummarize.length} file(s). ${failCount} failed.`;
    }

    job.status = "Complete";
    await saveJobToServer(job);
  }
}
