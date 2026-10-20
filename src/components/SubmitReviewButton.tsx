import { CheckCircle } from "lucide-react";

interface Props {
  submitting: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export default function SubmitReviewButton({ submitting, onClick, className = "" }: Props) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={submitting}
      className={`group relative h-12 min-w-0 pl-2 pr-3 rounded-2xl flex items-center justify-center gap-2 overflow-hidden border-[1.5px] border-[#0A2B5E] bg-gradient-to-b from-[#1E4DA0] to-[#0A2B5E] text-white select-none transition-all duration-300 ease-out shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_6px_rgba(10,43,94,0.25)] hover:from-[#2558B5] hover:to-[#0D3572] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_rgba(10,43,94,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.3)] disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 ${className}`}>
      <span aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent ${submitting ? "animate-shine" : "-translate-x-[120%] skew-x-[-20deg] opacity-0 group-hover:opacity-100 group-hover:animate-shine"}`} />
      <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
        {submitting
          ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : <CheckCircle className="w-4 h-4" />}
      </span>
      <span className="relative min-w-0 truncate text-[14px] font-bold leading-none">
        <span className="sm:hidden">{submitting ? "Submitting" : "Submit"}</span>
        <span className="hidden sm:inline">{submitting ? "Submitting..." : "Submit for Review"}</span>
      </span>
    </button>
  );
}
