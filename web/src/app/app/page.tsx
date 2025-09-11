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
import * as DropdownMenu from "../../components/Menu/Dropdown";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { redirect } from "next/navigation";

import Sounds, { type SoundController } from "./sounds";
import useAudioDevice from "./appHooks/useAudioDevice";
import useKeybinds from "./appHooks/useKeybinds";
import useLocalStorage from "./appHooks/useLocalStorage";
import useRerender from "./appHooks/useRerender";
import useParticipants from "./appHooks/useParticipants";

import type { Keybind, KeybindIds } from "common/keybinds";
import "./main.scss";

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
  const { onRerender, rerender } = useRerender();
  const localData = useLocalStorage();

  const [selfPlayback, setSelfPlayback] = useState(
    localData.get("selfPlayback") ?? false,
  );

  const [username, setUsername] = useState("");
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
    }
  });
  const audioDevices = useAudioDevice(callObject);
  const keybind = useKeybinds()

  useEffect(() => {
    if (useVnlSkin) document.body.classList.add("vnlSkin");
    else document.body.classList.remove("vnlSkin");
  }, [useVnlSkin]);

  useEffect(() => {
    if (typeof window == "undefined" || !window.IS_ELECTRON)
      return redirect("/");

    navigator.getGamepads();

    window.addEventListener("keydown", (event) => {
      if (
        (event.ctrlKey && event.shiftKey && event.code == "KeyA") ||
        event.code == "F12"
      ) {
        window.app.openDevTools();
      }
    });

    (async () => {
      if (window.APP_INIT) return;
      window.APP_INIT = true;

      await callObject.setUserData({
        uuid: await window.app.getUserUuidAsync(),
      });

      await callObject.updateInputSettings({
        audio: { processor: { type: "noise-cancellation" } },
      });

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
        <>
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
                <button onClick={() => keybind.changeKeybind()}>Change</button>
              </>
            )}
            {keybind.isChangingKeybind && (
              <>
                Press a new keybind to replace <code>{keybind.toString()}</code>.
              </>
            )}
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

                  <DropdownMenu.SubContent sideOffset={8} collisionPadding={16}>
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

                  <DropdownMenu.SubContent sideOffset={8} collisionPadding={16}>
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
                window.callObj.leave();
                setJoined(false);
                sounds.current!.leave();
                setUsername("");
              }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}

      {!joined && (
        <div className="mainLayout">
          <h1>Join the Convoy CB Radio</h1>

          <form
            className="heroInputForm"
            onSubmit={(e) => {
              e.preventDefault();

              window.callObj.setUserName(username);

              window.callObj.join({
                url: "https://scs-radio.daily.co/scs-radio",
                startAudioOff: true,
              });

              setJoined(true);

              sounds.current!.join();
            }}
          >
            <input
              type="text"
              placeholder="Username"
              value={username}
              onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
            />
            <button
              type={"submit"}
              disabled={username.length < 2 || username.length > 24}
            >
              Join
            </button>
          </form>
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
