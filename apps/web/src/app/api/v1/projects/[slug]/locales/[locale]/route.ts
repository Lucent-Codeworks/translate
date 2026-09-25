import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { projectLocale, translation, translationKey } from "@/db/schema";
import { apiError, authenticate, corsHeaders, preflight } from "@/lib/public-api";

export const OPTIONS = preflight;

/** Returns a locale's translations as a flat `{ key: value }` object. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/v1/projects/[slug]/locales/[locale]">,
) {
  const { slug, locale } = await ctx.params;

  const auth = await authenticate(request, slug);
  if (auth.error) return auth.error;
  const { project } = auth;

  const [known] = await db
    .select({ code: projectLocale.code })
    .from(projectLocale)
    .where(and(eq(projectLocale.projectId, project.id), eq(projectLocale.code, locale)));
  if (!known) return apiError(404, `Unknown locale "${locale}"`);

  const rows = await db
    .select({ key: translationKey.key, value: translation.value })
    .from(translation)
    .innerJoin(translationKey, eq(translationKey.id, translation.keyId))
    .where(and(eq(translationKey.projectId, project.id), eq(translation.locale, locale)))
    .orderBy(asc(translationKey.key));

  const body = JSON.stringify(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  // Content hash, so any change (including deletions) produces a new ETag.
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  const headers = { ...corsHeaders, ETag: etag, "Cache-Control": "no-cache" };

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch?.split(",").some((t) => t.trim().replace(/^W\//, "") === etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers: { ...headers, "Content-Type": "application/json" } });
}
