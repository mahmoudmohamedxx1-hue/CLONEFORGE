interface P {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

const base = (p: P) => ({
  width: p.size ?? 18,
  height: p.size ?? 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.strokeWidth ?? 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
});

export const IconForge = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2l8 4.5-8 4.5-8-4.5L12 2z" fill="currentColor" stroke="none" />
    <path d="M4 12l8 4.5 8-4.5" />
    <path d="M4 17l8 4.5 8-4.5" />
  </svg>
);

export const IconGithub = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </svg>
);

export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </svg>
);

export const IconPhone = (p: P) => (
  <svg {...base(p)}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </svg>
);

export const IconMonitor = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="4" width="19" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

export const IconApple = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 7.5c0-2.5 2-4 2-4s.4 2.1-1.4 3.5M8.6 21c-1.8 0-4.6-3.4-4.6-7.3 0-2.9 1.9-4.7 4-4.7 1.3 0 2.3.8 3.9.8 1.5 0 2.7-.8 4-.8 2 0 3.6 1.4 4.1 3.4-2.8 1-2.3 5.6-4.6 6.9-.9.5-1.9-.3-3.3-.3s-2.2.8-3.5.8z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconWindows = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 5.5L10.5 4.4v7.1H3V5.5zM11.8 4.2L21 3v8.5h-9.2V4.2zM3 12.5h7.5v7.1L3 18.5v-6zM11.8 12.5H21V21l-9.2-1.3v-7.2z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLinux = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2.5c2.2 0 3.4 2 3.4 4.6 0 1.4.5 2.9 1.5 4.5 1.4 2.2 2.6 4.6 2.6 6.4 0 1.6-1.3 2.5-2.9 2.5-1.1 0-2-.4-2.9-.4s-1.5.5-2.7.5-1.8-.5-2.7-.5-1.8.4-2.9.4c-1.6 0-2.9-.9-2.9-2.5 0-1.8 1.2-4.2 2.6-6.4 1-1.6 1.5-3.1 1.5-4.5 0-2.6 1.2-4.6 3.4-4.6z" />
    <circle cx="10.3" cy="7.3" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="13.7" cy="7.3" r="0.7" fill="currentColor" stroke="none" />
    <path d="M10.5 9.5c.9.7 2.1.7 3 0" />
  </svg>
);

export const IconZap = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12.5l5 5L19.5 7" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconBox = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3L12 2.5z" />
    <path d="M3.8 7.2L12 12l8.2-4.8M12 12v9.3" />
  </svg>
);

export const IconTerminal = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7l6 5-6 5M12.5 19H20" />
  </svg>
);

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 1 0-2.3 6.3M20 5v6h-6" />
  </svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0l-.8 12a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7M10 11v6M14 11v6" />
  </svg>
);

export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h15m0 0l-6-6m6 6l-6 6" />
  </svg>
);

export const IconTarget = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconScan = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M3.5 12h17" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
