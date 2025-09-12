'use client';

import { useEffect } from "react";

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
