import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="site-footer mt-auto flex-shrink-0 text-xs" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
      <div className="site-footer-mobile flex flex-col items-center gap-1 px-5 py-3 text-center lg:hidden">
        <div className="text-[10px] font-medium tracking-[0.025em] text-[#CDD5E1]">
          © 2026 ISFC. All rights reserved.
        </div>
        <div className="flex items-center gap-1.5 text-[9px] tracking-[0.04em] text-[#C6B78F]">
          <Shield className="h-3 w-3 text-[#D3B66E]" aria-hidden="true" />
          <span>Reg. No. ISFC-REG-2019-00841</span>
        </div>
      </div>

      <div className="mx-auto hidden max-w-7xl items-center justify-between gap-6 px-8 py-4 text-[10px] leading-relaxed tracking-[0.015em] lg:flex">
        <div className="min-w-0">© 2026 International Settlement &amp; Funds Clearing Commission (ISFC). All rights reserved.</div>
        <div className="flex min-w-0 items-center gap-2 border-l border-[#C8992A]/25 pl-6 text-[#C6B78F]">
          <Shield className="h-3.5 w-3.5 flex-shrink-0 text-[#D3B66E]" aria-hidden="true" />
          <span>Reg. No. ISFC-REG-2019-00841 · Licensed Under International Payment Settlement Framework</span>
        </div>
      </div>
    </footer>
  );
}
