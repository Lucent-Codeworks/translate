import "server-only";
import { cache } from "react";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  project,
  projectLocale,
  projectMember,
  translation,
  translationKey,
} from "@/db/schema";
import type { Session } from "./auth";

export type ProjectRole = (typeof projectMember.$inferSelect)["role"];

export const isAdmin = (session: Session) => session.user.role === "admin";

/** Owners manage the project itself (languages, settings, members). */
export const canManage = (role: ProjectRole) => role === "owner";
/** Owners and editors change keys and translations. */
export const canEdit = (role: ProjectRole) => role === "owner" || role === "editor";

/** Projects visible to the user: all of them for admins, memberships otherwise. */
export async function listProjects(session: Session) {
  if (isAdmin(session)) {
    return db.select().from(project).orderBy(asc(project.name));
  }
  return db
    .select({ project })
    .from(project)
    .innerJoin(projectMember, eq(projectMember.projectId, project.id))
    .where(eq(projectMember.userId, session.user.id))
    .orderBy(asc(project.name))
    .then((rows) => rows.map((r) => r.project));
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
