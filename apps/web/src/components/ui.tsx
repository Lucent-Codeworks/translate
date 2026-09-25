import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonBase =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium tracking-[-0.01em] transition duration-200 ease-brand disabled:pointer-events-none disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent hover:-translate-y-px hover:bg-accent-bright hover:shadow-[0_6px_24px_-6px_var(--accent-glow)] motion-reduce:hover:translate-y-0",
  secondary:
    "border border-border-strong bg-surface text-foreground hover:border-accent hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
  danger: "border border-border-strong bg-surface text-danger hover:border-danger hover:bg-danger-dim",
};

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cx(buttonBase, buttonVariants[variant], className);

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

const fieldBase =
  "h-9 rounded-md border border-border-strong bg-surface px-3 text-sm outline-none transition duration-200 ease-brand placeholder:text-subtle hover:border-accent/60 focus:border-accent focus:ring-3 focus:ring-accent-dim";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, "w-full", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "pr-8", className)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-lg border border-border bg-elevated p-6", className)}
      {...props}
    />
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-danger">{children}</p>;
}

/** Small uppercase mono label, as used on lucentcodeworks.com. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cx("font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent", className)}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "accent" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.08em]",
        tone === "accent" ? "bg-accent-dim text-accent" : "border border-border-strong text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx("h-1 overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-brand"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-elevated px-6 py-12 text-center">
      <div className="grid size-10 place-items-center rounded-full bg-accent-dim text-accent">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div className="font-medium">{title}</div>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action}
    </div>
  );
}

/**
 * Lucent Codeworks wordmark (from lucentcodeworks.com). The dark variant has
 * its lettering recoloured light so it stays legible on the dark theme.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex", className)}>
      <Image
        src="/brand/lucent-wordmark.png"
        alt="Lucent Codeworks"
        width={516}
        height={160}
        priority
        className="h-full w-auto dark:hidden"
      />
      <Image
        src="/brand/lucent-wordmark-dark.png"
        alt="Lucent Codeworks"
        width={516}
        height={160}
        priority
        className="hidden h-full w-auto dark:block"
      />
    </span>
  );
}
