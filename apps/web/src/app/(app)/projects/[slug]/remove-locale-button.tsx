"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { removeLocale } from "./actions";

export function RemoveLocaleButton({ slug, code, name }: { slug: string; code: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove ${name} (${code})? All of its translations will be deleted.`)) return;
        startTransition(async () => {
          await removeLocale(slug, code);
          router.replace(`/projects/${slug}`);
        });
      }}
    >
      {pending ? "Removing…" : "Remove language"}
    </Button>
  );
}
