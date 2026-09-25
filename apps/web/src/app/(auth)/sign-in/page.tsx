import Link from "next/link";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/ui";
import { hasAnyUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  if (await getSession()) redirect("/projects");
  // Fresh install: send the operator to create the admin account.
  if (!(await hasAnyUser())) redirect("/sign-up");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Translate</Eyebrow>
        <h1 className="text-2xl font-semibold">Sign in</h1>
      </div>
      <SignInForm />
      {process.env.ALLOW_PUBLIC_SIGNUP === "true" && (
        <p className="text-sm text-muted">
          No account?{" "}
          <Link href="/sign-up" className="underline">
            Sign up
          </Link>
        </p>
      )}
    </div>
  );
}
