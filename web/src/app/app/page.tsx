"use client";

/* eslint-disable */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { type DailyCall } from "@daily-co/daily-js";
import { TooltipProvider } from "@radix-ui/react-tooltip";

import useLocalStorage from "@/hooks/useLocalStorage";

import type { Keybind, KeybindIds } from "common/keybinds";
import type { UserObject } from "@/app/app/server/[serverId]/appHooks/types";
import { redirect } from "next/navigation";
import styles from "./page.module.scss";

declare global {
  interface Window {
    callObj: DailyCall;

    /** Whether this instance is running in Electron */
    IS_ELECTRON: boolean;

    /** Whether the main app code has initialised */
    APP_INIT: boolean;

    /** App API */
    app: {
      /* Open the console */
      openDevTools(): void;

      /** Shortcut API */
      keybinds: {
        set(id: KeybindIds, keybind: Keybind): void;
        on(id: KeybindIds, callback: (pressed: boolean) => void): void;
      };

      /** Gets the user's network UUID (their hashed IP address) */
      getUserUuidAsync(): Promise<string>;

      /** The version of the electron backend running */
      getAppVersionAsync(): Promise<string>;
    };
  }
}

function App(): ReactNode {
  const localData = useLocalStorage();
  const recentServers = localData.get("recentServers");
  const [userObject, setUserObject] = useState(localData.get("user"));
  const [changingUser, setChangingUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newAvatarURL, setNewAvatarURL] = useState("");

  const [joinServerId, setJoinServerId] = useState("");
  const [serverJoinError, setServerJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const newUsernameInvalid = useMemo(
    () =>
      newUsername.length < 2 ||
      newUsername.length > 24 ||
      /[^a-zA-Z0-9_ ]/.test(newUsername),
    [newUsername],
  );

  const [useVnlSkin, setUseVnlSkin] = useState(
    localData.get("useVnlSkin") ?? false,
  );

  useEffect(() => {
    if (useVnlSkin) document.body.classList.add("vnlSkin");
    else document.body.classList.remove("vnlSkin");
  }, [useVnlSkin]);

  async function joinServer(id: string) {
    setIsJoining(true);

    const serverDataReq = await fetch("/api/servers/" + id);
    if (!serverDataReq.ok) {
      setIsJoining(false);
      return setServerJoinError("That server ID is invalid or does not exist.");
    }

    const newRecentServers = [
      await serverDataReq.json(),
      ...(recentServers ?? []).filter((x) => x.slug !== id),
    ].slice(0, 3);
    localData.set("recentServers", newRecentServers);

    redirect('/app/server/' + id)
  }

  if (!userObject || changingUser) {
    return (
      <div className={styles.mainLayout}>
        <div className={styles.splitLayout}>
          <div>
            {!changingUser && (
              <>
                <h1 className={styles.heroAppTitle}>Citizen Band</h1>
                <p style={{ marginTop: -12, marginBottom: 12 }}>
                  Let&apos;s set up your profile.
                </p>
              </>
            )}

            {changingUser && (
              <h1 className={styles.heroAppTitle}>Change Profile</h1>
            )}

            <form
              className={styles.setupForm}
              onSubmit={(e) => {
                e.preventDefault();

                if (!newUsernameInvalid) {
                  const newUser: UserObject = {
                    username: newUsername,
                    avatar: newAvatarURL,
                  };

                  setUserObject(newUser);
                  localData.set("user", newUser);

                  setChangingUser(false);
                }
              }}
            >
              <div
                className={`${styles.inputField} ${newUsernameInvalid && newUsername.length > 1 ? styles.invalid : ""}`.trim()}
              >
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={newUsername}
                  onInput={(e) =>
                    setNewUsername((e.target as HTMLInputElement).value)
                  }
                />
                <p className={styles.hint}>
                  Letters, numbers, underscores, and spaces only. Must be between 2 and 24
                  characters.
                </p>
              </div>

              <div className={styles.inputField}>
                <label htmlFor="avatarUrl">Avatar URL</label>
                <input
                  type="text"
                  id="avatarUrl"
                  value={newAvatarURL}
                  onInput={(e) =>
                    setNewAvatarURL((e.target as HTMLInputElement).value)
                  }
                />
                <p className={styles.hint}>
                  Optional. Avoid using Discord image links as they expire after
                  a day. Using avatars from Steam or another similar application works better.
                </p>
              </div>

              <div className={styles.flex}>
                <button
                  className={styles.button}
                  type="submit"
                  disabled={newUsernameInvalid}
                >
                  Save
                </button>
              </div>
            </form>
          </div>

          <div>
            <div style={{ marginTop: changingUser ? 55 : 107 }}>
              <h2 className={styles.heroSectionTitle}>Profile preview</h2>
              <p className={styles.mutedText} style={{ marginBottom: 8 }}>
                This is how other people will see you.
              </p>

              <div className={styles.participantMock}>
                <div
                  style={{ "--src": `url("${newAvatarURL}")` }}
                  className={styles.avatar}
                />
                <p>{newUsername || "Username"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={styles.mainLayout}>
        <div>
          <h1 className={styles.heroAppTitle}>Citizen Band</h1>

          {recentServers && (
            <>
              <h2 className={styles.heroSectionTitle}>Recent servers</h2>
              <div className={styles.serverList}>
                {recentServers.map((server) => (
                  <button
                    onClick={() => joinServer(server.slug)}
                    key={server.slug}
                  >
                    <p>{server.name}</p>
                    <p>{server.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          <h2 className={styles.heroSectionTitle}>Join a new server</h2>
          <form
            className={`${styles.heroInputForm} ${serverJoinError ? styles.invalid : ""}`.trim()}
            onSubmit={(e) => {
              e.preventDefault();
              joinServer(joinServerId);
            }}
          >
            <input
              type="text"
              placeholder="Server ID"
              value={joinServerId}
              onInput={(e) =>
                setJoinServerId((e.target as HTMLInputElement).value)
              }
            />
            <button
              type="submit"
              disabled={joinServerId.length == 0 || isJoining}
            >
              {isJoining ? (
                <div className={styles.loader}>
                  <div />
                  <div />
                  <div />
                </div>
              ) : (
                "Join"
              )}
            </button>
          </form>

          {serverJoinError && (
            <p className={styles.serverJoinError}>{serverJoinError}</p>
          )}

          <div className={styles.divider}></div>

          <div className={styles.flex}>
            <button
              className={styles.userProfile}
              onClick={() => {
                setNewUsername(userObject.username);
                setNewAvatarURL(userObject.avatar);
                setChangingUser(true);
              }}
            >
              {/*<div className={styles.avatar}></div>*/}
              <div
                style={{ "--src": `url("${userObject.avatar}")` }}
                className={styles.avatar}
              />
              <span>{userObject.username}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                width="16"
                height="16"
              >
                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"></path>
              </svg>
            </button>

            <div className={styles.spacer}></div>

            <p className={styles.version}>v1.0.1</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
