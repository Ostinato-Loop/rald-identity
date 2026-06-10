import type { ReactNode } from "react";
import { RaldWordmark } from "./Logo";

interface ShellProps {
  step: number;
  total?: number;
  children: ReactNode;
}

export function Shell({ step, total = 4, children }: ShellProps) {
  return (
    <div className="shell">
      {/* Ambient aurora */}
      <div className="aurora" aria-hidden />
      <div
        className="aurora-orb animate-float"
        aria-hidden
        style={{
          width: 360,
          height: 360,
          top: -120,
          right: -100,
          background: "radial-gradient(circle, oklch(0.52 0.15 150 / 0.14), transparent 70%)",
        }}
      />
      <div
        className="aurora-orb"
        aria-hidden
        style={{
          width: 280,
          height: 280,
          bottom: -60,
          left: -80,
          background: "radial-gradient(circle, oklch(0.78 0.14 80 / 0.10), transparent 70%)",
          animationDelay: "-3s",
        }}
      />

      <div className="shell-inner">
        <header className="shell-header">
          <RaldWordmark />
          <span className="step-label">Step {step} of {total}</span>
        </header>

        <div className="progress-bar" aria-hidden>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`progress-pip${i < step ? " done" : ""}`} />
          ))}
        </div>

        <main className="shell-main">{children}</main>

        <footer className="shell-footer">
          Built in Africa &middot; Works on any network
        </footer>
      </div>
    </div>
  );
}
