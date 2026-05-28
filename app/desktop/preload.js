const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startUpdate: (url, version) => ipcRenderer.send("start-update", { url, version })
});
