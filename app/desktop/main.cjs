const fs = require("fs");
const path = require("path");
const https = require("https");
const { app, BrowserWindow, shell, dialog, ipcMain, Tray, Menu } = require("electron");

let tray = null;
let mainWindow = null;
let isQuitting = false;

const trayIconPath = path.join(__dirname, "tray_icon.png");
const trayIconUnreadPath = path.join(__dirname, "tray_icon_unread.png");

function createTray() {
  if (!fs.existsSync(trayIconPath)) {
    console.error("Tray icon not found at", trayIconPath);
  }
  
  tray = new Tray(trayIconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Mở Damess",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: "separator" },
    {
      label: "Thoát",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip("Damess");
  tray.setContextMenu(contextMenu);
  
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

ipcMain.on("start-update", (event, data) => {
  startUpdateProcess(data.url, data.version, BrowserWindow.fromWebContents(event.sender));
});

function getFrontendIndexPath() {
  const packagedPath = path.join(process.resourcesPath, "frontend", "dist", "index.html");
  if (app.isPackaged && fs.existsSync(packagedPath)) {
    return packagedPath;
  }

  return path.join(__dirname, "../frontend/dist/index.html");
}

function compareVersions(v1, v2) {
  const parts1 = String(v1 || "0.0.0").replace("v", "").split(".").map(Number);
  const parts2 = String(v2 || "0.0.0").replace("v", "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function downloadFile(url, destPath, onProgress, onComplete, onError) {
  function startDownload(targetUrl) {
    const request = https.get(targetUrl, {
      headers: {
        "User-Agent": "Electron-App-Updater"
      }
    }, (response) => {
      // Handle redirect status codes 301, 302, 307, 308
      if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
        startDownload(response.headers.location);
        return;
      }

      if (response.statusCode !== 200) {
        onError(new Error(`Failed to download: status code ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers["content-length"], 10) || 0;
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = (downloadedBytes / totalBytes) * 100;
          onProgress({
            percent,
            downloadedMb: downloadedBytes / (1024 * 1024),
            totalMb: totalBytes / (1024 * 1024)
          });
        }
      });

      fileStream.on("finish", () => {
        fileStream.close();
        onComplete();
      });

      fileStream.on("error", (err) => {
        fs.unlink(destPath, () => {});
        onError(err);
      });
    });

    request.on("error", (err) => {
      fs.unlink(destPath, () => {});
      onError(err);
    });
  }

  startDownload(url);
}

function startUpdateProcess(downloadUrl, latestVersion, parentWindow) {
  const progressWin = new BrowserWindow({
    width: 440,
    height: 180,
    resizable: false,
    frame: false,
    parent: parentWindow,
    modal: true,
    backgroundColor: "#111214",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  progressWin.removeMenu();
  progressWin.loadFile(path.join(__dirname, "update.html"));

  const destPath = path.join(app.getPath("downloads"), `Damess-Desktop-v${latestVersion}.zip`);

  progressWin.webContents.on("did-finish-load", () => {
    progressWin.webContents.send("download-status", "Đang kết nối tới máy chủ GitHub...");
    
    downloadFile(downloadUrl, destPath, 
      (progressData) => {
        if (!progressWin.isDestroyed()) {
          progressWin.webContents.send("download-progress", progressData);
        }
      },
      () => {
        if (!progressWin.isDestroyed()) {
          progressWin.close();
        }
        
        dialog.showMessageBox({
          type: "info",
          title: "Cập nhật thành công",
          message: "Tải bản cập nhật hoàn tất!",
          detail: `Tệp tin cập nhật đã được tải về hòm thư Downloads:\n${destPath}\n\nỨng dụng sẽ tắt để bạn giải nén và sử dụng phiên bản mới.`,
          buttons: ["Đồng ý"]
        }).then(() => {
          shell.showItemInFolder(destPath);
          app.quit();
        });
      },
      (err) => {
        if (!progressWin.isDestroyed()) {
          progressWin.close();
        }
        dialog.showErrorBox("Lỗi tải cập nhật", `Không thể tải bản cập nhật: ${err.message}`);
      }
    );
  });
}

ipcMain.on("update-unread-count", (event, count) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (count > 0) {
    win.flashFrame(true);
    if (tray && fs.existsSync(trayIconUnreadPath)) {
      tray.setImage(trayIconUnreadPath);
      tray.setToolTip(`Damess (${count} thông báo mới)`);
    }
  } else {
    win.flashFrame(false);
    if (tray && fs.existsSync(trayIconPath)) {
      tray.setImage(trayIconPath);
      tray.setToolTip("Damess");
    }
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    title: "Damess",
    backgroundColor: "#1a1b1e",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(getFrontendIndexPath());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Keep app running in background when close window
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Stop flashing taskbar icon when user focuses the window
  mainWindow.on("focus", () => {
    mainWindow.flashFrame(false);
  });
}

app.whenReady().then(() => {
  createTray();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});
