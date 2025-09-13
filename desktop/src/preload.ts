// noinspection JSUnusedGlobalSymbols These are used by a separate package

import { contextBridge } from "electron";
import { ipcRenderer } from "electron/renderer";

try {
  contextBridge.exposeInMainWorld("IS_ELECTRON", true);
  contextBridge.exposeInMainWorld("app", {
    keybinds: {
      set(id: string, keybind: object) {
        ipcRenderer.send("app.keybinds.set", id, keybind);
      },

      on(id: string, listener: (pressed: boolean) => void) {
        ipcRenderer.on("app.keybinds.on." + id, (_, pressed) =>
          listener(pressed),
        );
      },
    },

    overlay: {
      setEnabled(isEnabled: any) {
        ipcRenderer.send("app.overlay.setEnabled", isEnabled);
      },
      updateState(newState: any) {
        ipcRenderer.send("app.overlay.updateState", newState);
      },
      onStateUpdate(callback: (newState: any) => void) {
        const internalListener = (_: any, newState: any) => callback(newState)
        ipcRenderer.on("app.overlay.on.updateState", internalListener);
        return { remove: () => ipcRenderer.off("app.overlay.on.updateState", internalListener) }
      }
    },

    openDevTools() {
      ipcRenderer.send("app.openDevTools");
    },
    getUserUuidAsync() {
      return ipcRenderer.invoke("app.getUserUuid");
    },
    getAppVersionAsync() {
      return ipcRenderer.invoke("app.getAppVersion");
    },
  });
} catch {}
