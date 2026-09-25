import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge, Eyebrow } from "@/components/ui";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { CreateUserForm } from "./create-user-form";

export default async function UsersPage() {
  const session = await requireSession();
  if (!isAdmin(session)) notFound();

  const { users } = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 100, sortBy: "createdAt", sortDirection: "asc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow>Instance admin</Eyebrow>
        <h1 className="text-3xl font-semibold">Users</h1>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-elevated">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-2/60 text-left text-xs uppercase tracking-wider text-subtle">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{u.role ?? "user"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="flex max-w-lg flex-col gap-4">
        <h2 className="text-lg font-semibold">Add a user</h2>
        <CreateUserForm />
      </section>
    </div>
  );
}
