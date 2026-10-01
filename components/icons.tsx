import type { ReactNode } from "react";

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const BedIcon = () => (
  <Icon>
    <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11" r="1.6" />
  </Icon>
);
export const PlaneIcon = () => (
  <Icon>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  </Icon>
);
export const CarIcon = () => (
  <Icon>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2M9 17h6" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </Icon>
);
export const UserIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
  </Icon>
);
export const MenuIcon = () => (
  <Icon size={24}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon size={24}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
export const ChevronLeftIcon = () => (
  <Icon size={22}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
);
export const ChevronRightIcon = () => (
  <Icon size={22}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);
export const ChevronDownIcon = () => (
  <Icon size={20}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
);

/** Solid plane glyph for autocomplete rows. */
export const PlaneSolidIcon = () => (
  <svg
    width={17}
    height={17}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" />
  </svg>
);

/* ---------- Sidebar icons (mockup: sodebars.png) ---------- */

export const PackageIcon = () => (
  <Icon>
    <path d="M21 8.5v7L12 20l-9-4.5v-7L12 4l9 4.5z" />
    <path d="M3.3 8.3 12 12.5l8.7-4.2M12 12.5V20" />
  </Icon>
);
export const CruiseIcon = () => (
  <Icon>
    <path d="M4 17c.8.7 1.8 1 3 1s2.2-.3 3-1c.8.7 1.8 1 3 1s2.2-.3 3-1c.8.7 1.8 1 3 1" />
    <path d="M5 17l-1-4h16l-1 4M12 13V7M8.5 9.5 12 7l3.5 2.5" />
  </Icon>
);
export const PlanAiIcon = () => (
  <Icon>
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    <path d="M19 2.5v3M17.5 4h3" />
  </Icon>
);
export const PinIcon = () => (
  <Icon>
    <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </Icon>
);
export const ChartIcon = () => (
  <Icon>
    <path d="M5 20v-6M12 20V9M19 20v-9" />
    <path d="M12 9V4" strokeDasharray="0.1 3.4" />
  </Icon>
);
export const TagIcon = () => (
  <Icon>
    <path d="M3 11V4h7l10 10-7 7L3 11z" />
    <circle cx="7.5" cy="8.5" r="1.4" />
  </Icon>
);
export const GlobeIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.7 2.6 4 5.6 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.6-4-9s1.3-6.4 4-9z" />
  </Icon>
);
export const SendIcon = () => (
  <Icon>
    <path d="M21 3 3 10.5l7 3 3 7L21 3z" />
    <path d="m10 13.5 4.5-4.5" />
  </Icon>
);
export const TipsIcon = () => (
  <Icon>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </Icon>
);
export const BriefcaseIcon = () => (
  <Icon>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
  </Icon>
);
export const HeartIcon = () => (
  <Icon>
    <path d="M12 20.5s-8-4.8-8-10.4C4 7 6.2 5 8.8 5c1.4 0 2.6.7 3.2 1.7C12.6 5.7 13.8 5 15.2 5 17.8 5 20 7 20 10.1c0 5.6-8 10.4-8 10.4z" />
  </Icon>
);
export const DollarIcon = () => (
  <Icon>
    <path d="M12 3v18" />
    <path d="M16.5 7.2C15.8 6 14.1 5.5 12 5.5c-2.5 0-4.5 1.2-4.5 3.2 0 4.4 9 2.2 9 6.6 0 2-2 3.2-4.5 3.2-2.1 0-3.8-.5-4.5-1.7" />
  </Icon>
);
export const FeedbackIcon = () => (
  <Icon>
    <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V5z" />
  </Icon>
);
export const CloseIcon = () => (
  <Icon size={22}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
