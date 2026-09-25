"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { projectMember, user } from "@/db/schema";
import { canManage, getProject, projectRoles, type ProjectRole } from "@/lib/projects";
import { requireSession } from "@/lib/session";

export type FormState = { error?: string; ok?: boolean };

const role = z.enum(projectRoles);

async function authorize(slug: string) {
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project) throw new Error("Not allowed");
  return { session, project };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Throws if changing `userId` away from owner would leave the project without
 * one. Locks the owner rows so concurrent changes can't both pass the check.
 */
async function assertKeepsAnOwner(tx: Tx, projectId: string, userId: string) {
  const owners = await tx
    .select({ userId: projectMember.userId })
    .from(projectMember)
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.role, "owner")))
    .for("update");
  if (owners.length === 1 && owners[0].userId === userId) {
    throw new LastOwnerError();
  }
}

class LastOwnerError extends Error {
  message = "A project needs at least one owner. Make someone else an owner first.";
}

export async function addMember(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { project } = await authorize(slug);
  if (!canManage(project.role)) throw new Error("Not allowed");

  const email = z.email("Enter a valid email").safeParse(String(formData.get("email")).trim());
  if (!email.success) return { error: email.error.issues[0].message };
  const parsedRole = role.safeParse(formData.get("role"));
  if (!parsedRole.success) return { error: "Choose a role" };

  const [found] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email.data.toLowerCase()));
  if (!found) {
    return { error: "No account uses that email. Ask an instance admin to create one." };
  }

  const inserted = await db
    .insert(projectMember)
    .values({ projectId: project.id, userId: found.id, role: parsedRole.data })
    .onConflictDoNothing()
    .returning({ userId: projectMember.userId });
  if (inserted.length === 0) return { error: "That person is already a member" };

  refresh();
  return { ok: true };
}

export async function updateMemberRole(
  slug: string,
  userId: string,
  newRole: ProjectRole,
): Promise<FormState> {
  const { project } = await authorize(slug);
  if (!canManage(project.role)) throw new Error("Not allowed");
  const parsedRole = role.parse(newRole);

  try {
    await db.transaction(async (tx) => {
      if (parsedRole !== "owner") await assertKeepsAnOwner(tx, project.id, userId);
      await tx
        .update(projectMember)
        .set({ role: parsedRole })
        .where(and(eq(projectMember.projectId, project.id), eq(projectMember.userId, userId)));
    });
  } catch (err) {
    if (err instanceof LastOwnerError) return { error: err.message };
    throw err;
  }
  refresh();
  return { ok: true };
}

/** Owners can remove anyone; any member can remove themselves (leave). */
export async function removeMember(slug: string, userId: string): Promise<FormState> {
  const { session, project } = await authorize(slug);
  const isSelf = userId === session.user.id;
  if (!isSelf && !canManage(project.role)) throw new Error("Not allowed");

  try {
    await db.transaction(async (tx) => {
      await assertKeepsAnOwner(tx, project.id, userId);
      await tx
        .delete(projectMember)
        .where(and(eq(projectMember.projectId, project.id), eq(projectMember.userId, userId)));
    });
  } catch (err) {
    if (err instanceof LastOwnerError) return { error: err.message };
    throw err;
  }

  // After leaving, the project is no longer accessible (unless instance admin).
  if (isSelf && session.user.role !== "admin") redirect("/projects");
  refresh();
  return { ok: true };
}
