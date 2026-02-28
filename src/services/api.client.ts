import { USE_MOCK_API } from "./config";
import { MockApiClient } from "./api.mock";
import { HttpApiClient } from "./api.http";
import type { ApiClient } from "./api.types";

let client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!client) {
    client = USE_MOCK_API ? new MockApiClient() : new HttpApiClient();
  }
  return client;
}
