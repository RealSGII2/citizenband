'use client';

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function GlobalKeybindListener() {
  useEffect(() => {
    window.addEventListener("keydown", (event) => {
      if (
        (event.ctrlKey && event.shiftKey && event.code == "KeyI") ||
        event.code == "F12"
      ) {
        window.app.openDevTools();
      }

      if (event.ctrlKey && event.code == 'KeyR') window.location.reload()
    });
  }, []);

  return <></>;
}

/** Close the overlay if the user navigates away from the call. */
export function NavigateAwayListener() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window == 'undefined' || !window.IS_ELECTRON) return
    if (/\/app\/server\/.+/.test(pathname)) return

    window.app.overlay.setEnabled(false);
  }, [pathname]);

  return <></>
}
