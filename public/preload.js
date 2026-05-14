const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  llmChat: (payload) => ipcRenderer.invoke('llm:chat', payload),
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store:set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store:delete', key),
  storeKeys: () => ipcRenderer.invoke('store:keys'),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
});
