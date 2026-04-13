// ============================================================
// ELECTRON — Processo Principal
// Abre o Next.js dentro de uma janela nativa no Windows/Mac
//
// Para rodar em desenvolvimento: npm run electron:dev
// Para gerar o instalador:       npm run electron:build
// ============================================================

const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

// URL da aplicação Next.js
const DEV_URL  = 'http://localhost:3000';
const PROD_URL = `file://${path.join(__dirname, '../out/index.html')}`;

let mainWindow = null;
let tray = null;

// ============================================================
// CRIAÇÃO DA JANELA PRINCIPAL
// ============================================================
function criarJanela() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    title: 'Conecta Solutions',
    icon: path.join(__dirname, '../public/logo.png'),

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },

    // Visual: sem borda nativa, usa a própria topbar da aplicação
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#F1F3F5',
    show: false,  // Só mostra após carregar para evitar flash
  });

  // Carrega a URL correta
  mainWindow.loadURL(isDev ? DEV_URL : PROD_URL);

  // Mostra a janela só quando o conteúdo estiver pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Abre links externos no navegador padrão (não na janela Electron)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ============================================================
// ÍCONE NA BANDEJA DO SISTEMA (system tray)
// Permite minimizar para a bandeja e restaurar
// ============================================================
function criarTray() {
  const iconePath = path.join(__dirname, '../public/logo.png');
  const img = nativeImage.createFromPath(iconePath).resize({ width: 16, height: 16 });
  tray = new Tray(img);

  const menu = Menu.buildFromTemplate([
    { label: 'Abrir Conecta Solutions', click: () => { if (mainWindow) mainWindow.show(); else criarJanela(); }},
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() },
  ]);

  tray.setToolTip('Conecta Solutions');
  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); else criarJanela(); });
}

// ============================================================
// EVENTOS DO APP
// ============================================================
app.whenReady().then(() => {
  criarJanela();
  criarTray();

  // macOS: recria a janela quando clica no ícone do dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

// Fecha apenas no Windows/Linux (no Mac deixa o app no dock)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
