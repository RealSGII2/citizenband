import os from 'node:os';
import { createHash } from 'node:crypto';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join } from 'path';
import hookKeybinds from './keybinds';
import packageJson from '../package.json';
import { autoUpdater } from 'electron-updater';

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
  const window = new BrowserWindow({
    width: 800, height: 600, show: false,

    title: 'CitizenBand',

    webPreferences: {
      preload: join(__dirname, 'preload.js'), autoplayPolicy: 'no-user-gesture-required',
    },
  });

  window.setMenu(null);

  if (is.dev) window.loadURL('http://localhost:3000/app'); else window.loadURL('https://cb.realsgii2.dev/app');
  window.on('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  ipcMain.on('app.openDevTools', () => {
    window.webContents.toggleDevTools();
  });

  hookKeybinds(window);

  const isLocked = app.requestSingleInstanceLock();

  if (isLocked) {
    app.on('second-instance', () => {
      if (window.isMinimized()) {
        window.focus();
      }
    });
  }

  return window;
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
    setInterval(autoUpdater.checkForUpdatesAndNotify, 1000 * 60 * 10);
  });
