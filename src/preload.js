const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  cacheLoad:  ()     => ipcRenderer.invoke('cache-load'),
  cacheSave:  (json) => ipcRenderer.invoke('cache-save', json),
  exportData: (json) => ipcRenderer.invoke('export-data', json),
  importData: ()     => ipcRenderer.invoke('import-data'),
});

contextBridge.exposeInMainWorld('updater', {
  onEvent: (callback) => {
    ipcRenderer.on('updater:event', (_event, data) => callback(data));
  },
  install: () => ipcRenderer.invoke('updater:install')
});

contextBridge.exposeInMainWorld('authBridge', {
  onDeepLink: (callback) => {
    ipcRenderer.removeAllListeners('auth:deep-link');
    ipcRenderer.on('auth:deep-link', (_event, url) => callback(url));
  }
});

