import "server-only";
import type { NextRequest } from "next/server";
import { verifyApiKey } from "./api-keys";

// Project API keys are read-only and meant to ship in client bundles, so the
// public API is callable from any origin.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, If-None-Match",
  "Access-Control-Expose-Headers": "ETag",
  "Access-Control-Max-Age": "86400",
};

export const apiError = (status: number, message: string) =>
  Response.json({ error: message }, { status, headers: corsHeaders });

export const preflight = () => new Response(null, { status: 204, headers: corsHeaders });

/** Resolves the project for a bearer API key, or returns an error response. */
export async function authenticate(request: NextRequest, slug: string) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return { error: apiError(401, "Missing API key") };
  const project = await verifyApiKey(token, slug);
  if (!project) return { error: apiError(401, "Invalid API key") };
  return { project };
}
