import { notFound } from "next/navigation";
import { canManage, getProject, listMembers } from "@/lib/projects";
import { requireSession } from "@/lib/session";
import { AddMemberForm } from "./add-member-form";
import { MemberActions } from "./member-actions";

const roleHelp = [
  ["Owner", "Everything, including languages, API keys and members"],
  ["Editor", "Add, rename and delete keys, edit and import translations"],
  ["Viewer", "Read and export translations"],
];

export default async function MembersPage({ params }: PageProps<"/projects/[slug]/members">) {
  const { slug } = await params;
  const session = await requireSession();
  const project = await getProject(session, slug);
  if (!project) notFound();

  const members = await listMembers(project.id);
  const manage = canManage(project.role);

  return (
    <div className="flex flex-col gap-6">
      {manage && <AddMemberForm slug={slug} />}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  {m.name}
                  {m.userId === session.user.id && <span className="ml-1 text-muted">(you)</span>}
                  {m.isInstanceAdmin && (
                    <span
                      title="Instance admins have owner access to every project, whatever their role here."
                      className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs text-muted"
                    >
                      Admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{m.email}</td>
                <td className="px-4 py-2">
                  <MemberActions
                    slug={slug}
                    userId={m.userId}
                    name={m.name}
                    role={m.role}
                    canManage={manage}
                    isSelf={m.userId === session.user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="grid max-w-2xl grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {roleHelp.map(([name, help]) => (
          <div key={name} className="contents">
            <dt className="font-medium">{name}</dt>
            <dd className="text-muted">{help}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">
        Instance admins can access every project without being listed here.
      </p>
    </div>
  );
}
