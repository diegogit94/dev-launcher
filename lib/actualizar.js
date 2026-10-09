'use strict';

// Buscar e instalar versiones nuevas de dev-launcher desde npm.

const https = require('https');
const path = require('path');
const { spawn } = require('child_process');
const pkg = require('../package.json');

const ACTUAL = pkg.version;
const COMANDO = 'npm install -g dev-launcher@latest';
const UN_DIA = 24 * 60 * 60 * 1000;

// Ultima version publicada en npm, o null si no se pudo consultar.
// En segundo plano la conexion no mantiene vivo el proceso (dev puede salir antes de la respuesta).
function consultarUltima({ timeout = 5000, segundoPlano = false } = {}) {
  return new Promise((resolve) => {
    const req = https.get(`https://registry.npmjs.org/${pkg.name}/latest`, { timeout, headers: { accept: 'application/json' } }, (res) => {
      let datos = '';
      res.on('data', (d) => { datos += d; });
      res.on('end', () => {
        try { resolve(res.statusCode === 200 ? JSON.parse(datos).version || null : null); } catch (e) { resolve(null); }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
    if (segundoPlano) req.on('socket', (s) => s.unref());
  });
}

// true si la version a es mas nueva que b (x.y.z)
function esMasNueva(a, b) {
  const pa = String(a).split('-')[0].split('.').map(Number);
  const pb = String(b).split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

// Version nueva ya conocida (de la ultima revision), o null
function disponible(config) {
  const ultima = config.actualizacion && config.actualizacion.ultima;
  return ultima && esMasNueva(ultima, ACTUAL) ? ultima : null;
}

function anotar(config, ultima) {
  config.actualizacion = { revisado: Date.now(), ultima };
}

// Revisa npm como maximo una vez al dia, sin bloquear: el resultado se ve la proxima vez que se abre dev.
// Se desactiva con DEV_LAUNCHER_NO_UPDATE_CHECK=1 (o NO_UPDATE_NOTIFIER).
function revisarEnSegundoPlano(config, guardar) {
  if (process.env.DEV_LAUNCHER_NO_UPDATE_CHECK || process.env.NO_UPDATE_NOTIFIER || esCopiaLocal()) return;
  const revisado = (config.actualizacion && config.actualizacion.revisado) || 0;
  if (Date.now() - revisado < UN_DIA) return;
  consultarUltima({ timeout: 3000, segundoPlano: true }).then((ultima) => {
    if (!ultima) return;
    anotar(config, ultima);
    guardar(config);
  });
}

// dev corre desde una copia del repo (node bin/dev.js) y no desde una instalacion de npm
function esCopiaLocal() {
  return !__dirname.split(path.sep).includes('node_modules');
}

// Instala la ultima version con npm, mostrando su salida. Devuelve el codigo de salida.
function instalar() {
  return new Promise((resolve) => {
    const hijo = spawn(COMANDO, { shell: true, stdio: 'inherit' });
    hijo.on('error', () => resolve(1));
    hijo.on('exit', (code) => resolve(code === null ? 1 : code));
  });
}

module.exports = { ACTUAL, COMANDO, consultarUltima, esMasNueva, disponible, anotar, revisarEnSegundoPlano, esCopiaLocal, instalar };
