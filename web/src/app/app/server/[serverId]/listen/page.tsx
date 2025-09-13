"use client";

/* eslint-disable */
import {
  type AudioHTMLAttributes,
  type DetailedHTMLProps,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Daily, { type DailyCall } from "@daily-co/daily-js";
import * as DropdownMenu from "@/components/Menu/Dropdown";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useParams } from "next/navigation";

import Sounds, { type SoundController } from "../sounds";
import useLocalStorage from "@/hooks/useLocalStorage";
import useRerender from "../appHooks/useRerender";
import useParticipants from "../appHooks/useParticipants";

import type { Keybind, KeybindIds } from "common/keybinds";
import "../main.scss";
import type { FullServerData } from "@/app/app/server/[serverId]/appHooks/types";
import Link from "next/link";

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
  const { serverId } = useParams<{
    serverId: string;
  }>();

  const { onRerender, rerender } = useRerender();
  const localData = useLocalStorage();
  // const userObject = localData.get("user");
  const [serverObject, setServerObject] = useState<FullServerData | null>(null);

  const [joined, setJoined] = useState(false);

  const [useVnlSkin, setUseVnlSkin] = useState(
    localData.get("useVnlSkin") ?? false,
  );

  const [rogerBeepEnabled, setRogerBeepEnabled] = useState(
    localData.get("rogerBeepEnabled") ?? true,
  );

  const sounds = useRef<SoundController | null>(null);

  const callObject = useMemo(() => {
    if (typeof window == "undefined") return null as unknown as DailyCall;
    if (window.callObj) return window.callObj;

    const obj = Daily.createCallObject({
      videoSource: false,
      audioSource: true,
    });
    window.callObj = obj;

    return obj;
  }, []);

  const participants = useParticipants({
    callObject,
    rerender,
    onRerender,
    onSpeakerCountUpdate(oldCount, newCount) {
      if (sounds.current) {
        if (newCount > oldCount) {
          sounds.current.doStart();
        } else if (newCount < oldCount) {
          sounds.current.doStop(rogerBeepEnabled);
        }

        sounds.current.setLoop(newCount > 0);
      }
    },
  });

  useEffect(() => {
    if (useVnlSkin) document.body.classList.add("vnlSkin");
    else document.body.classList.remove("vnlSkin");
  }, [useVnlSkin]);

  useEffect(() => {
    (async () => {
      if (window.APP_INIT) return;
      window.APP_INIT = true;

      const serverReq = await fetch("/api/servers/" + serverId + "?full=true");
      if (!serverReq.ok) throw new Error("error occured fetching server");
      // setServerObject(await serverReq.json());

      const { slug } = await serverReq.json()

      await callObject.setUserData({
        isListener: true,
      });

      callObject.setUserName(`listener:${Date.now()}`);

      callObject.join({
        url: "https://scs-radio.daily.co/" + slug,
        startAudioOff: true,
      });

      setJoined(true);

      callObject.on("error", (e) => console.log(e));
      callObject.on("nonfatal-error", (e) => console.log(e));
      callObject.on("dialin-error", (e) => console.log(e));
      callObject.on("dialout-error", (e) => console.log(e));
    })();

    const sizeListener = () => {
      if (
        document.documentElement.scrollHeight ==
          document.documentElement.clientHeight ||
        document.documentElement.scrollTop ==
          document.documentElement.scrollHeight -
            document.documentElement.offsetHeight
      ) {
        document.body.classList.remove("canScroll");
      } else document.body.classList.add("canScroll");
    };

    window.addEventListener("scroll", sizeListener);
    window.addEventListener("resize", sizeListener);

    window.addEventListener("click", () => {
      for (const audio of document.querySelectorAll(
        "audio[data-participant-audio]",
      ))
        (audio as HTMLAudioElement).play();
    });
  }, []);

  return (
    <TooltipProvider>
      <Sounds ref={sounds} />

      {joined && (
        <div className="splitCallLayout">
          <div className="primaryPane">
            <div className="mainLayout">
              <div className="participants">
                {!participants.map((x) => 1).length && (
                  <p style={{ textAlign: "center" }}>
                    <b>*Cricket noises*</b>
                    <br />
                    There's nobody here.
                  </p>
                )}

                {participants.map((participant) => {
                  const wetTrack = participant.stream.wet;
                  const hasAudio =
                    participant.isSpeaking &&
                    wetTrack

                  return (
                    <div
                      key={participant.sessionId}
                      className={`participant ${participant.isSpeaking ? "speaking" : ""}`.trim()}
                    >
                      <div
                        style={{ "--src": `url("${participant.avatarUrl}")` }}
                        className="avatar"
                      />
                      <p>{participant.username}</p>
                      {hasAudio && (
                        <Audio
                          data-participant-audio="data-participant-audio"
                          srcObject={wetTrack}
                          controls={false}
                          autoPlay={true}
                        />
                      )}
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger className="participantOptions">
                          Options
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          <DropdownMenu.Label>
                            {participant.username}
                          </DropdownMenu.Label>

                          {!participant.isMe && (
                            <>
                              {participant.isMe && (
                                <DropdownMenu.Label>
                                  Self playback options
                                </DropdownMenu.Label>
                              )}

                              <DropdownMenu.SliderItem
                                min={0}
                                max={300}
                                step={5}
                                value={[participant.settings.volume]}
                                onValueChange={([newVolume]: [number]) =>
                                  participant.updateVolume(newVolume)
                                }
                              >
                                Volume
                              </DropdownMenu.SliderItem>
                              <DropdownMenu.SliderItem
                                min={0}
                                max={100}
                                value={[
                                  participant.settings.postProcessingAmount,
                                ]}
                                onValueChange={([newAmount]: [number]) =>
                                  participant.updatePostProcessing(newAmount)
                                }
                              >
                                Radio effect
                              </DropdownMenu.SliderItem>
                            </>
                          )}
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="broadcastHint">
              You&apos;re listening to this call. Download the app to speak.
            </p>

            <div className="actions">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button>Settings</button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content>
                  <DropdownMenu.Label>Audio</DropdownMenu.Label>

                  <DropdownMenu.SubRoot>
                    <DropdownMenu.SubTrigger asChild>
                      <DropdownMenu.Item>
                        Defaults <DropdownMenu.SubMenuChevron />
                      </DropdownMenu.Item>
                    </DropdownMenu.SubTrigger>

                    <DropdownMenu.SubContent
                      sideOffset={8}
                      collisionPadding={16}
                    >
                      <DropdownMenu.Label>Defaults</DropdownMenu.Label>
                      <DropdownMenu.SliderItem
                        min={0}
                        max={300}
                        step={5}
                        value={[participants.defaults.volume]}
                        onValueChange={([newVolume]: [number]) =>
                          participants.defaults.updateVolume(newVolume)
                        }
                      >
                        Default volume
                      </DropdownMenu.SliderItem>
                      <DropdownMenu.SliderItem
                        min={0}
                        max={100}
                        value={[participants.defaults.postProcessingAmount]}
                        onValueChange={([newAmount]: [number]) =>
                          participants.defaults.updatePostProcessing(newAmount)
                        }
                      >
                        Default radio effect
                      </DropdownMenu.SliderItem>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.SubRoot>

                  <DropdownMenu.CheckboxItem
                    checked={rogerBeepEnabled}
                    onCheckedChange={(value: boolean) => {
                      setRogerBeepEnabled(value);
                      localData.set("rogerBeepEnabled", value);
                    }}
                  >
                    Play roger beep
                  </DropdownMenu.CheckboxItem>

                  <DropdownMenu.Label>Misc</DropdownMenu.Label>

                  <DropdownMenu.CheckboxItem
                    checked={useVnlSkin}
                    onCheckedChange={(value: boolean) => {
                      setUseVnlSkin(value);
                      localData.set("useVnlSkin", value);
                    }}
                  >
                    Use VNL background
                  </DropdownMenu.CheckboxItem>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
              <Link href="/">
                <button className="primary">Download app</button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!joined && (
        <div className="loaderLayout">
          <div className="page loader">
            <div />
            <div />
            <div />
          </div>

          <p>Joining the call</p>
        </div>
      )}
    </TooltipProvider>
  );
}

function Audio({
  srcObject,
  ...props
}: { srcObject: MediaStream } & DetailedHTMLProps<
  AudioHTMLAttributes<HTMLAudioElement>,
  HTMLAudioElement
>) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = srcObject;
  }, [ref, srcObject]);

  return <audio ref={ref} {...props} />;
}

export default App;
