"use client";

import { useRouter } from "next/navigation";
import { SignOutIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      title="Sign out"
      aria-label="Sign out"
      className="grid size-8 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-foreground"
      onClick={async () => {
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      <SignOutIcon />
    </button>
  );
}
