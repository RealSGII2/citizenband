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
import { redirect, useParams } from "next/navigation";

import Sounds, { type SoundController } from "./sounds";
import useLocalStorage from "@/hooks/useLocalStorage";
import useAudioDevice from "./appHooks/useAudioDevice";
import useKeybinds from "./appHooks/useKeybinds";
import useRerender from "./appHooks/useRerender";
import useParticipants from "./appHooks/useParticipants";

import type { Keybind, KeybindIds } from "common/keybinds";
import "./main.scss";
import type { FullServerData } from "@/app/app/server/[serverId]/appHooks/types";

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
  const userObject = localData.get("user");
  const [serverObject, setServerObject] = useState<FullServerData | null>(null);

  const [selfPlayback, setSelfPlayback] = useState(
    localData.get("selfPlayback") ?? false,
  );

  const [panelOpen, setPanelOpen] = useState(false);
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
  const audioDevices = useAudioDevice(callObject);
  const keybind = useKeybinds();

  useEffect(() => {
    if (useVnlSkin) document.body.classList.add("vnlSkin");
    else document.body.classList.remove("vnlSkin");
  }, [useVnlSkin]);

  useEffect(() => {
    if (typeof window == "undefined" || !window.IS_ELECTRON)
      return redirect("/");

    navigator.getGamepads();

    (async () => {
      if (window.APP_INIT) return;
      window.APP_INIT = true;

      const serverReq = await fetch("/api/servers/" + serverId + "?full=true");
      if (!serverReq.ok) throw new Error("error occured fetching server");
      setServerObject(await serverReq.json());

      await callObject.setUserData({
        uuid: await window.app.getUserUuidAsync(),
        avatarUrl: userObject?.avatar,
      });

      await callObject
        .updateInputSettings({
          audio: { processor: { type: "noise-cancellation" } },
        })
        .catch(() => {});

      callObject.setUserName(userObject?.username ?? "");

      callObject.join({
        url: "https://scs-radio.daily.co/" + serverId,
        startAudioOff: true,
      });

      setJoined(true);

      sounds.current!.join();

      callObject.on("error", (e) => console.log(e));
      callObject.on("nonfatal-error", (e) => console.log(e));
      callObject.on("dialin-error", (e) => console.log(e));
      callObject.on("dialout-error", (e) => console.log(e));

      window.app.keybinds.on("ptt", (pressed) => {
        console.log("localPressed", pressed);

        callObject.setLocalAudio(pressed);
        rerender();
      });
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
  }, []);

  return (
    <TooltipProvider>
      <Sounds ref={sounds} />

      {joined && (
        <div className="splitCallLayout">
          <div className="primaryPane">
            <div className="mainLayout">
              <div className="participants">
                {participants.map((participant) => {
                  const wetTrack = participant.stream.wet;
                  const hasAudio =
                    participant.isSpeaking &&
                    wetTrack &&
                    (!participant.isMe || selfPlayback);

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
                            {participant.username} {participant.isMe && "(Me)"}
                          </DropdownMenu.Label>

                          {participant.isMe && (
                            <>
                              <DropdownMenu.CheckboxItem
                                checked={selfPlayback}
                                onCheckedChange={(newValue: boolean) => {
                                  setSelfPlayback(newValue);
                                  localData.set("selfPlayback", newValue);
                                }}
                              >
                                Self playback
                              </DropdownMenu.CheckboxItem>
                            </>
                          )}

                          {(!participant.isMe || selfPlayback) && (
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

            <p
              className={`broadcastHint ${keybind.isChangingKeybind ? "editing" : ""}`.trim()}
            >
              {!keybind.isChangingKeybind && (
                <>
                  Press and hold <code>{keybind.toString()}</code> to broadcast.{" "}
                  <button onClick={() => keybind.changeKeybind()}>
                    Change
                  </button>
                </>
              )}
              {keybind.isChangingKeybind && (
                <>
                  Press a new keybind to replace{" "}
                  <code>{keybind.toString()}</code>.
                </>
              )}
            </p>

            <div className="actions">
              <button onClick={() => setPanelOpen((x) => !x)}>
                {panelOpen ? "Close" : "Open"} <span className='desktopOnly'>details</span>
              </button>

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

                  <DropdownMenu.SubRoot>
                    <DropdownMenu.SubTrigger asChild>
                      <DropdownMenu.Item>
                        Select microphone <DropdownMenu.SubMenuChevron />
                      </DropdownMenu.Item>
                    </DropdownMenu.SubTrigger>

                    <DropdownMenu.SubContent
                      sideOffset={8}
                      collisionPadding={16}
                    >
                      <DropdownMenu.Label>Select microphone</DropdownMenu.Label>
                      <DropdownMenu.RadioGroup
                        value={audioDevices.currentDevice?.deviceId}
                        onValueChange={(newId: string) =>
                          audioDevices.setCurrentDeviceIdAsync(newId)
                        }
                      >
                        {audioDevices.devices.map((device) => (
                          <DropdownMenu.RadioItem
                            value={device.deviceId}
                            key={device.deviceId}
                          >
                            {device.label}
                          </DropdownMenu.RadioItem>
                        ))}
                      </DropdownMenu.RadioGroup>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.SubRoot>

                  <DropdownMenu.CheckboxItem
                    checked={selfPlayback}
                    onCheckedChange={(newValue: boolean) => {
                      setSelfPlayback(newValue);
                      localData.set("selfPlayback", newValue);
                    }}
                  >
                    Self playback
                  </DropdownMenu.CheckboxItem>

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

                  <DropdownMenu.Item onClick={() => window.app.openDevTools()}>
                    Open console
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>

              <button
                className="disconnect"
                onClick={() => {
                  window.APP_INIT = false;
                  window.callObj.leave();
                  redirect("/app");
                  // setJoined(false);
                  // sounds.current!.leave();
                  // setUsername("");
                }}
              >
                Disconnect
              </button>
            </div>
          </div>

          {panelOpen && (
            <div className="sidePaneWrapper">
              <div className="sidePane">
                {!serverObject && <p>Loading server data...</p>}
                {serverObject && (
                  <>
                    <h1>{serverObject.name}</h1>
                    <p>{serverObject.description}</p>

                    <h2>Server ID</h2>
                    <p style={{ userSelect: "all" }}>
                      {serverObject.discoveryId}
                    </p>

                    <h2>Server password</h2>
                    <p style={{ userSelect: "all" }}>
                      {serverObject.password ?? "(None)"}
                    </p>

                    <h2>Required mods</h2>
                    {serverObject.requiredMods.map((x) => (
                      <a className="mod" rel='noreferrer' target='_blank' href={x.href} key={x.href}>
                        <h3>{x.name}</h3>
                        <p className="action">
                          {x.href}
                        </p>
                      </a>
                    ))}

                    <h2>Mod order</h2>
                    <p>
                      Select "Activate session mods" in the server list in-game
                      to automatically sort your mods.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!joined && <div className="loaderLayout">
        <div className="page loader">
          <div />
          <div />
          <div />
        </div>

        <p>Joining the call</p>
      </div>}
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
