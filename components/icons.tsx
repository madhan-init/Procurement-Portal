// Minimal inline icon set — every icon is always paired with a text label.
type P = { size?: number; className?: string };
const base = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconCalendarPlus = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18M12 14v4M10 16h4" />
  </svg>
);
export const IconTrack = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="10" r="3" />
    <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8Z" />
  </svg>
);
export const IconRupee = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 3h12M6 8h12M6 3c6 0 8 2.5 8 5s-2 5-8 5l8 8" />
  </svg>
);
export const IconClock = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconMegaphone = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 11v3a1 1 0 0 0 1 1h2l3 5h2v-5m-8-4V9a1 1 0 0 1 1-1h2l3-5h2v16M13 8l7-4v16l-7-4" />
  </svg>
);
export const IconSend = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m3 3 18 9-18 9 4-9-4-9ZM7 12h14" />
  </svg>
);
export const IconWheat = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 22V8M12 8c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Zm0 6c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Zm0 6c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Z" />
  </svg>
);
export const IconQueue = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="8" cy="7" r="3" />
    <path d="M2 21v-1a6 6 0 0 1 12 0v1M16 4.5a3 3 0 0 1 0 5M19 21v-1a6 6 0 0 0-3.5-5.5" />
  </svg>
);
export const IconChart = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </svg>
);
