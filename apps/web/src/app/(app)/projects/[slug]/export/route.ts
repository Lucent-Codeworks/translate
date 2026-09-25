import { and, asc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { translation, translationKey } from "@/db/schema";
import { nestMessages, NestingConflictError } from "@/lib/json-format";
import { getProject } from "@/lib/projects";
import { getSession } from "@/lib/session";

/** Downloads one locale as JSON. `?locale=de&format=flat|nested` */
export async function GET(request: NextRequest, ctx: RouteContext<"/projects/[slug]/export">) {
  const { slug } = await ctx.params;
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const project = await getProject(session, slug);
  if (!project) return new Response("Not found", { status: 404 });

  const locale = request.nextUrl.searchParams.get("locale") ?? project.baseLocale;
  const nested = request.nextUrl.searchParams.get("format") === "nested";
  if (!project.locales.includes(locale)) return new Response("Unknown locale", { status: 404 });

  const rows = await db
    .select({ key: translationKey.key, value: translation.value })
    .from(translation)
    .innerJoin(translationKey, eq(translationKey.id, translation.keyId))
    .where(and(eq(translationKey.projectId, project.id), eq(translation.locale, locale)))
    .orderBy(asc(translationKey.key));
  const entries = rows.map((r) => [r.key, r.value] as [string, string]);

  let data;
  try {
    data = nested ? nestMessages(entries) : Object.fromEntries(entries);
  } catch (err) {
    if (err instanceof NestingConflictError) {
      return new Response(`${err.message}. Export as flat JSON instead.`, { status: 409 });
    }
    throw err;
  }

  return new Response(JSON.stringify(data, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.${locale}.json"`,
    },
  });
}
