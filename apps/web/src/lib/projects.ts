import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  project,
  projectLocale,
  user,
  projectMember,
  projectSlugAlias,
  translation,
  translationKey,
} from "@/db/schema";
import type { Session } from "./auth";

export type ProjectRole = (typeof projectMember.$inferSelect)["role"];
export const projectRoles = projectMember.role.enumValues;

export const isAdmin = (session: Session) => session.user.role === "admin";

/** Owners manage the project itself (languages, settings, members). */
export const canManage = (role: ProjectRole) => role === "owner";
/** Owners and editors change keys and translations. */
export const canEdit = (role: ProjectRole) => role === "owner" || role === "editor";

/** Lightweight project list for navigation, with the user's effective role. */
export async function listProjectNav(session: Session) {
  const rows = await db
    .select({ slug: project.slug, name: project.name, role: projectMember.role })
    .from(project)
    .leftJoin(
      projectMember,
      and(eq(projectMember.projectId, project.id), eq(projectMember.userId, session.user.id)),
    )
    .orderBy(asc(project.name));
  const admin = isAdmin(session);
  return rows
    .filter((row) => admin || row.role !== null)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      canManage: admin || row.role === "owner",
    }));
}

export type ProjectNavItem = Awaited<ReturnType<typeof listProjectNav>>[number];

/** Projects visible to the user (all of them for admins), with summary stats. */
export async function listProjects(session: Session) {
  // Fully qualified, so the correlated subqueries below can't resolve a bare
  // "id" against their own tables.
  const projectId = sql.raw(`"project"."id"`);
  const baseLocale = sql.raw(`"project"."base_locale"`);
  const fields = {
    ...getTableColumns(project),
    locales: sql<string[]>`(
      select coalesce(array_agg(pl.code order by pl.code), '{}')
      from ${projectLocale} pl where pl.project_id = ${projectId}
    )`,
    keyCount: sql<number>`(
      select count(*)::int from ${translationKey} tk where tk.project_id = ${projectId}
    )`,
    // Translations in languages other than the base one.
    targetTranslatedCount: sql<number>`(
      select count(*)::int from ${translation} t
      join ${translationKey} tk on tk.id = t.key_id
      where tk.project_id = ${projectId} and t.locale <> ${baseLocale}
    )`,
  };

  const query = isAdmin(session)
    ? db.select(fields).from(project)
    : db
        .select(fields)
        .from(project)
        .innerJoin(projectMember, eq(projectMember.projectId, project.id))
        .where(eq(projectMember.userId, session.user.id));
  return query.orderBy(asc(project.name));
}

/** Returns the project and the user's role in it, or null if not accessible. */
export const getProject = cache(async (session: Session, slug: string) => {
  const [row] = await db
    .select({ project, role: projectMember.role })
    .from(project)
    .leftJoin(
      projectMember,
      and(eq(projectMember.projectId, project.id), eq(projectMember.userId, session.user.id)),
    )
    .where(eq(project.slug, slug));

  if (!row) return null;
  // Instance admins act as owners of every project.
  const role = isAdmin(session) ? "owner" : row.role;
  if (!role) return null;

  const locales = await db
    .select({ code: projectLocale.code })
    .from(projectLocale)
    .where(eq(projectLocale.projectId, row.project.id))
    .orderBy(asc(projectLocale.code));

  return { ...row.project, role, locales: locales.map((l) => l.code) };
});

/** Number of non-empty translations per locale. */
export async function getLocaleProgress(projectId: string) {
  const [keys, perLocale] = await Promise.all([
    db.select({ n: count() }).from(translationKey).where(eq(translationKey.projectId, projectId)),
    db
      .select({ locale: translation.locale, n: count() })
      .from(translation)
      .innerJoin(translationKey, eq(translationKey.id, translation.keyId))
      .where(eq(translationKey.projectId, projectId))
      .groupBy(translation.locale),
  ]);
  return {
    totalKeys: keys[0].n,
    translated: Object.fromEntries(perLocale.map((r) => [r.locale, r.n])) as Record<string, number>,
  };
}

/** All keys of a project with their values in the given locales. */
export async function getTranslationRows(projectId: string, locales: string[]) {
  const keys = await db
    .select({ id: translationKey.id, key: translationKey.key, description: translationKey.description })
    .from(translationKey)
    .where(eq(translationKey.projectId, projectId))
    .orderBy(asc(translationKey.key));

  const values = await db
    .select({ keyId: translation.keyId, locale: translation.locale, value: translation.value })
    .from(translation)
    .innerJoin(translationKey, eq(translationKey.id, translation.keyId))
    .where(and(eq(translationKey.projectId, projectId), inArray(translation.locale, locales)));

  const byKey = new Map<string, Record<string, string>>();
  for (const v of values) {
    byKey.set(v.keyId, { ...byKey.get(v.keyId), [v.locale]: v.value });
  }
  return keys.map((k) => ({ ...k, values: byKey.get(k.id) ?? {} }));
}

/** Explicit members of a project (instance admins have access without being listed). */
export async function listMembers(projectId: string) {
  return db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      isInstanceAdmin: sql<boolean>`coalesce(${user.role} = 'admin', false)`,
      role: projectMember.role,
      addedAt: projectMember.createdAt,
    })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(eq(projectMember.projectId, projectId))
    .orderBy(asc(user.name));
}

/** Whether a slug is an old slug of some project (so it can't be reused elsewhere). */
export async function isSlugReserved(slug: string, exceptProjectId?: string) {
  const [alias] = await db
    .select({ projectId: projectSlugAlias.projectId })
    .from(projectSlugAlias)
    .where(eq(projectSlugAlias.slug, slug));
  return alias !== undefined && alias.projectId !== exceptProjectId;
}

/** Current slug of the project that used to be called `slug`, if any. */
export async function resolveSlugAlias(slug: string) {
  const [row] = await db
    .select({ slug: project.slug })
    .from(projectSlugAlias)
    .innerJoin(project, eq(project.id, projectSlugAlias.projectId))
    .where(eq(projectSlugAlias.slug, slug));
  return row?.slug ?? null;
}

/** A project's previous slugs, newest first. */
export async function listSlugAliases(projectId: string) {
  const rows = await db
    .select({ slug: projectSlugAlias.slug })
    .from(projectSlugAlias)
    .where(eq(projectSlugAlias.projectId, projectId))
    .orderBy(desc(projectSlugAlias.createdAt));
  return rows.map((r) => r.slug);
}
