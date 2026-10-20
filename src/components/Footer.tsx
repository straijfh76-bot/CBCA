import React from "react";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0A2B5E] text-blue-200 text-xs mt-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {/* Mobile footer — stacked, centered */}
      <div className="lg:hidden px-4 py-2 flex flex-col items-center gap-0.5 text-center">
        <div className="text-blue-200 text-[11px]">
          © 2026 ISFC. All rights reserved.
        </div>
        <div className="flex items-center gap-1.5 text-blue-300/70 text-[10px]">
          <Shield className="w-3 h-3" />
          <span>Reg. No. ISFC-REG-2019-00841</span>
        </div>
      </div>

      {/* Desktop/tablet footer — original layout */}
      <div className="hidden lg:flex max-w-7xl mx-auto px-4 py-2.5 flex-row items-center justify-between gap-2">
        <div>© 2026 International Settlement &amp; Funds Clearing Commission (ISFC). All rights reserved.</div>
        <div className="text-blue-300">Reg. No. ISFC-REG-2019-00841 · Licensed Under International Payment Settlement Framework</div>
      </div>
    </footer>
  );
}
