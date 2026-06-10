// RALD Identity — Logo & Wordmark components
// Uses the real RALD tri-colour PNG logo from /public/rald-logo.png.
// Falls back gracefully when the image hasn't loaded yet.
// LILCKY STUDIO LIMITED

interface LogoProps { size?: number; }

/** Square RALD mark — used in QR approve, error states, profile headers. */
export function RaldMark({ size = 72 }: LogoProps) {
  return (
    <img
      src="/rald-logo.png"
      width={size}
      height={size}
      alt="RALD"
      draggable={false}
      style={{
        objectFit:   "contain",
        display:     "block",
        userSelect:  "none",
        borderRadius: size >= 48 ? 16 : 8,
      }}
    />
  );
}

/** Horizontal wordmark — logo mark + "RALD" text side by side. */
export function RaldWordmark() {
  return (
    <div className="wordmark">
      <img
        src="/rald-logo.png"
        width={30}
        height={30}
        alt=""
        aria-hidden
        draggable={false}
        style={{
          objectFit:    "contain",
          display:      "block",
          userSelect:   "none",
          borderRadius: 8,
          flexShrink:   0,
        }}
      />
      RALD
    </div>
  );
}
