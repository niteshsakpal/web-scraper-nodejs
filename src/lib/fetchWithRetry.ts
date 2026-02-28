/**
 * Fetch with retry logic and exponential backoff.
 * Retries on network errors and 5xx server errors.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: { maxRetries?: number; baseDelayMs?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelayMs = 2000, timeoutMs } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const fetchOptions: RequestInit = { ...options };

      // Add timeout signal if specified
      if (timeoutMs) {
        fetchOptions.signal = AbortSignal.timeout(timeoutMs);
      }

      const resp = await fetch(url, fetchOptions);

      // Retry on 5xx server errors
      if (resp.status >= 500 && attempt < maxRetries) {
        lastError = new Error(`Server error ${resp.status}`);
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[fetchWithRetry] Attempt ${attempt + 1} got ${resp.status}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return resp;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[fetchWithRetry] Attempt ${attempt + 1} failed: ${lastError.message}, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("All retry attempts failed");
}
