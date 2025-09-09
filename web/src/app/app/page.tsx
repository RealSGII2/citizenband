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
import Daily, {
  type DailyCall,
  DailyParticipant,
} from "@daily-co/daily-js";
import Sounds, { type SoundController } from "./sounds";
import addPostProcessing from "./effects";
import * as DropdownMenu from "../../components/Menu/Dropdown";
import useAudioDevice from "./appHooks/useAudioDevice";
import './main.scss'
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { redirect } from "next/navigation";

type KeybindIds = "ptt";

type KeyboardKeybind = {
  type: "keyboard";
  key: {
    character: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  };
};

type GamepadKeybind = {
  type: "gamepad";
  key: `XINPUT_GAMEPAD_${"A" | "B" | "X" | "Y" | "DPAD_DOWN" | "DPAD_LEFT" | "DPAD_RIGHT" | "DPAD_UP" | "LEFT_SHOULDER" | "RIGHT_SHOULDER" | "LEFT_THUMB" | "RIGHT_THUMB" | "BACK" | "START"}`;
};

type MozaTSWKeybind = {
  type: "moza/tsw";
  booleanBitOffset: number;
};

type Keybind = KeyboardKeybind | GamepadKeybind | MozaTSWKeybind;

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

type FilledDailyParticipant = Exclude<DailyParticipant, "userData"> & {
  userData: {
    uuid: string;
  };
};

type FilledDailyParticipantObject = {
  local: FilledDailyParticipant;
  [key: string]: FilledDailyParticipant;
}

const xboxMap: Record<number, string> = {
  [0]: "Xbox A",
  [1]: "Xbox B",
  [2]: "Xbox X",
  [3]: "Xbox Y",
  [4]: "Left Bumper",
  [5]: "Right Bumper",
  [6]: "Left Trigger",
  [7]: "Right Trigger",
  [8]: "Back",
  [9]: "Start",
  [12]: "D-Pad Up",
  [13]: "D-Pad Down",
  [14]: "D-Pad Left",
  [15]: "D-Pad Right",
};

function removeAllTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) stream.removeTrack(track);
}

function getLocal(key: string) {
  if (typeof localStorage == 'undefined') return null
  return localStorage.getItem(key)
}

function setLocal(key: string, value: string) {
  if (typeof localStorage == 'undefined') return
  localStorage.setItem(key, value)
}

function App(): ReactNode {
  const [participants, setParticipants] = useState<FilledDailyParticipantObject>(
    {} as FilledDailyParticipantObject,
  );
  const [participantStreams, setParticipantStreams] = useState<
    Record<
      string,
      {
        dry: MediaStream;
        wet: MediaStream;
        adjustPostProcessing(amount: number): void;
        adjustVolume(amount: number): void;
      }
    >
  >({});

  const [selfPlayback, setSelfPlayback] = useState(
    getLocal("selfPlayback") == "true",
  );

  const [participantSettings, setParticipantSettings] = useState<
    Record<
      string,
      {
        volume: number;
        postProcessingAmount: number;
      }
    >
  >(JSON.parse(getLocal("participantSettings") ?? "{}"));

  const [defaultSettings, setDefaultSettings] = useState(
    JSON.parse(
      getLocal("defaultSettings") ??
        `{
          "volume": 100,
          "postProcessingAmount": 100
        }`,
    ),
  );

  const [rerenderHook, rerender] = useState(0);
  const [lastSpeakerCount, setLastSpeakerCount] = useState(0);

  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);

  const [useVnlSkin, setUseVnlSkin] = useState(
    (getLocal("useVnlSkin") ?? "false") == "true",
  );

  const rawLocalKeybind = getLocal("keybind");
  const [changingKeybind, setChangingKeybind] = useState(false);
  const [keybind, setKeybind] = useState(
    rawLocalKeybind
      ? JSON.parse(rawLocalKeybind)
      : {
          character: "P",
          ctrl: false,
          alt: false,
          shift: false,
        },
  );

  const keybindString = useMemo(() => {
    if (
      keybind.ctrl &&
      keybind.alt &&
      keybind.shift &&
      keybind.character == "P"
    )
      return "Wheel Set-";

    if (keybind.character.startsWith("xbox:"))
      return xboxMap[+keybind.character.substring(5)];

    // noinspection SuspiciousTypeOfGuard
    return [
      keybind.ctrl && "Ctrl",
      keybind.alt && "Alt",
      keybind.shift && "Shift",
      keybind.character.toUpperCase(),
    ]
      .filter((x) => typeof x == "string")
      .join("-");
  }, [keybind]);

  const [rogerBeepEnabled, setRogerBeepEnabled] = useState(
    (getLocal("rogerBeepEnabled") ?? "true") == "true",
  );

  const sounds = useRef<SoundController | null>(null);

  const callObject = useMemo(() => {
    if (typeof window == 'undefined') return null as unknown as DailyCall;
    if (window.callObj) return window.callObj;

    const obj = Daily.createCallObject({
      videoSource: false,
      audioSource: true,
    });
    window.callObj = obj;

    return obj;
  }, []);

  const audioDevices = useAudioDevice(callObject);

  useEffect(() => {
    if (useVnlSkin) document.body.classList.add("vnlSkin");
    else document.body.classList.remove("vnlSkin");
  }, [useVnlSkin]);

  ////////////////////////////////////////////////////////////////////////////////
  //// Participant stream, wet & dry signal handler
  useEffect(() => {
    const listeners: Record<string, () => void> = {};

    function updateParticipants(): void {
      const localParticipants = callObject.participants() as FilledDailyParticipantObject
      setParticipants(localParticipants);

      for (const participant of Object.values(localParticipants)) {
        const streams = participantStreams[participant.user_id] ?? {
          dry: new MediaStream(),
          wet: new MediaStream(),
        };

        // @ts-ignore
        const settings =
          participantSettings[participant.userData.uuid] || defaultSettings;

        const firstDryTrack = streams.dry.getTracks()[0];
        const persistentTrack = participant.tracks.audio.persistentTrack;
        if (!firstDryTrack || firstDryTrack.id !== persistentTrack?.id) {
          removeAllTracks(streams.dry);
          if (persistentTrack) streams.dry.addTrack(persistentTrack);
        }

        if (!streams.wet.getTracks().length && persistentTrack) {
          console.log(
            `MEMORY WATCHDOG: Setting up PostProcessing for "${participant.user_name}" (id:${participant.user_id})`,
          );
          removeAllTracks(streams.wet);
          const postProcessor = addPostProcessing(
            streams.dry,
            settings.volume / 100,
            settings.postProcessingAmount / 100,
          );
          streams.wet.addTrack(postProcessor.track);
          streams.adjustPostProcessing = postProcessor.adjustPostProcessing;
          streams.adjustVolume = postProcessor.adjustVolume;
        } else if (streams.wet.getTracks().length) {
          streams.adjustPostProcessing(settings.postProcessingAmount / 100);
          streams.adjustVolume(settings.volume / 100);
        }

        participantStreams[participant.user_id] = streams;
      }

      setParticipantStreams(participantStreams);
      rerender((x) => x + 1);
    }

    for (const event of [
      "participant-joined",
      "participant-updated",
      "participant-left",
      "joined-meeting",
    ]) {
      listeners[event] = updateParticipants;
      callObject.on(event as "participant-joined", updateParticipants);
    }

    return () => {
      for (const event in listeners)
        callObject.off(event as "participant-joined", updateParticipants);
    };
  }, [callObject, participantStreams, participantSettings]);

  useEffect(() => {
    if (typeof window == 'undefined' || !window.IS_ELECTRON) return redirect('/');

    navigator.getGamepads();

    window.addEventListener("keydown", (event) => {
      if (
        (event.ctrlKey && event.shiftKey && event.code == "KeyA") ||
        event.code == "F12"
      ) {
        // window.api.openDevTools()
        window.app.openDevTools();
      }
    });

    window.app.keybinds.set("ptt", keybind);
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
        callObject.setLocalAudio(pressed);
        rerender((x) => x + 1);
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

  useEffect(() => {
    const speakers = Object.values(participants).filter(
      (x) => x.tracks.audio.state == "playable",
    );
    const isSpeaking = speakers.length !== 0;

    if (sounds.current) {
      if (speakers.length > lastSpeakerCount) {
        sounds.current.doStart();
      } else if (speakers.length < lastSpeakerCount) {
        sounds.current.doStop(rogerBeepEnabled);
      }

      sounds.current.setLoop(isSpeaking);
    }

    setLastSpeakerCount(speakers.length);
  }, [participants, rerenderHook]);

  useEffect(() => {
    if (!changingKeybind) return;

    function setNewKeybind(newKeybind: typeof keybind): void {
      setKeybind(newKeybind);
      window.app.keybinds.set("ptt", newKeybind);
      setLocal("keybind", JSON.stringify(newKeybind));

      setChangingKeybind(false);
    }

    function doGamepad(): void {
      if (!changingKeybind) return;
      console.log(navigator.getGamepads());

      const gamepad = navigator
        .getGamepads()
        .filter((x) => x && !!x.vibrationActuator)[0];
      if (gamepad) {
        for (const id in gamepad.buttons) {
          if (gamepad.buttons[id].pressed && xboxMap[id]) {
            setNewKeybind({
              ctrl: false,
              alt: false,
              shift: false,
              character: "xbox:" + id,
            });

            return;
          }
        }

        requestAnimationFrame(doGamepad);
      }
    }

    requestAnimationFrame(doGamepad);

    const listener = (event: KeyboardEvent) => {
      if (event.code.startsWith("Key")) {
        setNewKeybind({
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          character: event.code.substring(3),
        });
      }
    };

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [changingKeybind]);

  return (
    <TooltipProvider>
      <Sounds ref={sounds} />

      {joined && (
        <>
          <div className="mainLayout">
            <div className="participants">
              {Object.values(participants).map((participant) => {
                if (!participant.userData) return <></>;

                const wetTrack = participantStreams[participant.user_id]?.wet;
                const hasAudio =
                  participant.tracks.audio.state == "playable" &&
                  wetTrack &&
                  (!participant.local || selfPlayback);

                // @ts-ignore
                const settings =
                  participantSettings[participant.userData.uuid] ??
                  defaultSettings;

                return (
                  <div
                    key={participant.user_id}
                    className={`participant ${participant.tracks.audio.state == "playable" ? "speaking" : ""}`.trim()}
                  >
                    <p>{participant.user_name}</p>
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
                          {participant.user_name} {participant.local && "(Me)"}
                        </DropdownMenu.Label>

                        {participant.local && (
                          <>
                            <DropdownMenu.CheckboxItem
                              checked={selfPlayback}
                              onCheckedChange={(newValue: boolean) => {
                                setSelfPlayback(newValue);
                                setLocal(
                                  "selfPlayback",
                                  newValue ? "true" : "false",
                                );
                              }}
                            >
                              Self playback
                            </DropdownMenu.CheckboxItem>
                          </>
                        )}

                        {(!participant.local || selfPlayback) && (
                          <>
                            {participant.local && (
                              <DropdownMenu.Label>
                                Self playback options
                              </DropdownMenu.Label>
                            )}

                            <DropdownMenu.SliderItem
                              min={0}
                              max={300}
                              step={5}
                              value={[settings.volume]}
                              onValueChange={(newValue: [number]) => {
                                settings.volume = newValue[0];

                                const newSettings =
                                  structuredClone(participantSettings);
                                // @ts-ignore
                                newSettings[participant.userData.uuid] =
                                  settings;

                                setParticipantSettings(newSettings);
                                setLocal(
                                  "participantSettings",
                                  JSON.stringify(newSettings),
                                );
                              }}
                            >
                              Volume
                            </DropdownMenu.SliderItem>
                            <DropdownMenu.SliderItem
                              min={0}
                              max={100}
                              value={[settings.postProcessingAmount]}
                              onValueChange={([newValue]: [number]) => {
                                settings.postProcessingAmount = newValue;

                                const newSettings =
                                  structuredClone(participantSettings);
                                // @ts-ignore
                                newSettings[participant.userData.uuid] =
                                  settings;

                                setParticipantSettings(newSettings);
                                setLocal(
                                  "participantSettings",
                                  JSON.stringify(newSettings),
                                );
                              }}
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
            className={`broadcastHint ${changingKeybind ? "editing" : ""}`.trim()}
          >
            {!changingKeybind && (
              <>
                Press and hold <code>{keybindString}</code> to broadcast.{" "}
                <button onClick={() => setChangingKeybind(true)}>Change</button>
              </>
            )}
            {changingKeybind && (
              <>
                Press a new keybind to replace <code>{keybindString}</code>.
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
                      value={[defaultSettings.volume]}
                      onValueChange={([newValue]: [number]) => {
                        const newSettings = structuredClone(defaultSettings);
                        newSettings.volume = newValue;
                        setDefaultSettings(newSettings);
                        setLocal(
                          "defaultSettings",
                          JSON.stringify(newSettings),
                        );
                      }}
                    >
                      Default volume
                    </DropdownMenu.SliderItem>
                    <DropdownMenu.SliderItem
                      min={0}
                      max={100}
                      value={[defaultSettings.postProcessingAmount]}
                      onValueChange={([newValue]: [number]) => {
                        const newSettings = structuredClone(defaultSettings);
                        newSettings.postProcessingAmount = newValue;
                        setDefaultSettings(newSettings);
                        setLocal(
                          "defaultSettings",
                          JSON.stringify(newSettings),
                        );
                      }}
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
                    setLocal(
                      "selfPlayback",
                      newValue ? "true" : "false",
                    );
                  }}
                >
                  Self playback
                </DropdownMenu.CheckboxItem>

                <DropdownMenu.CheckboxItem
                  checked={rogerBeepEnabled}
                  onCheckedChange={(value: boolean) => {
                    setRogerBeepEnabled(value);
                    setLocal(
                      "rogerBeepEnabled",
                      value ? "true" : "false",
                    );
                  }}
                >
                  Play roger beep
                </DropdownMenu.CheckboxItem>

                <DropdownMenu.Label>Misc</DropdownMenu.Label>

                <DropdownMenu.CheckboxItem
                  checked={useVnlSkin}
                  onCheckedChange={(value: boolean) => {
                    setUseVnlSkin(value);
                    setLocal(
                      "useVnlSkin",
                      value ? "true" : "false",
                    );
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
  // playing,
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
