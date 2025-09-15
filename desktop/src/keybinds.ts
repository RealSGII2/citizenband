import { type BrowserWindow, ipcMain } from "electron";
import { clearInterval } from "node:timers";
import { GlobalKeyboardListener } from "node-global-key-listener";
import HID from "node-hid";
import XInput from "xinput-ffi";
import type { Keybind } from "common/keybinds";

const keylistener = new GlobalKeyboardListener();
const keybindState = {
  hooked: false,
  lastState: false,
  isDown: {
    character: false,
    ctrl: false,
    shift: false,
    alt: false,
  },
  keybind: {
    type: "keyboard",
    key: {
      character: "P",
      ctrl: false,
      alt: false,
      shift: false,
    },
  } as Keybind,
  xInputInterval: null as NodeJS.Timeout | null,
  wheelDevice: null as HID.HID | null,
};

export default function hookKeybinds(window: BrowserWindow) {
  if (!keybindState.hooked) {
    function onWheelData(data: Buffer) {
      if (keybindState.keybind.type != "moza/tsw") return;
      const pressed = data.readInt8(keybindState.keybind.booleanBitOffset) == 1;
      if (pressed != keybindState.lastState) {
        keybindState.lastState = pressed;
        window.webContents.send("app.keybinds.on.ptt", pressed);
      }
    }

    ipcMain.on(
      "app.keybinds.set",
      (_, id: "ptt" | string, keyData: typeof keybindState.keybind) => {
        if (id == "ptt") {
          keybindState.keybind = keyData;

          keybindState.wheelDevice?.removeAllListeners();

          if (keybindState.xInputInterval) {
            clearInterval(keybindState.xInputInterval);
            keybindState.xInputInterval = null;
          }

          if (keyData.type == "gamepad") {
            keybindState.xInputInterval = setInterval(async () => {
              const state = await XInput.getState(0);
              const pressed = (state.gamepad.wButtons as string[]).includes(
                keyData.key,
              );
              if (pressed != keybindState.lastState) {
                keybindState.lastState = pressed;
                window.webContents.send("app.keybinds.on.ptt", pressed);
              }
            }, 5);
          }

          if (keyData.type == "moza/tsw") {
            keybindState.wheelDevice ??= new HID.HID(13422, 4);
            keybindState.wheelDevice.on("data", onWheelData);
          }
        }
      },
    );

    keylistener.addListener((event) => {
      if (keybindState.keybind.type != "keyboard") return;

      if (event.name == "LEFT CTRL" || event.name == "RIGHT CTRL")
        keybindState.isDown.ctrl = event.state == "DOWN";
      if (event.name == "LEFT ALT" || event.name == "RIGHT ALT")
        keybindState.isDown.alt = event.state == "DOWN";
      if (event.name == "LEFT SHIFT" || event.name == "RIGHT SHIFT")
        keybindState.isDown.shift = event.state == "DOWN";
      if (event.name == keybindState.keybind.key.character)
        keybindState.isDown.character = event.state == "DOWN";

      let isAllPressed = keybindState.isDown.character;

      if (isAllPressed)
        for (const [key, pressed] of Object.entries(keybindState.isDown).filter(x => x[0] != 'character'))
          if (
            !(isAllPressed = keybindState.keybind.key[key as "ctrl"] == pressed)
          )
            break;

      if (
        isAllPressed != keybindState.lastState
      ) {
        keybindState.lastState = isAllPressed;
        window.webContents.send("app.keybinds.on.ptt", isAllPressed);
      }
    });
  }

  keybindState.hooked = true;
}
