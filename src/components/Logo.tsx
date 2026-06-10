interface LogoProps { size?: number; }

export function RaldMark({ size = 72 }: LogoProps) {
  const r = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="RALD"
    >
      <rect width="72" height="72" rx="20" fill="oklch(0.52 0.15 150)" />
      <text
        x="36"
        y="50"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="800"
        fontSize="32"
        fill="white"
        letterSpacing="-1"
      >
        R
      </text>
    </svg>
  );
}

export function RaldWordmark() {
  return (
    <div className="wordmark">
      <div className="wordmark-dot" aria-hidden />
      RALD
    </div>
  );
}
