import { useEffect } from "react";

let lockCount = 0;
let saved = { html: "", body: "", pad: "" };

export function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    if (lockCount === 0) {
      saved = { html: html.style.overflow, body: body.style.overflow, pad: body.style.paddingRight };
      const scrollbar = window.innerWidth - html.clientWidth;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0) {
        html.style.overflow = saved.html;
        body.style.overflow = saved.body;
        body.style.paddingRight = saved.pad;
      }
    };
  }, [active]);
}
