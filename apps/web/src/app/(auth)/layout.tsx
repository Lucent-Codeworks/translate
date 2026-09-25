import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-accent-glow opacity-60 blur-3xl"
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-8">
        <Logo className="h-12" />
        <div className="w-full rounded-lg border border-border bg-elevated p-8 shadow-[0_24px_64px_-24px_var(--accent-glow)]">
          {children}
        </div>
      </div>
    </main>
  );
}
