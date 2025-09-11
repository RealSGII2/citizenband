export type KeybindIds = "ptt";
export type KeyboardKeybind = {
  type: "keyboard";
  key: {
    character: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  };
};
export type XboxKey =
  `XINPUT_GAMEPAD_${"A" | "B" | "X" | "Y" | "DPAD_DOWN" | "DPAD_LEFT" | "DPAD_RIGHT" | "DPAD_UP" | "LEFT_SHOULDER" | "RIGHT_SHOULDER" | "LEFT_THUMB" | "RIGHT_THUMB" | "BACK" | "START"}`;
export type GamepadKeybind = {
  type: "gamepad";
  key: XboxKey;
};
export type MozaTSWKeybind = {
  type: "moza/tsw";
  booleanBitOffset: number;
};
export type Keybind = KeyboardKeybind | GamepadKeybind | MozaTSWKeybind;
