"use client";

import styles from "./overlay.module.scss";
import "./overlayGlobal.scss";
import { useEffect, useState } from "react";
import type { OverlayState } from "common/desktopApi";

export default function OverlayPage() {
  // const [users, setUsers] = useState<OverlayUser[]>([]);
  const [overlayState, setOverlayState] =
    useState<Partial<OverlayState> | null>(null);

  useEffect(() => {
    if (typeof window == "undefined" || !window.IS_ELECTRON) return;

    return window.app.overlay.onStateUpdate((newState) =>
      setOverlayState((oldState) => ({
        ...(oldState ?? {}),
        ...newState,
      })),
    ).remove;
  }, [overlayState]);

  return (
    <div
      className={`${styles.root} ${
        styles[
          {
            b: "bottom",
            c: "vCenter",
            t: "top",
          }[(overlayState?.positionId ?? 'bl')[0]] as string
        ]
      } ${
        styles[
          {
            l: "left",
            c: "hCenter",
            r: "right",
          }[(overlayState?.positionId ?? 'bl')[1]] as string
        ]
      }`}
    >
      {overlayState && (
        <>
          <div className={styles.container}>
            {overlayState.users?.map((user, i) => (
              <div
                className={`${styles.user} ${user.isSpeaking ? styles.speaking : ""}`.trim()}
                key={user.uuid + i}
              >
                <div
                  className={styles.avatar}
                  style={{ "--src": `url("${user.avatarUrl}")` }}
                />
                <span>{user.userName}</span>
              </div>
            ))}

            {!!overlayState.guestCount && overlayState.guestCount > 0 && (
              <div
                className={styles.user}
              >
                <div
                  className={styles.avatar}
                />
                <span>{overlayState.guestCount} guest{overlayState.guestCount == 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
