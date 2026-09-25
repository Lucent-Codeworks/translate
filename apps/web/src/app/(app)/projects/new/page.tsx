import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold">New project</h1>
      <NewProjectForm />
    </div>
  );
}
