import { Card, Eyebrow } from "@/components/ui";
import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Eyebrow>Projects</Eyebrow>
        <h1 className="text-3xl font-semibold">New project</h1>
      </div>
      <Card>
        <NewProjectForm />
      </Card>
    </div>
  );
}
