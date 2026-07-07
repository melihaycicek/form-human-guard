interface ArrowMarkProps {
  size?: number;
  className?: string;
}

/**
 * The brand mark: an up-right arrow inside a compass ring with the eight
 * direction ticks — the same 8-direction model the guard uses.
 */
export function ArrowMark({ size = 28, className }: ArrowMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="16"
        cy="16"
        r="14.5"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 16 + Math.sin(angle) * 12.4;
        const y1 = 16 - Math.cos(angle) * 12.4;
        const x2 = 16 + Math.sin(angle) * 14.4;
        const y2 = 16 - Math.cos(angle) * 14.4;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
      <path
        d="M11.5 20.5 20 12m0 0h-6.2M20 12v6.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
