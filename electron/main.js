/* ============================================================
   EYE GATE — Processo principal (Electron)
   App DESKTOP de verdade: janela própria, sem navegador.
   Sobe um servidor local interno (127.0.0.1, porta aleatória)
   pra garantir que fetch/models/câmera funcionem perfeitamente.
   ============================================================ */

const { app, BrowserWindow, Menu, session } = require("electron");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream"
};

// instância única
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

let mainWindow = null;

function iniciarServidorInterno() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (caminho === "/") caminho = "/index.html";
      const arquivo = path.join(ROOT, path.normalize(caminho).replace(/^(\.\.[/\\])+/, ""));
      if (!arquivo.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(arquivo, (err, data) => {
        if (err) { res.writeHead(404); res.end("não encontrado"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(arquivo).toLowerCase()] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function createWindow(porta) {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 660,
    backgroundColor: "#0a0d12",
    title: "EYE GATE",
    icon: path.join(ROOT, "img", "logo.png"),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    }
  });

  // câmera liberada dentro do app
  const permitidos = new Set(["media", "fullscreen", "clipboard-sanitized-write"]);
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => callback(permitidos.has(permission)));
  session.defaultSession.setPermissionCheckHandler((wc, permission) => permitidos.has(permission));

  mainWindow.loadURL(`http://127.0.0.1:${porta}/index.html`);
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F12") { mainWindow.webContents.toggleDevTools(); e.preventDefault(); }
    if (input.key === "F11") { mainWindow.setFullScreen(!mainWindow.isFullScreen()); e.preventDefault(); }
  });

  mainWindow.on("closed", () => (mainWindow = null));
}

app.whenReady().then(async () => {
  const porta = await iniciarServidorInterno();
  createWindow(porta);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(porta);
  });
});

app.on("second-instance", () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
