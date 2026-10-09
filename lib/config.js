'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_PATH = process.env.DEV_LAUNCHER_CONFIG || path.join(os.homedir(), '.dev-launcher.json');

function leerConfig() {
  try {
    return normalizar(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  } catch (e) {
    return null;
  }
}

// Las versiones anteriores guardaban una sola carpeta en "root"; ahora es una lista en "carpetas"
function normalizar(config) {
  if (!config || typeof config !== 'object') return null;
  if (!Array.isArray(config.carpetas)) config.carpetas = config.root ? [config.root] : [];
  delete config.root;
  return config;
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

// Proyectos de todas las carpetas: [{ nombre, ruta, carpeta }]
function listarTodos(carpetas) {
  return carpetas.flatMap((carpeta) => listarProyectos(carpeta)
    .map((nombre) => ({ nombre, ruta: path.join(carpeta, nombre), carpeta })));
}

function mismaRuta(a, b) {
  return process.platform === 'win32' || process.platform === 'darwin'
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

// Nombre corto de una carpeta de proyectos: su nombre, o la ruta si otra carpeta se llama igual
function nombreCarpeta(carpeta, carpetas) {
  const base = path.basename(carpeta) || carpeta;
  const repetido = carpetas.some((c) => c !== carpeta && (path.basename(c) || c).toLowerCase() === base.toLowerCase());
  return repetido ? rutaCorta(carpeta) : base;
}

// Muestra la ruta con ~ en lugar de la carpeta del usuario
function rutaCorta(p) {
  const home = os.homedir();
  return p && p.toLowerCase().startsWith(home.toLowerCase()) ? '~' + p.slice(home.length) : p;
}

module.exports = {
  CONFIG_PATH, rutaCorta, leerConfig, guardarConfig, expandirRuta, esCarpeta, existeComando,
  listarProyectos, listarTodos, mismaRuta, nombreCarpeta,
};
