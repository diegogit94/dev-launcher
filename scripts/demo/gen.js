#!/usr/bin/env node
'use strict';

/*
Regenera los GIFs y capturas de docs/assets grabando sesiones de `dev`.

Cada `dev` corre de verdad en un proceso aparte, con la terminal simulada de tty.js (no hace falta
un pty, asi que funciona en Windows, macOS y Linux). Los agentes son simulados: muestran
"(X session starts here...)" y terminan.

Requisitos:
  - agg (https://github.com/asciinema/agg/releases) en scripts/demo/tools/ (agg o agg.exe)
  - la fuente JetBrains Mono (.ttf) en scripts/demo/tools/fonts/
  - ImageMagick (`magick`) para las capturas .png
  Con --descargar baja agg y la fuente a tools/ (carpeta ignorada por git).

Uso:  node scripts/demo/gen.js                 # todos
      node scripts/demo/gen.js usage settings  # solo algunos (install | usage | flags | settings)
      node scripts/demo/gen.js --descargar     # baja agg y la fuente antes de generar
*/

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync, execFileSync, execSync } = require('child_process');

const S = __dirname;
const REPO = path.resolve(S, '..', '..');
const TOOLS = process.env.DEMO_TOOLS || path.join(S, 'tools');
const OUT = path.join(S, 'out');
const ASSETS = path.join(REPO, 'docs', 'assets');
const WIN = process.platform === 'win32';
const AGG = path.join(TOOLS, WIN ? 'agg.exe' : 'agg');
const BASE = path.join(os.tmpdir(), 'dev-launcher-demo');
const HOME = path.join(BASE, 'home');
const STUBS = path.join(BASE, 'bin');
const CONFIG = path.join(HOME, '.dev-launcher.json');

const PROMPT = '\x1b[1;36m~\x1b[0m \x1b[1;35m❯\x1b[0m ';
const TECLAS = { ENTER: '\r', DOWN: '\x1b[B', UP: '\x1b[A', TAB: '\t', ESC: '\x1b', BS: '\x7f' };

// Nombre final en docs/assets de cada archivo generado
const DESTINOS = {
  'install.gif': 'install.gif', 'usage.gif': 'usage.gif', 'flags.gif': 'flags.gif', 'settings.gif': 'settings.gif',
  'install-agentes.png': 'setup-agent.png', 'usage-lista.png': 'project-menu.png',
  'usage-menu_modo.png': 'open-menu.png',
};

// Pasos: sh (escribe un comando en el prompt y lo ejecuta), type (teclea dentro de dev), key,
// wait (espera un texto en la salida), sleep, mark (momento para una captura)
const sh = (c) => ({ sh: c });
const T = (s, cps) => ({ type: s, cps });
const K = (k, after) => ({ key: k, after });
const W = (s) => ({ wait: s });
const Z = (s) => ({ sleep: s });
const M = (s) => ({ mark: s });
const n = (k, veces, after) => Array.from({ length: veces }, () => K(k, after));

const DEV = path.join(HOME, 'Dev');
const WORK = path.join(HOME, 'Work');
const configDemo = (extra) => Object.assign({
  carpetas: [DEV, WORK],
  agente: 'claude',
  modo: 'preguntar',
  ultimoAgente: { [path.join(WORK, 'crm-dashboard')]: 'codex' },
}, extra);

const ESCENARIOS = {
  install: {
    cols: 92, rows: 27, config: null,
    steps: [
      Z(0.8), sh('npm install -g dev-launcher'), W('added'), Z(1.2),
      sh('dev --config'), W('Ruta:'), Z(0.8),
      T(WIN ? '~\\De' : '~/De', 0.12), K('TAB', 0.7), Z(0.4), K('ENTER'), W('Que agente'), Z(1.0),
      K('DOWN', 0.6), K('UP', 0.6), M('agentes'), Z(0.6), K('ENTER'), W('Que hacer'), Z(1.4),
      K('ENTER'), W('Listo'), Z(2.5),
    ],
  },
  usage: {
    cols: 92, rows: 19, config: configDemo(),
    steps: [
      Z(0.8), sh('dev'), W('Elige un proyecto'), Z(1.0), M('lista'),
      K('DOWN', 0.5), K('DOWN', 0.5), Z(0.3), T('sho', 0.25), Z(1.0),
      K('ENTER'), W('Como lo abro'), Z(0.8), M('menu_modo'), Z(0.4), K('DOWN', 0.7), K('ENTER'), W('session starts'), Z(1.6),
      sh('dev shop'), W('Como lo abro'), Z(1.8), K('ENTER'), W('session starts'), Z(2.2),
    ],
  },
  flags: {
    cols: 92, rows: 19, config: configDemo(),
    steps: [
      Z(0.8), sh('dev land -n'), W('session starts'), Z(1.2),
      sh('dev api -a codex -c'), W('session starts'), Z(1.2),
      sh('dev -l'), W('shop-backend'), Z(2.5),
    ],
  },
  settings: {
    cols: 92, rows: 19, config: configDemo(),
    steps: [
      Z(0.8), sh('dev'), W('Elige un proyecto'), Z(1.0),
      K('UP', 0.8), K('ENTER'), W('Agentes personalizados'), Z(1.6),
      K('ENTER'), W('Vincular otra'), Z(1.8), K('ESC', 0.9), W('Agentes personalizados'), Z(0.4),
      ...n('DOWN', 3, 0.4), K('ENTER'), W('se ve al moverte'), Z(0.8),
      ...n('DOWN', 3, 0.9), Z(0.4), K('ENTER'), W('Color: Magenta'), Z(1.5),
      K('ESC', 0.9), W('Elige un proyecto'), Z(1.8), K('ESC', 0.9), Z(1.0),
    ],
  },
};

// ---- Entorno de la demo: carpeta de usuario con proyectos y agentes simulados ----

function preparar() {
  fs.rmSync(BASE, { recursive: true, force: true });
  for (const p of ['api-gateway', 'design-system', 'landing-page', 'mobile-app', 'portfolio']) fs.mkdirSync(path.join(DEV, p), { recursive: true });
  for (const p of ['crm-dashboard', 'shop-backend', 'billing-service']) fs.mkdirSync(path.join(WORK, p), { recursive: true });
  fs.mkdirSync(STUBS, { recursive: true });
  for (const b of ['claude', 'codex']) {
    // solo tienen que existir para que dev los detecte como instalados; tty.js simula la ejecucion
    const f = path.join(STUBS, WIN ? `${b}.cmd` : b);
    fs.writeFileSync(f, WIN ? '@echo off\r\n' : '#!/bin/sh\n');
    fs.chmodSync(f, 0o755);
  }
  execSync(`npm pack --silent --pack-destination "${BASE}"`, { cwd: REPO, stdio: 'pipe' });
  const tgz = fs.readdirSync(BASE).find((f) => f.endsWith('.tgz'));
  fs.renameSync(path.join(BASE, tgz), path.join(BASE, 'dev-launcher.tgz'));
}

function entorno(esc) {
  return Object.assign({}, process.env, {
    HOME, USERPROFILE: HOME, DEV_LAUNCHER_CONFIG: CONFIG,
    PATH: STUBS, // solo los agentes simulados: que no aparezcan los agentes instalados en esta maquina
    DEMO_COLS: String(esc.cols), DEMO_ROWS: String(esc.rows),
    NO_COLOR: '', FORCE_COLOR: '',
  });
}

// ---- Grabacion ----

async function grabar(nombre, esc) {
  fs.rmSync(CONFIG, { force: true });
  if (esc.config) fs.writeFileSync(CONFIG, JSON.stringify(esc.config, null, 2));

  const eventos = [];
  const marcas = {};
  const t0 = Date.now();
  let salida = '';
  let visto = 0;
  let hijo = null;
  let termino = Promise.resolve();
  const dormir = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const emitir = (texto) => {
    texto = texto.replace(/\r?\n/g, '\r\n'); // la terminal real convierte \n en \r\n
    eventos.push([(Date.now() - t0) / 1000, 'o', texto]);
    salida += texto;
  };
  const escuchar = (proc) => {
    proc.stdout.on('data', (d) => emitir(d.toString('utf8')));
    proc.stderr.on('data', (d) => emitir(d.toString('utf8')));
    return new Promise((r) => proc.on('close', () => { hijo = null; setTimeout(() => { emitir(PROMPT); r(); }, 150); }));
  };

  emitir(PROMPT);
  for (const st of esc.steps) {
    if (st.mark) {
      marcas[st.mark] = (Date.now() - t0) / 1000;
    } else if (st.sleep) {
      await dormir(st.sleep);
    } else if (st.sh) {
      await termino;
      for (const ch of st.sh) { emitir(ch); await dormir(0.07); }
      await dormir(0.25);
      emitir('\n');
      const [cmd, ...args] = st.sh.split(' ');
      if (cmd === 'npm') {
        // instalacion real del paquete (empaquetado desde este repo) en una carpeta aparte
        const instalar = `npm install -g --prefix "${path.join(BASE, 'npm')}" "${path.join(BASE, 'dev-launcher.tgz')}" --no-fund --no-audit --loglevel=error`;
        const p = spawn(instalar, { shell: true, env: Object.assign({}, process.env, { NO_UPDATE_NOTIFIER: '1' }) });
        termino = escuchar(p);
      } else {
        hijo = spawn(process.execPath, ['-r', path.join(S, 'tty.js'), path.join(REPO, 'bin', 'dev.js'), ...args],
          { env: entorno(esc), stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
        termino = escuchar(hijo);
      }
    } else if (st.type) {
      for (const ch of st.type) { hijo.send(ch); await dormir(st.cps || 0.07); }
      await dormir(0.25);
    } else if (st.key) {
      hijo.send(TECLAS[st.key]);
      await dormir(st.after || 0.45);
    } else if (st.wait) {
      const fin = Date.now() + 15000;
      while (!salida.includes(st.wait, visto) && Date.now() < fin) await dormir(0.05);
      if (salida.includes(st.wait, visto)) visto = salida.indexOf(st.wait, visto) + st.wait.length;
      else console.error(`  AVISO (${nombre}): no aparecio "${st.wait}"`);
      await dormir(0.3);
    }
  }
  await termino;
  if (hijo) hijo.kill();

  const cast = path.join(OUT, `${nombre}.cast`);
  const header = { version: 2, width: esc.cols, height: esc.rows, timestamp: Math.floor(t0 / 1000), env: { TERM: 'xterm-256color' } };
  fs.writeFileSync(cast, [JSON.stringify(header), ...eventos.map((e) => JSON.stringify(e))].join('\n') + '\n');
  console.log(`${nombre}.cast: ${eventos.length} eventos, ${eventos[eventos.length - 1][0].toFixed(1)}s`);
  return { cast, marcas };
}

// ---- Render ----

function agg(cast, gif, { font = 18, last = 4 } = {}) {
  execFileSync(AGG, ['--font-dir', path.join(TOOLS, 'fonts'), '--font-family', 'JetBrains Mono',
    '--font-size', String(font), '--theme', 'github-dark', '--idle-time-limit', '1.6',
    '--last-frame-duration', String(last), '--fps-cap', '20', cast, gif], { stdio: 'pipe' });
}

// Captura: la grabacion hasta la marca, renderizada, y su ultimo cuadro como .png
// recortado al contenido (con el mismo margen que deja agg)
function captura(cast, hasta, png) {
  const lineas = fs.readFileSync(cast, 'utf8').trim().split('\n');
  const corto = png + '.cast';
  const gif = png + '.gif';
  fs.writeFileSync(corto, [lineas[0], ...lineas.slice(1).filter((l) => JSON.parse(l)[0] <= hasta)].join('\n') + '\n');
  agg(corto, gif, { font: 20, last: 0.1 });
  execFileSync('magick', [gif, '-coalesce', '-delete', '0--2', '-strip', png]);
  const fondo = execFileSync('magick', [png, '-format', '%[pixel:p{0,0}]', 'info:']).toString().trim();
  execFileSync('magick', [png, '-trim', '+repage', '-bordercolor', fondo, '-border', '14', png]);
  fs.rmSync(corto); fs.rmSync(gif);
}

// ---- Descarga de agg y la fuente ----

function descargar() {
  fs.mkdirSync(path.join(TOOLS, 'fonts'), { recursive: true });
  const curl = (url, destino) => execFileSync('curl', ['-fsSL', '-o', destino, url], { stdio: 'inherit' });
  if (!fs.existsSync(AGG)) {
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
    const sufijo = WIN ? 'x86_64-pc-windows-msvc.exe' : process.platform === 'darwin' ? `${arch}-apple-darwin` : `${arch}-unknown-linux-gnu`;
    console.log('Descargando agg...');
    curl(`https://github.com/asciinema/agg/releases/latest/download/agg-${sufijo}`, AGG);
    fs.chmodSync(AGG, 0o755);
  }
  if (!fs.readdirSync(path.join(TOOLS, 'fonts')).some((f) => f.endsWith('.ttf'))) {
    console.log('Descargando JetBrains Mono...');
    const zip = path.join(TOOLS, 'jetbrains-mono.zip');
    curl('https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip', zip);
    const dir = path.join(TOOLS, 'jbm');
    fs.mkdirSync(dir, { recursive: true });
    // en Windows, el tar.exe del sistema (el de Git Bash no abre .zip)
    const tar = WIN ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
    execFileSync(tar, ['-xf', zip, '-C', dir]);
    for (const f of ['JetBrainsMono-Regular.ttf', 'JetBrainsMono-Bold.ttf', 'JetBrainsMono-Italic.ttf', 'JetBrainsMono-BoldItalic.ttf']) {
      fs.copyFileSync(path.join(dir, 'fonts', 'ttf', f), path.join(TOOLS, 'fonts', f));
    }
    fs.rmSync(dir, { recursive: true }); fs.rmSync(zip);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--descargar')) descargar();
  const solo = args.filter((a) => !a.startsWith('--'));
  if (!fs.existsSync(AGG)) throw new Error(`No encuentro agg en ${AGG}. Usa --descargar.`);
  if (spawnSync('magick', ['-version']).status !== 0) throw new Error('No encuentro ImageMagick (magick).');

  fs.mkdirSync(OUT, { recursive: true });
  preparar();
  for (const [nombre, esc] of Object.entries(ESCENARIOS)) {
    if (solo.length && !solo.includes(nombre)) continue;
    const { cast, marcas } = await grabar(nombre, esc);
    agg(cast, path.join(OUT, `${nombre}.gif`));
    for (const [m, t] of Object.entries(marcas)) captura(cast, t, path.join(OUT, `${nombre}-${m}.png`));
  }

  fs.mkdirSync(ASSETS, { recursive: true });
  for (const [origen, destino] of Object.entries(DESTINOS)) {
    const p = path.join(OUT, origen);
    if (fs.existsSync(p)) {
      fs.copyFileSync(p, path.join(ASSETS, destino));
      console.log(`docs/assets/${destino}  (${Math.round(fs.statSync(p).size / 1024)} KB)`);
    }
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
