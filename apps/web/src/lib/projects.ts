import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { project, projectLocale, projectMember } from "@/db/schema";
import type { Session } from "./auth";

export const isAdmin = (session: Session) => session.user.role === "admin";

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
export async function getProject(session: Session, slug: string) {
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
}
