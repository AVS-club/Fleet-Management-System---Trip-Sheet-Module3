import React from "react";

/**
 * AI Alerts Button — animated, accessible, and brand-colored
 * Restored previous version before font-size change (original balanced layout)
 */
export default function AvsAiButton({
  onClick,
  label = "AI Alerts",
  className = "",
  isActive = false,
  variant = "full", // "full" | "compact"
}: {
  onClick: () => void;
  label?: string;
  className?: string;
  isActive?: boolean;
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 transition-all select-none hover:brightness-105 active:scale-[0.98] font-[inherit] tracking-[inherit] ${className}`}
        style={{
          background:
            "linear-gradient(135deg, var(--avs-green) 0%, var(--avs-blue) 100%)",
          color: "white",
        }}
      >
        <span className="inline-flex h-5 w-5 sm:h-5 sm:w-5 items-center justify-center rounded-md bg-white/10">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2c-2.2 0-4 1.8-4 4-.9 0-1.7.3-2.3 1C4.4 7.3 4 8.1 4 9a3 3 0 0 0 3 3h.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 2c2.2 0 4 1.8 4 4 .9 0 1.7.3 2.3 1 .3.3.7 1.1.7 2a3 3 0 0 1-3 3H16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 7.5l-2.2 3.2h2l-1.3 3.8 3.5-4h-2l2-3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <span className="relative mt-0.5 h-[12px] sm:h-[14px] overflow-hidden">
          <span className="block animate-swapY">
            <span className="block text-[10px] sm:text-xs leading-none">AI</span>
            <span className="block text-[10px] sm:text-xs leading-none">Alerts</span>
          </span>
        </span>

        <style>{`
          :root { --avs-green:#0aa073; --avs-blue:#0b3c74; }
          @keyframes swapY {
            0%,40%   { transform: translateY(0%); }
            50%,90%  { transform: translateY(-100%); }
            100%     { transform: translateY(-100%); }
          }
          .animate-swapY { animation: swapY 2.8s ease-in-out infinite; }
        `}</style>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex items-center gap-3 rounded-3xl px-6 py-3 select-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)] font-[inherit] tracking-[inherit] ${isActive ? "ring-2 ring-[var(--avs-blue)]" : ""} ${className}`}
      style={{
        background:
          "linear-gradient(135deg, var(--avs-green) 0%, var(--avs-blue) 100%)",
        color: "white",
        boxShadow: isActive
          ? "0 0 0 4px rgba(255,255,255,0.6) inset, 0 12px 32px rgba(0, 64, 128, 0.35)"
          : "0 0 0 2px rgba(255,255,255,0.35) inset, 0 8px 24px rgba(0, 64, 128, 0.25)",
      }}
    >
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <span className="absolute -left-16 top-0 h-full w-24 rotate-12 opacity-0 sheen" />
        <span className="absolute inset-0 rounded-3xl ring-1 ring-white/10" />
      </span>

      <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-[1px]">
        <svg
          width="45"
          height="45"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
        >
          <path
            d="M12 2c-2.2 0-4 1.8-4 4-.9 0-1.7.3-2.3 1C4.4 7.3 4 8.1 4 9a3 3 0 0 0 3 3h.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 2c2.2 0 4 1.8 4 4 .9 0 1.7.3 2.3 1 .3.3.7 1.1.7 2a3 3 0 0 1-3 3H16"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 7.5l-2.2 3.2h2l-1.3 3.8 3.5-4h-2l2-3"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="relative overflow-hidden h-[20px]">
        <span className="block animate-swapY">
          <span className="block text-lg font-semibold leading-none tracking-wide">AI</span>
          <span className="block text-lg font-semibold leading-none tracking-wide">Alerts</span>
        </span>
      </span>

      <span
        className={`pointer-events-none absolute inset-0 rounded-3xl ${
          isActive ? "pulse" : ""
        }`}
        style={{ boxShadow: "0 0 0 0 rgba(19,138,108,0.0)" }}
      />

      <span className="pointer-events-none absolute inset-0 rounded-3xl hover:shine" />

      <style>{`
        :root { --avs-green:#0aa073; --avs-blue:#0b3c74; }
        @keyframes avsPulse { 0%{box-shadow:0 0 0 0 rgba(10,160,115,0.0);} 50%{box-shadow:0 0 0 10px rgba(10,160,115,0.18);} 100%{box-shadow:0 0 0 0 rgba(10,160,115,0.0);} }
        @keyframes avsSheen { 0%{ transform:translateX(-120%); opacity:0;} 30%{opacity:0.25;} 60%{opacity:0.15;} 100%{ transform:translateX(220%); opacity:0;} }
        .pulse{ animation: avsPulse 2.4s ease-in-out infinite; }
        .sheen{ background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: avsSheen 2.2s ease-in-out infinite; }
        @keyframes swapY { 0%,40%{transform:translateY(0%);} 50%,90%{transform:translateY(-100%);} 100%{transform:translateY(-100%);} }
        .animate-swapY{ animation: swapY 2.8s ease-in-out infinite; }
      `}</style>
    </button>
  );
}
