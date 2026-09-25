"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field, Input, Select } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function CreateUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setPending(true);
    setError(undefined);
    const { error } = await authClient.admin.createUser({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      role: form.get("role") === "admin" ? "admin" : "user",
    });
    setPending(false);
    if (error) return setError(error.message ?? "Could not create user");
    formEl.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input name="name" required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Initial password" hint="Share it with the user; they can change it later">
        <Input name="password" type="password" minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="user">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <ErrorText>{error}</ErrorText>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
