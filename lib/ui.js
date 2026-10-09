'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const out = process.stdout;
const usarColor = out.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (usarColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
// Temas del menu: color de titulos (acento) y de la opcion seleccionada.
// Texto negro sobre el color, y azul/magenta en sus tonos brillantes: en unas terminales esos
// colores son oscuros y en otras pastel, y asi se leen bien en ambas.
const TEMAS = {
  cian: { nombre: 'Cian', acento: '36', seleccion: '30;46' },
  verde: { nombre: 'Verde', acento: '32', seleccion: '30;42' },
  azul: { nombre: 'Azul', acento: '94', seleccion: '30;104' },
  magenta: { nombre: 'Magenta', acento: '95', seleccion: '30;105' },
  amarillo: { nombre: 'Amarillo', acento: '33', seleccion: '30;43' },
  sobrio: { nombre: 'Sobrio', acento: '1', seleccion: '7' },
};
let tema = TEMAS.cian;

const color = {
  cian: c('36'), verde: c('32'), amarillo: c('33'), rojo: c('31'), gris: c('90'), negrita: c('1'),
  acento: (s) => c(tema.acento)(s),
  seleccion: (s) => c(tema.seleccion)(s),
};

function aplicarTema(nombre) {
  tema = TEMAS[nombre] || TEMAS.cian;
}

const HIDE = '\x1b[?25l';
const SHOW = '\x1b[?25h';

function cortar(s, max) {
  return s.length > max ? s.slice(0, Math.max(0, max - 1)) + '…' : s;
}

/**
 * Menu interactivo con flechas y filtro por texto.
 * items: [{ label, value, hint?, claves? }]
 *   claves: palabras con las que el filtro encuentra el item en vez de buscar en el label
 *           (desde 3 letras, para que no aparezca al filtrar por una letra suelta)
 * alMover(item): se llama cada vez que cambia el item seleccionado (para vistas previas)
 * Devuelve el value elegido, o null si se cancela con Esc.
 */
function menu({ titulo, items, inicial = 0, filtro = '', filtrable = true, ayuda, alMover }) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      resolve(null);
      return;
    }

    let query = filtro;
    let sel = Math.min(Math.max(0, inicial), items.length - 1);
    let offset = 0;
    let lineasPrevias = 0;

    const filtrados = () => {
      const q = query.toLowerCase();
      if (!q) return items;
      return items.filter((it) => (it.claves
        ? q.length >= 3 && it.claves.some((k) => k.startsWith(q))
        : it.label.toLowerCase().includes(q)));
    };

    const dibujar = () => {
      const cols = Math.max(20, (out.columns || 80) - 1);
      const filas = out.rows || 24;
      const lista = filtrados();
      if (sel >= lista.length) sel = Math.max(0, lista.length - 1);
      const visibles = Math.max(3, Math.min(lista.length, filas - 5));
      if (sel < offset) offset = sel;
      if (sel >= offset + visibles) offset = sel - visibles + 1;
      if (offset > Math.max(0, lista.length - visibles)) offset = Math.max(0, lista.length - visibles);

      const lineas = [];
      lineas.push(color.acento(cortar(titulo, cols)));
      if (filtrable) {
        lineas.push(query ? `  Buscar: ${color.negrita(query)}` : color.gris('  Escribe para filtrar'));
      }
      if (lista.length === 0) {
        lineas.push(color.amarillo('  (sin resultados)'));
      }
      // las descripciones (hint) quedan alineadas en una columna
      const anchoLabel = Math.max(0, ...lista.filter((it) => it.hint).map((it) => it.label.length));
      const anchoSinHint = Math.max(0, ...lista.filter((it) => !it.hint).map((it) => it.label.length));
      const anchoHint = Math.max(0, ...lista.map((it) => (it.hint ? it.hint.length + 2 : 0)));
      const ancho = Math.min(cols, Math.max(40, anchoLabel + anchoHint + 6, anchoSinHint + 6));
      for (let i = offset; i < Math.min(lista.length, offset + visibles); i++) {
        const it = lista[i];
        const marcador = i === sel ? '  > ' : '    ';
        const texto = marcador + (it.hint ? it.label.padEnd(anchoLabel) : it.label);
        const hint = it.hint ? '  ' + it.hint : '';
        if (i === sel) {
          lineas.push(color.seleccion(cortar(texto + hint, ancho).padEnd(ancho)));
        } else {
          lineas.push(cortar(texto, ancho) + (hint && texto.length + hint.length <= ancho ? color.gris(hint) : ''));
        }
      }
      const arriba = offset > 0 ? '↑ más  ' : '';
      const abajo = offset + visibles < lista.length ? '↓ más  ' : '';
      lineas.push(color.gris(cortar(arriba + abajo + (ayuda || 'Flechas: mover · Enter: abrir · Esc: salir'), cols)));

      let buf = '';
      if (lineasPrevias > 0) buf += `\x1b[${lineasPrevias}A\r`;
      buf += '\x1b[J' + lineas.join('\n') + '\n';
      out.write(buf);
      lineasPrevias = lineas.length;
    };

    const terminar = (valor) => {
      stdin.removeListener('keypress', alPresionar);
      out.removeListener('resize', dibujar);
      try { stdin.setRawMode(false); } catch (e) { /* ignorar */ }
      stdin.pause();
      // borra el menu de la pantalla para dejar la terminal limpia
      if (lineasPrevias > 0) out.write(`\x1b[${lineasPrevias}A\r\x1b[J`);
      out.write(SHOW);
      resolve(valor);
    };

    const alPresionar = (str, key) => {
      key = key || {};
      const lista = filtrados();
      const antes = lista[sel];
      if (key.ctrl && key.name === 'c') {
        terminar(null);
        process.exit(130);
      }
      switch (key.name) {
        case 'up': sel = lista.length ? (sel - 1 + lista.length) % lista.length : 0; break;
        case 'down': sel = lista.length ? (sel + 1) % lista.length : 0; break;
        case 'pageup': sel = Math.max(0, sel - 10); break;
        case 'pagedown': sel = Math.min(lista.length - 1, sel + 10); break;
        case 'home': sel = 0; break;
        case 'end': sel = Math.max(0, lista.length - 1); break;
        case 'return':
        case 'enter':
          if (lista.length) return terminar(lista[sel].value);
          break;
        case 'escape':
          if (query) { query = ''; sel = 0; break; }
          return terminar(null);
        case 'backspace':
          if (filtrable && query) { query = query.slice(0, -1); sel = 0; }
          break;
        default:
          if (filtrable && str && str.length === 1 && str >= ' ' && !key.ctrl && !key.meta) {
            query += str;
            sel = 0;
          }
      }
      const ahora = filtrados()[sel];
      if (alMover && ahora && ahora !== antes) alMover(ahora);
      dibujar();
    };

    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('keypress', alPresionar);
    out.on('resize', dibujar);
    out.write(HIDE);
    dibujar();
  });
}

// Autocompletado de rutas (solo carpetas) para escribir la ruta con Tab
function completarRuta(linea) {
  try {
    let texto = linea.replace(/^["']/, '');
    let expandido = texto;
    if (expandido === '~' || expandido.startsWith('~/') || expandido.startsWith('~\\')) {
      expandido = os.homedir() + expandido.slice(1);
    }
    const termina = /[\\/]$/.test(expandido);
    const dir = termina ? expandido : path.dirname(expandido);
    const base = termina ? '' : path.basename(expandido);
    const sep = process.platform === 'win32' && !texto.includes('/') ? '\\' : '/';
    const prefijoTexto = termina ? texto : texto.slice(0, texto.length - base.length);
    const opciones = fs.readdirSync(dir || '.', { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.toLowerCase().startsWith(base.toLowerCase()))
      .map((d) => prefijoTexto + d.name + sep);
    return [opciones, linea];
  } catch (e) {
    return [[], linea];
  }
}

function preguntar(texto, { completarCarpetas = false, porDefecto = '' } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: out,
      terminal: !!process.stdin.isTTY,
      completer: completarCarpetas ? completarRuta : undefined,
    });
    rl.on('SIGINT', () => { rl.close(); out.write('\n'); process.exit(130); });
    rl.question(texto, (resp) => {
      rl.close();
      resp = resp.trim();
      resolve(resp || porDefecto);
    });
  });
}

// Abre el selector de carpetas nativo del sistema si existe
function selectorCarpetaNativo(titulo) {
  const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  try {
    let r;
    if (process.platform === 'win32') {
      const ps = `$f = (New-Object -ComObject Shell.Application).BrowseForFolder(0, '${titulo.replace(/'/g, "''")}', 0x51, 0); if ($f) { $f.Self.Path }`;
      r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], opts);
    } else if (process.platform === 'darwin') {
      r = spawnSync('osascript', ['-e', `POSIX path of (choose folder with prompt "${titulo.replace(/"/g, '')}")`], opts);
    } else {
      r = spawnSync('zenity', ['--file-selection', '--directory', `--title=${titulo}`], opts);
      if (r.error || r.status !== 0) {
        r = spawnSync('kdialog', ['--getexistingdirectory', os.homedir(), '--title', titulo], opts);
      }
    }
    if (r && !r.error && r.status === 0 && r.stdout && r.stdout.trim()) {
      return r.stdout.trim().replace(/[\\/]$/, '') || r.stdout.trim();
    }
  } catch (e) { /* sin selector grafico */ }
  return null;
}

module.exports = { color, TEMAS, aplicarTema, menu, preguntar, selectorCarpetaNativo };
