import React from "react";
import { GlobalKeybindListener, NavigateAwayListener } from "./layoutClient";
import "./global.scss";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GlobalKeybindListener />
      <NavigateAwayListener />
      {children}
    </>
  );
}
