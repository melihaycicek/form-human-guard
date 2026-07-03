export interface ArrowIconProps {
  size?: number;
  /** Degrees clockwise; 0 points up. */
  rotation?: number;
  className?: string;
}

/** Inline SVG arrow pointing up, rotated per direction. No image assets. */
export function ArrowIcon({ size = 48, rotation = 0, className }: ArrowIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", transform: `rotate(${rotation}deg)` }}
    >
      <path d="M12 2.5 L19 10.5 H14.5 V21.5 H9.5 V10.5 H5 Z" fill="currentColor" />
    </svg>
  );
}
