const RING_RADIUS = 12;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface Props {
  onClick: () => void;
  sending: boolean;
  countdown: number;
  totalSeconds?: number;
  className?: string;
}

export default function ResendCodeButton({ onClick, sending, countdown, totalSeconds = 60, className = "" }: Props) {
  const waiting = countdown > 0 && !sending;
  const ready = !sending && countdown === 0;
  const label = sending ? "Sending Code..." : waiting ? "Wait to Resend" : "Resend Code";
  const shortLabel = sending ? "Sending" : "Resend";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sending || countdown > 0}
      aria-live="polite"
      aria-label={waiting ? `Resend available in ${countdown} seconds` : label}
      className={`group relative h-12 min-w-0 pl-2 pr-3 rounded-2xl flex items-center justify-center gap-2 overflow-hidden border-[1.5px] transition-all duration-300 ease-out select-none disabled:cursor-not-allowed ${
        sending
          ? "border-sky-400 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-900 shadow-[0_0_0_4px_rgba(56,189,248,0.18)]"
          : waiting
            ? "border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100/80 text-amber-900"
            : "border-[#1E4DA0]/60 bg-gradient-to-b from-[#F1F6FF] to-[#D6E5FC] text-[#0A2B5E] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(30,77,160,0.18)] hover:border-[#1E4DA0] hover:from-[#E6F0FF] hover:to-[#C3D8FA] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_rgba(30,77,160,0.28)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:shadow-[inset_0_2px_6px_rgba(10,43,94,0.2)]"
      } ${className}`}>
      {sending && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shine" />
      )}
      {ready && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent -translate-x-[120%] skew-x-[-20deg] opacity-0 group-hover:opacity-100 group-hover:animate-shine" />
      )}
      <span className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
        sending
          ? "bg-sky-500 text-white"
          : waiting
            ? "bg-white shadow-sm"
            : "bg-gradient-to-br from-[#1E4DA0] to-[#0A2B5E] text-white shadow-md shadow-[#0A2B5E]/30 group-hover:scale-110 group-active:scale-95"
      }`}>
        {sending ? (
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : waiting ? (
          <>
            <svg aria-hidden className="absolute inset-0 -rotate-90 text-amber-600" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
              <circle
                cx="14" cy="14" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - Math.min(1, countdown / totalSeconds))}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className="relative text-[12px] font-bold tabular-nums leading-none text-amber-800">{countdown}</span>
          </>
        ) : (
          <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </span>
      <span className="relative min-w-0 truncate text-[14px] font-bold leading-none">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </button>
  );
}
