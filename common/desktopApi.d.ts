import type { Keybind, KeybindIds } from "./keybinds";

export type OverlayUser = {
  uuid: string;
  userName: string;
  avatarUrl: string;
  isSpeaking: boolean;
};

export type OverlayState = {
  users: OverlayUser[];
  positionId: OverlayPositionId;
  guestCount: number;
};

export type OverlayPositionId = `${'t' | 'c' | 'b'}${'l' | 'r'}`;

declare global {
  interface Window {
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

      /** Overlay API */
      overlay: {
        setEnabled(enabled: boolean): void;
        updateState(newState: Partial<OverlayState>): void;
        onStateUpdate(callback: (newState: Partial<OverlayState>) => void): { remove: () => void; };
      };

      /** Gets the user's network UUID (their hashed IP address) */
      getUserUuidAsync(): Promise<string>;

      /** The version of the electron backend running */
      getAppVersionAsync(): Promise<string>;
    };
  }
}
