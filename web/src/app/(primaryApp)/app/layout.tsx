"use client";

import { type ReactNode, useEffect } from "react";
import { redirect } from "next/navigation";

export default function AppLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window == "undefined") return;
    if (!window.IS_ELECTRON && !location.href.endsWith('/listen')) redirect("/");
  }, []);

  return <>{children}</>;
}
