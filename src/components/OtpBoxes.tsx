// RALD Identity — OtpBoxes component
// Migrated from rald-auth-ui as part of Identity UI Consolidation.
// rald-auth-ui is now deprecated — all auth UI lives in profiles.rald.cloud.
// LILCKY STUDIO LIMITED

import { useRef, useEffect } from "react";

export type OtpBoxState = "idle" | "typing" | "filled" | "verified" | "error";

interface OtpBoxesProps {
  value:      string[];
  onChange:   (value: string[]) => void;
  state?:     OtpBoxState;
  disabled?:  boolean;
  autoFocus?: boolean;
}

export function OtpBoxes({
  value,
  onChange,
  state = "idle",
  disabled = false,
  autoFocus = true,
}: OtpBoxesProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  const getState = (idx: number): OtpBoxState => {
    if (state === "verified") return "verified";
    if (state === "error")    return "error";
    const current = value.findIndex((v) => !v);
    if (idx === current) return "typing";
    if (value[idx])      return "filled";
    return "idle";
  };

  const handleChange = (idx: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = char;
    onChange(next);
    if (char && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const next = [...value];
        next[idx] = "";
        onChange(next);
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0)  { inputs.current[idx - 1]?.focus(); }
      else if (e.key === "ArrowRight" && idx < 5) { inputs.current[idx + 1]?.focus(); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill("").map((_, i) => pasted[i] ?? "");
    onChange(next);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="otp-grid">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: OTP cells are fixed-position slots
          key={idx}
          className="otp-cell"
          data-state={getState(idx)}
        >
          <input
            ref={(el) => { inputs.current[idx] = el; }}
            className="otp-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[idx] ?? ""}
            disabled={disabled}
            autoComplete="one-time-code"
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${idx + 1}`}
          />
        </div>
      ))}
    </div>
  );
}
