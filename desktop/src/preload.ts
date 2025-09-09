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
