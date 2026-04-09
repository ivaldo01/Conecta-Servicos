// Polyfill para process.env para evitar erros de descritor no Expo Web + Electron
if (typeof process === 'undefined') {
  window.process = { env: {} };
} else if (!process.env) {
  process.env = {};
}

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
