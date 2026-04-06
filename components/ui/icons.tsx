import * as React from "react";

type IconProps = React.SVGAttributes<SVGSVGElement>;
type ReadonlyIconProps = Readonly<IconProps>;

const defaultProps = {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Plus(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function Checkmark(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

export function X(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function Trash2(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function Pencil(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
    </svg>
  );
}

export function Play(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="m8 5 11 7-11 7V5Z" />
    </svg>
  );
}

export function Square(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <rect
        x="8"
        y="8"
        width="8"
        height="8"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function RotateCw(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21 2v6h-6" />
      <path d="M20.5 13a8.5 8.5 0 1 1-2.5-6" />
    </svg>
  );
}

export function Zap(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M13 2 5 13h6l-1 9 8-11h-6z" />
    </svg>
  );
}

export function RefreshCw(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M21 2v6h-6" />
      <path d="M3 22v-6h6" />
      <path d="M20 13a8 8 0 0 0-14.5-4" />
      <path d="M4 11a8 8 0 0 0 14.5 4" />
    </svg>
  );
}

export function ChevronLeft(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRight(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function LogIn(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M10 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M14 17l5-5-5-5" />
      <path d="M19 12H9" />
    </svg>
  );
}

export function UserPlus(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M16 21a5 5 0 0 0-10 0" />
      <circle cx="11" cy="8" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  );
}

export function Eye(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function MoreHorizontal(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

export function Search(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function Clock(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

export function ArrowDown(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

export function Link(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 19" />
    </svg>
  );
}

export function Copy(props: ReadonlyIconProps) {
  return (
    <svg {...defaultProps} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
