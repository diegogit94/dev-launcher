'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { StringDecoder } = require('string_decoder');
const { spawn, spawnSync } = require('child_process');
const { t } = require('./i18n');

const out = process.stdout;
const usarColor = out.isTTY && !process.env.NO_COLOR;
const c = (code) => (s) => (usarColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
// Temas del menu: color de titulos (acento) y de la opcion seleccionada.
// Texto negro sobre el color, y azul/magenta en sus tonos brillantes: en unas terminales esos
// colores son oscuros y en otras pastel, y asi se leen bien en ambas (igual el rojo).
// El primero es el de por defecto: verde, como los ojos de la mascota.
const TEMAS = {
  verde: { acento: '32', seleccion: '30;42' },
  cian: { acento: '36', seleccion: '30;46' },
  azul: { acento: '94', seleccion: '30;104' },
  magenta: { acento: '95', seleccion: '30;105' },
  amarillo: { acento: '33', seleccion: '30;43' },
  rojo: { acento: '91', seleccion: '30;101' },
  sobrio: { acento: '1', seleccion: '7' },
};
const TEMA_POR_DEFECTO = 'verde';
let tema = TEMAS[TEMA_POR_DEFECTO];

const color = {
  cian: c('36'), verde: c('32'), amarillo: c('33'), rojo: c('31'), gris: c('90'), negrita: c('1'),
  acento: (s) => c(tema.acento)(s),
  seleccion: (s) => c(tema.seleccion)(s),
};

// Bits de color de la terminal: 24 (color real), 8 (256 colores), 4, o 1 si no hay color (NO_COLOR, pipe)
function profundidadColor() {
  if (!usarColor) return 1;
  return typeof out.getColorDepth === 'function' ? out.getColorDepth() : 8;
}

function aplicarTema(nombre) {
  tema = TEMAS[nombre] || TEMAS[TEMA_POR_DEFECTO];
}

// Cuanto se espera despues de Esc para saber si era Esc o el comienzo de una flecha (Node usa 500 ms:
// con eso Esc se siente lento, y una tecla presionada justo despues se une al Esc y lo anula)
const ESPERA_ESC = 100;

// Mouse en los menus: 'abre' (un clic abre la opcion), 'selecciona' (un clic marca, doble clic abre)
// o 'no'. La rueda mueve la seleccion y el clic derecho vuelve como Esc (salvo clicDerecho 'nada'). Se pide a la terminal que avise los clics (modo 1000) en
// formato SGR (1006: ESC [ < boton ; columna ; fila M) solo mientras hay un menu abierto.
const MODOS_RATON = ['abre', 'selecciona', 'no'];
const RATON_SI = '\x1b[?1000h\x1b[?1006h';
const RATON_NO = '\x1b[?1000l\x1b[?1006l';
const DOBLE_CLIC = 450; // ms
let modoRaton = 'abre';
let derechoVuelve = true;
let ratonEncendido = false;

function configurarRaton(modo, clicDerecho) {
  modoRaton = MODOS_RATON.includes(modo) ? modo : 'abre';
  derechoVuelve = clicDerecho !== 'nada';
}

function ratonApagado() {
  if (ratonEncendido) out.write(RATON_NO);
  ratonEncendido = false;
}

// Convierte lo que llega por stdin (modo raw) en eventos: { tecla, texto? }, { raton: { boton, x, y, suelta } }
// o { cursor: fila }. Reemplaza al lector de readline, que no entiende el mouse: convertiria cada clic
// en letras para el filtro.
const TECLAS_CSI = { A: 'up', B: 'down', C: 'right', D: 'left', H: 'home', F: 'end' };
const TECLAS_TILDE = { 1: 'home', 7: 'home', 4: 'end', 8: 'end', 5: 'pageup', 6: 'pagedown', 3: 'delete' };

function lectorDeTeclas(alEvento) {
  const decodificador = new StringDecoder('utf8');
  let pendiente = '';
  let reloj = null;

  const procesar = (final) => {
    while (pendiente) {
      const s = pendiente;
      if (s[0] !== '\x1b') {
        const ch = String.fromCodePoint(s.codePointAt(0));
        pendiente = s.slice(s.startsWith('\r\n') ? 2 : ch.length);
        if (ch === '\r' || ch === '\n') alEvento({ tecla: 'enter' });
        else if (ch === '\t') alEvento({ tecla: 'tab' });
        else if (ch === '\x7f' || ch === '\b') alEvento({ tecla: 'backspace' });
        else if (ch === '\x03') alEvento({ tecla: 'ctrl-c' });
        else if (ch >= ' ') alEvento({ tecla: 'texto', texto: ch });
        continue;
      }
      let m;
      if ((m = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(s))) {
        alEvento({ raton: { boton: Number(m[1]), x: Number(m[2]), y: Number(m[3]), suelta: m[4] === 'm' } });
      } else if ((m = /^\x1b\[(\d+);(\d+)R/.exec(s))) {
        alEvento({ cursor: Number(m[1]) });
      } else if ((m = /^\x1b\[([\d;]*)([A-Za-z~])/.exec(s))) {
        const nombre = m[2] === '~' ? TECLAS_TILDE[m[1].split(';')[0]] : TECLAS_CSI[m[2]];
        if (nombre) alEvento({ tecla: nombre });
      } else if ((m = /^\x1bO([A-Za-z])/.exec(s))) {
        if (TECLAS_CSI[m[1]]) alEvento({ tecla: TECLAS_CSI[m[1]] });
      } else if (/^\x1b(\[[\d;<]*|O)?$/.test(s)) {
        // secuencia sin terminar: se espera el resto; si no llega, era Esc solo (o se descarta)
        if (!final) return;
        if (s === '\x1b') alEvento({ tecla: 'escape' });
        pendiente = '';
        return;
      } else {
        m = [s.slice(0, 2)]; // Alt + tecla u otra secuencia: se ignora
      }
      pendiente = s.slice(m[0].length);
    }
  };

  const alLlegar = (datos) => {
    clearTimeout(reloj);
    pendiente += decodificador.write(datos);
    procesar(false);
    if (pendiente) reloj = setTimeout(() => procesar(true), ESPERA_ESC);
  };
  alLlegar.parar = () => clearTimeout(reloj);
  return alLlegar;
}

// El teclado queda en modo raw (tecla por tecla) mientras dev muestra menus: no se sale entre un
// menu y otro. stdin.pause() deja de leer recien en el siguiente tick, y cambiar de modo mientras
// se lee hace que Node arranque una lectura por lineas; en Windows esa lectura a veces no se
// cancela y el menu siguiente deja de recibir teclas. soltarTeclado() se llama antes de darle la
// terminal a otro programa (el agente, npm) y al salir.
let tecladoTomado = false;

function soltarTeclado() {
  ratonApagado();
  if (!tecladoTomado) return;
  tecladoTomado = false;
  try { process.stdin.setRawMode(false); } catch (e) { /* ignorar */ }
}
process.on('exit', soltarTeclado);

const HIDE = '\x1b[?25l';
const SHOW = '\x1b[?25h';

// Ancho visible de un texto, sin contar los codigos de color
function anchoVisible(s) {
  return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').length;
}

// Ancho de la columna de opciones: las descripciones (hint) quedan alineadas
function medidas(lista, cols) {
  const anchoLabel = Math.max(0, ...lista.filter((it) => it.hint).map((it) => it.label.length));
  const anchoSinHint = Math.max(0, ...lista.filter((it) => !it.hint).map((it) => it.label.length));
  const anchoHint = Math.max(0, ...lista.map((it) => (it.hint ? it.hint.length + 2 : 0)));
  return { anchoLabel, ancho: Math.min(cols, Math.max(40, anchoLabel + anchoHint + 6, anchoSinHint + 6)) };
}

function cortar(s, max) {
  return s.length > max ? s.slice(0, Math.max(0, max - 1)) + '…' : s;
}

/**
 * Menu interactivo con flechas y filtro por texto.
 * items: [{ label, value, hint?, claves? }]
 *   claves: palabras con las que el filtro encuentra el item en vez de buscar en el label
 *           (desde 3 letras, para que no aparezca al filtrar por una letra suelta)
 *   fijo: el item queda siempre a la vista debajo de la lista, aunque esta se desplace
 * alMover(item): se llama cada vez que cambia el item seleccionado (para vistas previas)
 * panel: dibujo opcional (la mascota) en dos formas, { derecha, arriba }, cada una { lineas, ancho },
 *        y preferencia: 'auto' | 'arriba' | 'derecha'. Si no cabe donde se prefiere, va en el otro
 *        lado; si no cabe en ninguno, no se muestra. Se decide en cada redibujo (por si cambia el tamano).
 * tab: value que se devuelve al presionar Tab (un atajo; sin el, Tab no hace nada)
 * Con el mouse (ver configurarRaton): clic en una opcion y rueda para moverse.
 * Devuelve el value elegido, o null si se cancela con Esc.
 */
function menu({ titulo, items, inicial = 0, filtro = '', filtrable = true, ayuda, alMover, panel, tab }) {
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
    let mapa = []; // por cada linea dibujada, el indice del item que muestra (o -1)
    let anchoFilas = 0; // hasta que columna se puede hacer clic en una opcion
    let filaInicio = 0; // fila de la pantalla donde empieza el menu (1 = arriba), 0 si no se sabe
    let ultimoClic = { i: -1, cuando: 0 };
    // un doble clic en el menu anterior no debe abrir tambien algo en este: se ignoran los clics
    // que llegan apenas se abre
    const abierto = Date.now();
    const conRaton = modoRaton !== 'no';

    // los items fijos van siempre al final, despues de los que se desplazan
    const filtrados = () => {
      const q = query.toLowerCase();
      const r = !q ? items : items.filter((it) => (it.claves
        ? q.length >= 3 && it.claves.some((k) => k.startsWith(q))
        : it.label.toLowerCase().includes(q)));
      return [...r.filter((it) => !it.fijo), ...r.filter((it) => it.fijo)];
    };

    const dibujar = () => {
      const cols = Math.max(20, (out.columns || 80) - 1);
      const filas = out.rows || 24;
      const lista = filtrados();
      if (sel >= lista.length) sel = Math.max(0, lista.length - 1);
      const tituloCortado = cortar(titulo, cols);

      // donde va el panel. Automatico: arriba si la lista entera cabe debajo; si no, a la derecha
      // si hay ancho; si no, arriba con al menos 5 opciones a la vista. Se mide con todos los items
      // (no los filtrados), asi el panel no salta de lugar mientras se escribe.
      let lado = null;
      let columnaPanel = 0;
      if (panel) {
        const debajo = filas - panel.arriba.lineas.length - 1 - 5;
        columnaPanel = medidas(items, cols).ancho + 3;
        const cabeArriba = panel.arriba.ancho <= cols;
        const arriba = cabeArriba && debajo >= 5 ? 'arriba' : null;
        const derecha = columnaPanel + panel.derecha.ancho <= cols && filas >= panel.derecha.lineas.length + 5 ? 'derecha' : null;
        if (panel.preferencia === 'arriba') lado = arriba || derecha;
        else if (panel.preferencia === 'derecha') lado = derecha || arriba;
        else lado = (cabeArriba && debajo >= items.length ? 'arriba' : null) || derecha || arriba;
      }
      // solo se desplazan los items normales; los fijos (y una linea que los separa si la lista
      // no cabe) ocupan sus filas siempre
      const nFijos = lista.filter((it) => it.fijo).length;
      const nNormales = lista.length - nFijos;
      let espacio = filas - 5 - nFijos - (lado === 'arriba' ? panel.arriba.lineas.length + 1 : 0);
      const separar = nFijos > 0 && nNormales > espacio;
      if (separar) espacio -= 1;
      const visibles = Math.max(3, Math.min(nNormales, espacio));
      if (sel < nNormales) {
        if (sel < offset) offset = sel;
        if (sel >= offset + visibles) offset = sel - visibles + 1;
      }
      if (offset > Math.max(0, nNormales - visibles)) offset = Math.max(0, nNormales - visibles);

      let lineas = [];
      const indices = [];
      const poner = (l, i = -1) => { lineas.push(l); indices.push(i); };
      poner(color.acento(tituloCortado));
      if (filtrable) {
        poner(query ? `  ${t('menu.buscar')}: ${color.negrita(query)}` : color.gris('  ' + t('menu.filtrar')));
      }
      if (lista.length === 0) {
        poner(color.amarillo('  ' + t('menu.sinResultados')));
      }
      const { anchoLabel, ancho } = medidas(lista, cols);
      const linea = (i) => {
        const it = lista[i];
        const marcador = i === sel ? '  > ' : '    ';
        const texto = marcador + (it.hint ? it.label.padEnd(anchoLabel) : it.label);
        const hint = it.hint ? '  ' + it.hint : '';
        if (i === sel) return color.seleccion(cortar(texto + hint, ancho).padEnd(ancho));
        return cortar(texto, ancho) + (hint && texto.length + hint.length <= ancho ? color.gris(hint) : '');
      };
      for (let i = offset; i < Math.min(nNormales, offset + visibles); i++) poner(linea(i), i);
      if (separar) poner(color.gris('    ' + '─'.repeat(Math.max(4, ancho - 4))));
      for (let i = nNormales; i < lista.length; i++) poner(linea(i), i);
      anchoFilas = ancho;
      if (lado === 'derecha') {
        // el panel empieza debajo del titulo (que puede ser largo) y va al lado de la lista;
        // si la lista es corta, se completa con lineas vacias
        const dibujo = panel.derecha.lineas;
        while (lineas.length < dibujo.length + 1) poner('');
        lineas = lineas.map((l, i) => (i >= 1 && i <= dibujo.length
          ? l + ' '.repeat(Math.max(0, columnaPanel - anchoVisible(l))) + dibujo[i - 1]
          : l));
      } else if (lado === 'arriba') {
        lineas = [...panel.arriba.lineas, '', ...lineas];
        indices.unshift(...panel.arriba.lineas.map(() => -1), -1);
      }
      const arriba = offset > 0 ? `↑ ${t('menu.mas')}  ` : '';
      const abajo = offset + visibles < nNormales ? `↓ ${t('menu.mas')}  ` : '';
      poner(color.gris(cortar(arriba + abajo + (ayuda || t('ayuda.salir')), cols)));

      let buf = '';
      if (lineasPrevias > 0) buf += `\x1b[${lineasPrevias}A\r`;
      buf += '\x1b[J' + lineas.join('\n') + '\n';
      // con el mouse, se pregunta donde quedo el cursor para saber en que fila empieza el menu
      if (conRaton) buf += '\x1b[6n';
      out.write(buf);
      lineasPrevias = lineas.length;
      mapa = indices;
    };

    const terminar = (valor) => {
      stdin.removeListener('data', lector);
      lector.parar();
      out.removeListener('resize', dibujar);
      ratonApagado();
      stdin.pause(); // sigue en modo raw: ver soltarTeclado()
      // borra el menu de la pantalla para dejar la terminal limpia
      if (lineasPrevias > 0) out.write(`\x1b[${lineasPrevias}A\r\x1b[J`);
      out.write(SHOW);
      resolve(valor);
    };

    // clic: abre la opcion (o la marca, y con doble clic la abre); rueda: mueve la seleccion;
    // clic derecho: vuelve, como Esc
    const alRaton = ({ boton, x, y, suelta }) => {
      const lista = filtrados();
      if (boton & 64) return (boton & 1) ? Math.min(lista.length - 1, sel + 1) : Math.max(0, sel - 1);
      if ((boton & 3) === 2 && !suelta && !(boton & 32)) return derechoVuelve ? { volver: true } : sel;
      if (suelta || (boton & 3) !== 0 || (boton & 32) || !filaInicio || x > anchoFilas) return sel;
      if (Date.now() - abierto < DOBLE_CLIC) return sel;
      const i = mapa[y - filaInicio];
      if (i === undefined || i < 0 || !lista[i]) return sel;
      const doble = ultimoClic.i === i && Date.now() - ultimoClic.cuando < DOBLE_CLIC;
      ultimoClic = { i, cuando: Date.now() };
      if (modoRaton === 'abre' || doble) return { abrir: lista[i].value };
      return i;
    };

    const alEvento = (ev) => {
      if (ev.cursor) {
        filaInicio = ev.cursor - lineasPrevias;
        return;
      }
      const lista = filtrados();
      const antes = lista[sel];
      if (ev.raton) {
        const r = alRaton(ev.raton);
        if (r && r.abrir !== undefined) return terminar(r.abrir);
        if (r && r.volver) {
          ev = { tecla: 'escape' };
        } else {
          if (r === sel) return;
          sel = r;
        }
      }
      if (ev.tecla === 'ctrl-c') {
        terminar(null);
        process.exit(130);
      }
      if (ev.tecla === 'tab' && tab !== undefined) return terminar(tab);
      switch (ev.tecla) {
        case 'up': sel = lista.length ? (sel - 1 + lista.length) % lista.length : 0; break;
        case 'down': sel = lista.length ? (sel + 1) % lista.length : 0; break;
        case 'pageup': sel = Math.max(0, sel - 10); break;
        case 'pagedown': sel = Math.min(lista.length - 1, sel + 10); break;
        case 'home': sel = 0; break;
        case 'end': sel = Math.max(0, lista.length - 1); break;
        case 'enter':
          if (lista.length) return terminar(lista[sel].value);
          break;
        case 'escape':
          if (query) { query = ''; sel = 0; break; }
          return terminar(null);
        case 'backspace':
          if (filtrable && query) { query = query.slice(0, -1); sel = 0; }
          break;
        case 'texto':
          if (filtrable) {
            query += ev.texto;
            sel = 0;
          }
          break;
        default:
      }
      const ahora = filtrados()[sel];
      if (alMover && ahora && ahora !== antes) alMover(ahora);
      dibujar();
    };

    const lector = lectorDeTeclas(alEvento);
    // preguntar() (readline) sale del modo raw al cerrar, asi que se revisa en cada menu
    if (!tecladoTomado || !stdin.isRaw) stdin.setRawMode(true);
    tecladoTomado = true;
    stdin.on('data', lector);
    stdin.resume();
    out.on('resize', dibujar);
    out.write(HIDE);
    if (conRaton) {
      out.write(RATON_SI);
      ratonEncendido = true;
    }
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
      escapeCodeTimeout: ESPERA_ESC,
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

// Abre una URL en el navegador del sistema. Devuelve false si no se pudo lanzar.
function abrirEnNavegador(url) {
  const [cmd, args] = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '""', `"${url}"`]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url]];
  try {
    const hijo = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsVerbatimArguments: true });
    hijo.on('error', () => {});
    hijo.unref();
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { color, TEMAS, TEMA_POR_DEFECTO, aplicarTema, soltarTeclado, configurarRaton, MODOS_RATON, profundidadColor, menu, preguntar, selectorCarpetaNativo, abrirEnNavegador };
