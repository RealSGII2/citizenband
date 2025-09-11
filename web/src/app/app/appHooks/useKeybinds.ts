import useLocalStorage from "@/app/app/appHooks/useLocalStorage";
import { useEffect, useMemo, useState } from "react";
import type { Keybind, XboxKey } from "common/keybinds";

type KeybindsHook = {
  keybind: Keybind,
  isChangingKeybind: boolean;
  changeKeybind: () => void;
  onKeybind: (callback: (pressed: boolean) => void) => void;
  toString: () => string;
};

declare global {
  interface Window {
    isChangingKeybind: boolean;
  }
}

const xboxLocalisationMap: Record<XboxKey, string> = {
  XINPUT_GAMEPAD_A: "Xbox A",
  XINPUT_GAMEPAD_B: "Xbox B",
  XINPUT_GAMEPAD_X: "Xbox X",
  XINPUT_GAMEPAD_Y: "Xbox Y",
  XINPUT_GAMEPAD_LEFT_SHOULDER: "Left Bumper",
  XINPUT_GAMEPAD_RIGHT_SHOULDER: "Right Bumper",
  XINPUT_GAMEPAD_LEFT_THUMB: "Left Trigger",
  XINPUT_GAMEPAD_RIGHT_THUMB: "Right Trigger",
  XINPUT_GAMEPAD_BACK: "Back",
  XINPUT_GAMEPAD_START: "Start",
  XINPUT_GAMEPAD_DPAD_UP: "D-Pad Up",
  XINPUT_GAMEPAD_DPAD_DOWN: "D-Pad Down",
  XINPUT_GAMEPAD_DPAD_LEFT: "D-Pad Left",
  XINPUT_GAMEPAD_DPAD_RIGHT: "D-Pad Right",
};

const xboxKeyIdMap: Record<number, XboxKey> = {
  [0]: "XINPUT_GAMEPAD_A",
  [1]: "XINPUT_GAMEPAD_B",
  [2]: "XINPUT_GAMEPAD_X",
  [3]: "XINPUT_GAMEPAD_Y",
  [4]: "XINPUT_GAMEPAD_LEFT_SHOULDER",
  [5]: "XINPUT_GAMEPAD_RIGHT_SHOULDER",
  [6]: "XINPUT_GAMEPAD_LEFT_THUMB",
  [7]: "XINPUT_GAMEPAD_RIGHT_THUMB",
  [8]: "XINPUT_GAMEPAD_BACK",
  [9]: "XINPUT_GAMEPAD_START",
  [12]: "XINPUT_GAMEPAD_DPAD_UP",
  [13]: "XINPUT_GAMEPAD_DPAD_DOWN",
  [14]: "XINPUT_GAMEPAD_DPAD_LEFT",
  [15]: "XINPUT_GAMEPAD_DPAD_RIGHT",
};

export default function useKeybinds(): KeybindsHook {
  const localData = useLocalStorage();

  const [isChangingKeybind, setChangingKeybind] = useState(false);
  const [keybind, setKeybind] = useState<Keybind>(
    localData.get("keybind") ?? {
      type: "keyboard",
      key: {
        ctrl: true,
        alt: false,
        shift: true,
        character: "P",
      },
    },
  );

  const keybindString = useMemo(() => {
    if (keybind.type == "keyboard")
      return [
        keybind.key.ctrl && "Ctrl",
        keybind.key.alt && "Alt",
        keybind.key.shift && "Shift",
        keybind.key.character.toUpperCase(),
      ]
        .filter((x) => typeof x == "string")
        .join("-");

    if (keybind.type == "gamepad") return xboxLocalisationMap[keybind.key];
    if (keybind.type == "moza/tsw") return "Button " + keybind.booleanBitOffset;

    return "Unknown Key";
  }, [keybind]);

  // getGamepads returns an empty array on its first call, so
  // we call it before we actually need it
  useEffect(() => {
    navigator.getGamepads();
  }, []);

  // Handle keybind changes
  useEffect(() => {
    window.app.keybinds.set("ptt", keybind);
    localData.set("keybind", keybind);
  }, [localData, keybind]);

  // Handle keybind change request
  useEffect(() => {
    window.isChangingKeybind = isChangingKeybind;
    if (!isChangingKeybind) return;

    function setNewKeybind(keybind: Keybind): void {
      setKeybind(keybind);
      setChangingKeybind(false);
    }

    function doGamepad(): void {
      if (!window.isChangingKeybind) return;

      const gamepad = navigator
        .getGamepads()
        .filter((x) => x && !!x.vibrationActuator)[0];
      if (gamepad) {
        for (const id in gamepad.buttons) {
          if (gamepad.buttons[id].pressed && xboxKeyIdMap[id]) {
            setNewKeybind({
              type: "gamepad",
              key: xboxKeyIdMap[id],
            });

            return;
          }
        }

        requestAnimationFrame(doGamepad);
      }
    }

    requestAnimationFrame(doGamepad);

    const listener = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.altKey &&
        event.shiftKey &&
        event.code == "KeyP"
      ) {
        setNewKeybind ({
          type: "moza/tsw",
          booleanBitOffset: 20,
        });
      } else if (event.code.startsWith("Key")) {
        setNewKeybind({
          type: "keyboard",
          key: {
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey,
            character: event.code.substring(3),
          },
        });
      }
    };

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [isChangingKeybind]);

  return {
    keybind,
    isChangingKeybind,
    changeKeybind: () => setChangingKeybind(true),
    onKeybind: (callback) => window.app.keybinds.on("ptt", callback),

    toString: () => keybindString,
  };
}
