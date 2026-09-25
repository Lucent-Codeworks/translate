"use client";

import { useActionState, useState } from "react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { createProject } from "../actions";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, {});
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Name">
        <Input
          name="name"
          required
          defaultValue={state.values?.name}
          onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))}
        />
        <ErrorText>{state.errors?.name}</ErrorText>
      </Field>
      <Field label="Slug" hint="Used in URLs and by the SDK to identify the project">
        <Input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
        <ErrorText>{state.errors?.slug}</ErrorText>
      </Field>
      <Field label="Base locale" hint="The language your source strings are written in">
        <Input name="baseLocale" required defaultValue={state.values?.baseLocale ?? "en"} />
        <ErrorText>{state.errors?.baseLocale}</ErrorText>
      </Field>
      <Field label="Description">
        <Input name="description" defaultValue={state.values?.description} />
        <ErrorText>{state.errors?.description}</ErrorText>
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
