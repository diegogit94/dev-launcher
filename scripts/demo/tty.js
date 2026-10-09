'use strict';

// Se carga con `node -r tty.js bin/dev.js ...` desde gen.js. Hace que `dev` crea que corre en una
// terminal real: stdin/stdout como TTY, teclas que llegan desde gen.js por IPC y agentes simulados.

const { PassThrough } = require('stream');
const { EventEmitter } = require('events');
const path = require('path');
const childProcess = require('child_process');

// stdout como terminal del tamano del escenario
for (const s of [process.stdout, process.stderr]) {
  s.isTTY = true;
  s.columns = Number(process.env.DEMO_COLS) || 92;
  s.rows = Number(process.env.DEMO_ROWS) || 20;
}

// stdin: un stream al que gen.js le escribe las teclas. Mientras esta "resumido" (esperando teclas)
// se mantiene vivo el proceso, igual que con una terminal de verdad.
const stdin = new PassThrough();
stdin.isTTY = true;
stdin.setRawMode = () => stdin;
let vivo = null;
const resume = stdin.resume.bind(stdin);
const pause = stdin.pause.bind(stdin);
stdin.resume = () => { if (!vivo) vivo = setInterval(() => {}, 1000); return resume(); };
stdin.pause = () => { clearInterval(vivo); vivo = null; return pause(); };
Object.defineProperty(process, 'stdin', { configurable: true, get: () => stdin });

process.on('message', (m) => stdin.write(Buffer.from(m, 'binary')));
process.channel.unref();

// Agentes simulados: en vez de abrir el agente, muestran una linea y terminan
const NOMBRES = { claude: 'Claude Code', codex: 'OpenAI Codex' };
childProcess.spawn = (comando, opciones) => {
  const hijo = new EventEmitter();
  const bin = comando.split(' ')[0];
  setTimeout(() => {
    const nombre = NOMBRES[bin] || bin;
    const carpeta = path.basename(opciones.cwd);
    const linea = process.env.DEV_LAUNCHER_LANG === 'es'
      ? `(aqui empieza la sesion de ${nombre}, en ${carpeta})`
      : `(${nombre} session starts here, in ${carpeta})`;
    process.stdout.write(`\x1b[2m  ${linea}\x1b[0m\n`);
    setTimeout(() => hijo.emit('exit', 0, null), 300);
  }, 400);
  return hijo;
};
