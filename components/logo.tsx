/** Svetla Stran logo — Sun behind Triglav peaks */

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 2;
}

export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <span className={className}>
      <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
        {/* Sun glow */}
        <circle cx="24" cy="20" r="14" fill="currentColor" className="text-gold/30" />
        {/* Sun circle */}
        <circle cx="24" cy="20" r="8" fill="currentColor" className="text-gold" />
        {/* Rays */}
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-gold">
          <line x1="24" y1="4" x2="24" y2="8" />
          <line x1="13" y1="9" x2="15.5" y2="12" />
          <line x1="35" y1="9" x2="32.5" y2="12" />
          <line x1="7" y1="20" x2="11" y2="20" />
          <line x1="37" y1="20" x2="41" y2="20" />
        </g>
        {/* Triglav peaks */}
        <path
          d="M2 44 L13 30 L19 35 L24 23 L29 35 L35 30 L46 44 Z"
          fill="currentColor"
          className="text-foreground"
        />
      </svg>
    </span>
  );
}
