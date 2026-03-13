const { app, BrowserWindow, ipcMain, dialog} = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('node:path');
const fs = require('fs');
const DEEP_LINK_PROTOCOL = 'mallookios'


let mainWindow = null;
let pendingDeepLink = null;
function sendUpdater(event, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:event', { event, ...payload });
  }
}
// ── Auto-updater ──────────────────────────────────────────────
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update');
  sendUpdater('checking');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available', info);
  sendUpdater('available', { version: info.version });
});

autoUpdater.on('update-not-available', (info) => {
  log.info('No update available', info);
  sendUpdater('not-available', { version: info.version });
});

autoUpdater.on('error', (err) => {
  log.error('Updater error', err);
  sendUpdater('error', { message: err.message || 'Unknown updater error' });
});

autoUpdater.on('download-progress', (progressObj) => {
  log.info(`Download progress: ${progressObj.percent}%`);
  sendUpdater('progress', { percent: progressObj.percent });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded');
  sendUpdater('downloaded', { version: info.version });
});

ipcMain.handle('updater:install', async () => {
  autoUpdater.quitAndInstall(true, true);
});

function extractDeepLinkFromArgv(argv = []) {
  return argv.find(arg =>
    typeof arg === 'string' && arg.startsWith(`${DEEP_LINK_PROTOCOL}://`)
  ) || null;
}

const CACHE_FILE = path.join(app.getPath('userData'), 'cache.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 860,
    minWidth: 950,
    minHeight: 650,
    title: 'MallookiOS',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a0a0f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    autoUpdater.checkForUpdates();

    if (pendingDeepLink) {
      forwardDeepLink(pendingDeepLink);
      pendingDeepLink = null;
    }
  });
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(
      DEEP_LINK_PROTOCOL,
      process.execPath,
      [path.resolve(process.argv[1])]
    )
  }
} else {
  app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL)
}

function forwardDeepLink(url) {
  if (!url) return;

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();

    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('auth:deep-link', url);
      });
    } else {
      mainWindow.webContents.send('auth:deep-link', url);
    }
  }
}
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
      const deepLink = extractDeepLinkFromArgv(commandLine);
    

    if (deepLink) {
      pendingDeepLink = deepLink;
      forwardDeepLink(deepLink);
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  pendingDeepLink = url;
  forwardDeepLink(url)
})
pendingDeepLink = extractDeepLinkFromArgv(process.argv);

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('cache-save', (_e, json) => {
  fs.writeFileSync(CACHE_FILE, json, 'utf-8'); return { ok: true };
});
ipcMain.handle('cache-load', () => {
  if (!fs.existsSync(CACHE_FILE)) return { ok: true, data: null };
  return { ok: true, data: fs.readFileSync(CACHE_FILE, 'utf-8') };
});
ipcMain.handle('export-data', async (_e, json) => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Export Backup',
    defaultPath: `mallooki_backup_${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, json, 'utf-8'); return { ok: true };
});
ipcMain.handle('import-data', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePaths, canceled } = await dialog.showOpenDialog(win, {
    title: 'Import Backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return { ok: false };
  return { ok: true, data: fs.readFileSync(filePaths[0], 'utf-8') };
});
