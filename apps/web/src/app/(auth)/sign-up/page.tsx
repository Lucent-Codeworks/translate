import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/ui";
import { hasAnyUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {
  if (await getSession()) redirect("/projects");
  const isFirstUser = !(await hasAnyUser());
  if (!isFirstUser && process.env.ALLOW_PUBLIC_SIGNUP !== "true") redirect("/sign-in");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>{isFirstUser ? "First-time setup" : "Translate"}</Eyebrow>
        <h1 className="text-2xl font-semibold">
          {isFirstUser ? "Set up your instance" : "Create an account"}
        </h1>
        {isFirstUser && (
          <p className="text-sm text-muted">
            This first account will be the instance administrator.
          </p>
        )}
      </div>
      <SignUpForm />
    </div>
  );
}
