import type { KeysResponse } from "./generate";

export interface FetchKeysOptions {
  baseUrl: string;
  project: string;
  apiKey: string;
  fetch?: typeof fetch;
}

/** Fetches every key of a project (with descriptions and placeholders). */
export async function fetchKeys({ baseUrl, project, apiKey, fetch = globalThis.fetch }: FetchKeysOptions) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/projects/${encodeURIComponent(project)}/keys`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  } catch (err) {
    throw new Error(`Could not reach ${url}: ${(err as Error).message}`);
  }
  if (response.status === 401) {
    throw new Error(`The API key was rejected for project "${project}". Check it belongs to this project and hasn't been revoked.`);
  }
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}. Is the base URL right, and is the server up to date?`);
  }
  return (await response.json()) as KeysResponse;
}
