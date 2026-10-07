'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_PATH = process.env.DEV_LAUNCHER_CONFIG || path.join(os.homedir(), '.dev-launcher.json');

function leerConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function guardarConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function expandirRuta(p) {
  if (!p) return p;
  p = p.trim().replace(/^["']|["']$/g, '');
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) p = path.join(os.homedir(), p.slice(1));
  p = p.replace(/%([^%]+)%/g, (m, v) => process.env[v] || m);       // %USERPROFILE%
  p = p.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (m, v) => process.env[v] || m); // $HOME
  return path.resolve(p);
}

function esCarpeta(p) {
  try { return fs.statSync(p).isDirectory(); } catch (e) { return false; }
}

// Busca un ejecutable en el PATH (respeta PATHEXT en Windows)
function existeComando(bin) {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const exts = process.platform === 'win32'
    ? ['', ...(process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').map((e) => e.toLowerCase())]
    : [''];
  for (const d of dirs) {
    for (const e of exts) {
      const f = path.join(d, bin + e);
      try {
        const st = fs.statSync(f);
        if (st.isFile()) {
          if (process.platform === 'win32') return true;
          fs.accessSync(f, fs.constants.X_OK);
          return true;
        }
      } catch (err) { /* sigue buscando */ }
    }
  }
  return false;
}

function listarProyectos(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  } catch (e) {
    return [];
  }
}

module.exports = { CONFIG_PATH, leerConfig, guardarConfig, expandirRuta, esCarpeta, existeComando, listarProyectos };
