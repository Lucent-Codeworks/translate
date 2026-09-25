import type { SVGProps } from "react";

/** Minimal line icons (20px grid, currentColor), in the style of the site's arrows. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const FolderIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3l1.5 2h6.5A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" />
  </Icon>
);
export const LanguagesIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 5h7M6.5 3v2M8.5 5c-.5 3-2.5 5.5-5 6.5M5 8c.7 1.6 2 2.8 3.5 3.5M11 17l3-7 3 7M12 15h4" />
  </Icon>
);
export const TransferIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 3v11m0 0-3-3m3 3 3-3M14 17V6m0 0-3 3m3-3 3 3" />
  </Icon>
);
export const CodeIcon = (p: P) => (
  <Icon {...p}>
    <path d="m7 6-4 4 4 4M13 6l4 4-4 4M11 4 9 16" />
  </Icon>
);
export const UsersIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="8" cy="7" r="3" />
    <path d="M2.5 16.5c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4M13 4.2a3 3 0 0 1 0 5.6M15 12.8c1.3.5 2.2 1.8 2.5 3.7" />
  </Icon>
);
export const KeyIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="7" cy="13" r="3.5" />
    <path d="m9.5 10.5 7-7M14 6l2 2M12 8l1.5 1.5" />
  </Icon>
);
export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 4v12M4 10h12" />
  </Icon>
);
export const MenuIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 6h14M3 10h14M3 14h14" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="m5 5 10 10M15 5 5 15" />
  </Icon>
);
export const SignOutIcon = (p: P) => (
  <Icon {...p}>
    <path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8M12 13.5 15.5 10 12 6.5M15.5 10H8" />
  </Icon>
);
export const SettingsIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" />
  </Icon>
);
