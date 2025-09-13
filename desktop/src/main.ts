import os from 'node:os';
import { createHash } from 'node:crypto';
import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';
import hookKeybinds from './keybinds';
import packageJson from '../package.json';
import { autoUpdater } from 'electron-updater';
import path from "node:path";

function tryFocus() {
  const window = BrowserWindow.getAllWindows()[0]
  if (window.isMinimized()) {
    window.focus();
  }
}

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', tryFocus);
} else {
  process.exit(-1);
}

function getFirstUUID(): string {
  const interfaces = os.networkInterfaces();

  for (const interfaceId in interfaces) {
    for (const iface of interfaces[interfaceId] ?? ([] as os.NetworkInterfaceInfo[])) {
      if (iface.family != 'IPv4' || iface.internal) {
        continue;
      }

      return createHash('sha256')
        .update(iface.address)
        .digest('hex');
    }
  }

  throw new Error('Cannot find an IP to hash!');
}

function createWindow() {
  ////////////////////////////////////////////////////////////////////////////////
  //// Main app window

  const primaryWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,

    title: "Citizen Band",
    icon: path.resolve(__dirname, "../resources/icon.ico"),

    webPreferences: {
      preload: join(__dirname, "preload.js"),
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  primaryWindow.setMenu(null);

  if (is.dev) primaryWindow.loadURL("http://localhost:3000/app");
  else primaryWindow.loadURL("https://citizenband.app/app");
  primaryWindow.on("ready-to-show", () => primaryWindow.show());

  primaryWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  ipcMain.on("app.openDevTools", () => {
    primaryWindow.webContents.toggleDevTools();
  });

  hookKeybinds(primaryWindow);

  ////////////////////////////////////////////////////////////////////////////////
  //// Overlay window

  const overlayWindow = new BrowserWindow({
    frame: false,
    resizable: false,
    // fullscreen: true,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,

    show: false,

    webPreferences: {
      preload: join(__dirname, "preload.js"),
    },
  });

  function repositionOverlay(displayId?: number) {
    const displays = screen.getAllDisplays()
    const display = (displayId && displays[displayId]) ? displays[displayId] : screen.getPrimaryDisplay();
    overlayWindow.setBounds(display.bounds)
  }

  repositionOverlay();
  screen.on('display-removed', () => repositionOverlay())
  screen.on('display-added', () => repositionOverlay());
  screen.on('display-metrics-changed', () => repositionOverlay());

  ipcMain.on('app.overlay.setDisplay', (_, id: number) => repositionOverlay(id))

  primaryWindow.on('close', () => overlayWindow.close());

  overlayWindow.setMenu(null);
  overlayWindow.setIgnoreMouseEvents(true);

  if (is.dev) overlayWindow.loadURL("http://localhost:3000/overlay");
  else overlayWindow.loadURL("https://citizenband.app/overlay");
  // overlayWindow.on("ready-to-show", () => overlayWindow.show());

  ipcMain.on('app.overlay.setEnabled', (_, isEnabled: boolean) => {
    if (isEnabled) overlayWindow.show()
    else overlayWindow.hide();
  })

  ipcMain.on('app.overlay.updateState', (_, newState) => {
    overlayWindow.webContents.send('app.overlay.on.updateState', newState);
  })

  return { primaryWindow, overlayWindow };
}

app.setAppUserModelId('CitizenBand');

app.whenReady()
  .then(() => {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    const uuid = getFirstUUID();
    ipcMain.handle('app.getUserUuid', () => uuid);
    ipcMain.handle('app.getAppVersion', () => packageJson.version);

    autoUpdater.checkForUpdatesAndNotify({
      title: 'An update is ready', body: 'It will automatically be installed the next time you close the app.',
    });
    setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 1000 * 60 * 10);
  });
