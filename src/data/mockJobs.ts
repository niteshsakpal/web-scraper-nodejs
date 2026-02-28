import type { Job } from "@/types/job";

export const mockJobs: Job[] = [
  {
    id: "job_a1b2c3d4",
    url: "https://eur-lex.europa.eu/regulation-2024-1234",
    status: "Complete",
    currentStage: "Summarization",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    stages: [
      { name: "URL Validation", status: "Complete", durationMs: 450, details: "URL is valid and reachable. HTTP 200 OK." },
      { name: "Scraping", status: "Complete", durationMs: 1350, details: "Extracted 12 sections, 4,200 words from the regulation page." },
      { name: "Summarization", status: "Complete", durationMs: 720, details: "Generated executive summary (350 words) and key compliance points." },
    ],
  },
  {
    id: "job_e5f6g7h8",
    url: "https://www.sec.gov/rules/final/2024/34-99247",
    status: "Complete",
    currentStage: "Summarization",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    stages: [
      { name: "URL Validation", status: "Complete", durationMs: 320, details: "URL is valid. SEC domain verified." },
      { name: "Scraping", status: "Complete", durationMs: 2100, details: "Extracted 28 sections, 11,500 words including amendments." },
      { name: "Summarization", status: "Complete", durationMs: 890, details: "Generated summary with 5 key regulatory impacts identified." },
    ],
  },
  {
    id: "job_i9j0k1l2",
    url: "https://www.fca.org.uk/publications/policy-statements/ps24-1",
    status: "Failed",
    currentStage: "Scraping",
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
    stages: [
      { name: "URL Validation", status: "Complete", durationMs: 510, details: "URL reachable. FCA domain confirmed." },
      { name: "Scraping", status: "Failed", durationMs: 3200, details: "Timeout after 3.2s. Page requires JavaScript rendering." },
      { name: "Summarization", status: "Pending" },
    ],
  },
  {
    id: "job_m3n4o5p6",
    url: "https://www.bis.org/bcbs/publ/d575.htm",
    status: "Complete",
    currentStage: "Summarization",
    createdAt: new Date(Date.now() - 900_000).toISOString(),
    stages: [
      { name: "URL Validation", status: "Complete", durationMs: 280, details: "BIS URL validated successfully." },
      { name: "Scraping", status: "Complete", durationMs: 1800, details: "Extracted Basel III framework updates, 8,200 words." },
      { name: "Summarization", status: "Complete", durationMs: 650, details: "Key capital requirement changes summarized in 280 words." },
    ],
  },
  {
    id: "job_q7r8s9t0",
    url: "https://www.esma.europa.eu/document/guidelines-mifid-ii",
    status: "Running",
    currentStage: "Scraping",
    createdAt: new Date(Date.now() - 300_000).toISOString(),
    stages: [
      { name: "URL Validation", status: "Complete", durationMs: 390, details: "ESMA URL verified." },
      { name: "Scraping", status: "Running", durationMs: 1650, details: "Extracting MiFID II guidelines..." },
      { name: "Summarization", status: "Pending" },
    ],
  },
];
