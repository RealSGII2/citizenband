"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import mainStyles from "../../page.module.scss";

export default function JoinServerPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    window.location.href = "citizenband://join?serverId=" + serverId;
    setTimeout(() => setTimedOut(true), 5000);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        textAlign: "center",
      }}
    >
      {!timedOut && (
          <p>
            <b>Citizen Band</b><br/>
            Joining <code>{serverId}</code>...
          </p>
      )}
      {timedOut && (
        <>
          <p>
            <b>Signal to join sent.</b>
            <br />
            Didn&apos;t work? Make sure you have the app installed.
          </p>
          <a
            className={mainStyles.downloadButton}
            target="_blank"
            rel="noreferrer"
            href="https://github.com/RealSGII2/citizenband/releases/latest/download/CitizenBand-Setup.exe"
          >
            Download
          </a>
        </>
      )}
    </div>
  );
}
