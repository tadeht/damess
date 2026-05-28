const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, shell } = require("electron");

function getFrontendIndexPath() {
  const packagedPath = path.join(process.resourcesPath, "frontend", "dist", "index.html");
  if (app.isPackaged && fs.existsSync(packagedPath)) {
    return packagedPath;
  }

  return path.join(__dirname, "../frontend/dist/index.html");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    title: "Damess",
    backgroundColor: "#1a1b1e",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.removeMenu();
  win.loadFile(getFrontendIndexPath());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
