const { app, BrowserWindow, screen, session } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Configura uma CSP segura para o ambiente de desenvolvimento
  if (isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' http://localhost:8083 'unsafe-inline' 'unsafe-eval' data: blob: https://*.firebaseapp.com https://*.googleapis.com https://*.gstatic.com https://*.firebase.com https://*.google-analytics.com https://*.googletagmanager.com https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' http://localhost:8083 https://*.firebaseapp.com https://*.googleapis.com https://*.gstatic.com https://*.firebase.io https://*.google-analytics.com https://*.googletagmanager.com; img-src 'self' data: blob: http://localhost:8083 https://*; font-src 'self' data: https://fonts.gstatic.com;"
          ]
        }
      });
    });
  }

  const mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(800, height),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Mantém false para permitir o preload se necessário, mas isolado
      preload: path.join(__dirname, 'preload.js'),
    },
    title: "Agenda de Serviços - Desktop",
    backgroundColor: '#ffffff',
    show: true, // Mostra logo para debug se estiver em branco
    icon: path.join(__dirname, '../assets/icon.png'),
  });

  // Se estiver em desenvolvimento, carrega a URL do Expo Web
  if (isDev) {
    const devUrl = 'http://localhost:8083'; // Porta atual do servidor
    console.log(`Tentando carregar ${devUrl}...`);
    mainWindow.loadURL(devUrl).catch(err => {
      console.error(`ERRO DE CARREGAMENTO NO DESKTOP:`);
      console.error(`Não foi possível conectar em ${devUrl}`);
      console.error("Verifique se o servidor Expo está rodando na porta correta.");
      console.error(err);
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
