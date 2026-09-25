import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
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
      <h1 className="text-2xl font-semibold">Users</h1>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
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
                <td className="px-4 py-2">{u.role ?? "user"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <section className="flex max-w-lg flex-col gap-4">
        <h2 className="text-lg font-semibold">Add user</h2>
        <CreateUserForm />
      </section>
    </div>
  );
}
