const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getData: () => ipcRenderer.invoke('data:get'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:action', (_, action) => callback(action));
  },
  showFontDialog: () => ipcRenderer.invoke('dialog:font'),
  setAppIcon: (dataUrl) => ipcRenderer.invoke('icon:set', dataUrl),
});
