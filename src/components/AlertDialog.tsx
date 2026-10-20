import type { ReactNode, ButtonHTMLAttributes } from "react";
import { useLockBodyScroll } from "../lib/useLockBodyScroll";

export type DialogTone = "info" | "success" | "warning" | "danger";

const TONES: Record<DialogTone, { glow: string; halo: string; icon: string; eyebrow: string; bar: string }> = {
  info: {
    glow: "from-blue-100/80 via-sky-50/60",
    halo: "bg-blue-200/60",
    icon: "from-[#0A2B5E] to-[#1E4FA8] shadow-[#0A2B5E]/30",
    eyebrow: "bg-blue-50 text-[#1E3A8A] ring-blue-100",
    bar: "from-[#0A2B5E] via-[#1E4FA8] to-sky-400",
  },
  success: {
    glow: "from-emerald-100/80 via-teal-50/60",
    halo: "bg-emerald-200/60",
    icon: "from-emerald-500 to-teal-600 shadow-emerald-600/30",
    eyebrow: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bar: "from-emerald-400 via-teal-500 to-emerald-600",
  },
  warning: {
    glow: "from-amber-100/80 via-orange-50/50",
    halo: "bg-amber-200/60",
    icon: "from-amber-400 to-orange-500 shadow-amber-500/30",
    eyebrow: "bg-amber-50 text-amber-700 ring-amber-100",
    bar: "from-amber-300 via-amber-500 to-orange-500",
  },
  danger: {
    glow: "from-rose-100/80 via-red-50/50",
    halo: "bg-rose-200/60",
    icon: "from-rose-500 to-red-600 shadow-red-600/30",
    eyebrow: "bg-rose-50 text-rose-700 ring-rose-100",
    bar: "from-rose-400 via-red-500 to-rose-600",
  },
};

interface AlertDialogProps {
  tone: DialogTone;
  icon: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  pulse?: boolean;
}

export default function AlertDialog({ tone, icon, eyebrow, title, children, actions, pulse }: AlertDialogProps) {
  const t = TONES[tone];
  useLockBodyScroll();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain px-4 py-6 bg-[#06142E]/65 animate-dialog-fade" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_-12px_rgba(6,20,46,0.45)] ring-1 ring-black/5 animate-dialog-pop [transform:translateZ(0)]">
        <div className={`h-1 bg-gradient-to-r ${t.bar}`} />
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${t.glow} to-transparent`} />

        <div className="relative px-6 pt-8 pb-6 text-center">
          <div className="relative mx-auto mb-5 h-16 w-16">
            <span className={`absolute inset-0 rounded-full ${t.halo} ${pulse ? "animate-ping-slow" : "scale-125 opacity-60"}`} />
            <span className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${t.icon} text-white shadow-lg ring-4 ring-white`}>
              {icon}
            </span>
          </div>

          {eyebrow && (
            <span className={`mb-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ring-1 ${t.eyebrow}`}>
              {eyebrow}
            </span>
          )}
          <h3 className="text-[18px] font-bold leading-tight text-[#0A2B5E]">{title}</h3>
          {children && <div className="mt-2.5 text-[14px] leading-relaxed text-slate-500">{children}</div>}
        </div>

        {actions && <div className="relative flex gap-3 px-6 pb-6">{actions}</div>}
      </div>
    </div>
  );
}

type ButtonVariant = "primary" | "danger" | "success" | "warning" | "ghost";

const BUTTONS: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-[#0A2B5E] to-[#1E3A8A] text-white shadow-lg shadow-[#0A2B5E]/25 hover:shadow-[#0A2B5E]/40",
  danger: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-red-600/25 hover:shadow-red-600/40",
  success: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40",
  warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40",
  ghost: "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
};

export function DialogButton({ variant = "primary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...rest}
      className={`flex-1 select-none rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] ${BUTTONS[variant]} ${className}`}
    />
  );
}
