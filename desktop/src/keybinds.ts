import { type BrowserWindow, ipcMain } from "electron";
import { clearInterval } from "node:timers";
import { GlobalKeyboardListener } from 'node-global-key-listener'
import HID from 'node-hid'
import XInput from 'xinput-ffi'

const keylistener = new GlobalKeyboardListener();
const keybindState = {
  hooked: false,
  lastState: false,
  isDown: {
    ctrl: false,
    shift: false,
    alt: false,
  },
  keybind: {
    character: "P",
    ctrl: false,
    alt: false,
    shift: false,
  },
  xInputInterval: null as NodeJS.Timeout | null,
};

const xboxMap: Record<number, string> = {
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

export default function hookKeybinds(window: BrowserWindow) {
  if (!keybindState.hooked) {
    const devices = HID.devices();
    console.log(devices);

    ipcMain.on(
      "app.keybinds.set",
      (_, id: "ptt" | string, keyData: typeof keybindState.keybind) => {
        if (id == "ptt") {
          keybindState.keybind = keyData;

          if (keybindState.xInputInterval) {
            clearInterval(keybindState.xInputInterval);
            keybindState.xInputInterval = null;
          }

          if (keyData.character.startsWith("xbox:")) {
            keybindState.xInputInterval = setInterval(async () => {
              const state = await XInput.getState(0);
              const pressed = (state.gamepad.wButtons as string[]).includes(
                xboxMap[+keyData.character.substring(5)],
              );
              if (pressed != keybindState.lastState) {
                keybindState.lastState = pressed;
                window.webContents.send("app.keybinds.on.ptt", pressed);
              }
            }, 5);
          }

          if (
            keyData.ctrl &&
            keyData.alt &&
            keyData.shift &&
            keyData.character == "P"
          ) {
            const device = new HID.HID(13422, 4);
            device.on("data", (data: Buffer) => {
              const pressed = data.readInt8(20) == 1;
              if (pressed != keybindState.lastState) {
                keybindState.lastState = pressed;
                window.webContents.send("app.keybinds.on.ptt", pressed);
              }
            });
          }
        }
      },
    );

    keylistener.addListener((event) => {
      if (event.name == "LEFT CTRL" || event.name == "RIGHT CTRL")
        keybindState.isDown.ctrl = event.state == "DOWN";
      if (event.name == "LEFT ALT" || event.name == "RIGHT ALT")
        keybindState.isDown.alt = event.state == "DOWN";
      if (event.name == "LEFT SHIFT" || event.name == "RIGHT SHIFT")
        keybindState.isDown.shift = event.state == "DOWN";

      let sameMetaKeys = true;

      for (const [key, pressed] of Object.entries(keybindState.isDown))
        if (!(sameMetaKeys = keybindState.keybind[key as 'ctrl'] == pressed)) break;

      if (
        event.name == keybindState.keybind.character &&
        (event.state == "DOWN") != keybindState.lastState &&
        sameMetaKeys
      ) {
        const pressed = event.state == "DOWN";
        keybindState.lastState = pressed;
        window.webContents.send("app.keybinds.on.ptt", pressed);
      }
    });
  }

  keybindState.hooked = true;
}
