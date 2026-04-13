// ============================================================
// ELECTRON — Preload Script
// Ponte segura entre o processo principal e o renderer
// Expõe apenas APIs necessárias ao contexto web
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Versão da aplicação
  versao: () => process.env.npm_package_version || '1.0.0',

  // Plataforma (win32, darwin, linux)
  plataforma: () => process.platform,

  // Indica que está rodando dentro do Electron
  isElectron: true,
});
