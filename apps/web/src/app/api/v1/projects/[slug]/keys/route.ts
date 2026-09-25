import { asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { projectLocale, translation, translationKey } from "@/db/schema";
import { extractPlaceholders } from "@/lib/placeholders";
import { authenticate, corsHeaders, preflight } from "@/lib/public-api";

export const OPTIONS = preflight;

/**
 * Every key in the project with its description and `{placeholders}`, for
 * code generation (`lucent-translate generate`). Placeholders come from the
 * base-locale text; keys without one use the union across other locales.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/projects/[slug]/keys">) {
  const { slug } = await ctx.params;
  const auth = await authenticate(request, slug);
  if (auth.error) return auth.error;
  const { project } = auth;

  const [keys, values, locales] = await Promise.all([
    db
      .select({ id: translationKey.id, key: translationKey.key, description: translationKey.description })
      .from(translationKey)
      .where(eq(translationKey.projectId, project.id))
      .orderBy(asc(translationKey.key)),
    db
      .select({ keyId: translation.keyId, locale: translation.locale, value: translation.value })
      .from(translation)
      .innerJoin(translationKey, eq(translationKey.id, translation.keyId))
      .where(eq(translationKey.projectId, project.id)),
    db
      .select({ code: projectLocale.code })
      .from(projectLocale)
      .where(eq(projectLocale.projectId, project.id))
      .orderBy(asc(projectLocale.code)),
  ]);

  const byKey = new Map<string, { base?: string; others: string[] }>();
  for (const v of values) {
    const entry = byKey.get(v.keyId) ?? { others: [] };
    if (v.locale === project.baseLocale) entry.base = v.value;
    else entry.others.push(v.value);
    byKey.set(v.keyId, entry);
  }

  return Response.json(
    {
      project: project.slug,
      baseLocale: project.baseLocale,
      locales: locales.map((l) => l.code),
      keys: keys.map((k) => {
        const texts = byKey.get(k.id);
        const source = texts?.base !== undefined ? [texts.base] : (texts?.others ?? []);
        return {
          key: k.key,
          description: k.description,
          placeholders: extractPlaceholders(source.join("\n")),
        };
      }),
    },
    { headers: { ...corsHeaders, "Cache-Control": "no-cache" } },
  );
}
