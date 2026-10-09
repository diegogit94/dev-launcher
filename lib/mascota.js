'use strict';

// Mascota de dev: un tech-priest en pixel art (inspirado en Warhammer, sin simbolos oficiales).
// Se dibuja con medios bloques: cada caracter son 2 pixeles, ▀ con el color de texto arriba y el de
// fondo abajo (▄ si solo hay pixel abajo). Color de 24 bits, o la paleta de 256 si la terminal no da mas.

const { color, profundidadColor } = require('./ui');
const { t } = require('./i18n');

const PALETA = {
  R: [178, 34, 34], // tunica
  r: [120, 20, 24], // sombra de la tunica
  D: [22, 18, 20], // interior de la capucha
  G: [80, 255, 120], // ojos
  g: [30, 120, 60], // brillo de los ojos
  S: [150, 156, 166], // metal (rejilla, baston)
  s: [90, 95, 105], // metal oscuro
  Y: [212, 170, 60], // laton (engranaje del baston)
  y: [150, 110, 30], // laton oscuro
};

// 16 x 14 pixeles = 16 columnas x 7 filas. "." es transparente.
const SPRITE = [
  '..........yYy...',
  '......rr..Y.Y...',
  '.....rRRr.yYy...',
  '....rRRRRr.S....',
  '....RDDDDR.S....',
  '....RGDDGR.S....',
  '....RDggDR.S....',
  '...rRDSSDRrS....',
  '..rRRRssRRRSr...',
  '..RRRRRRRRRSR...',
  '..RRRRRrRRRSR...',
  '..rRRRRrRRRSr...',
  '..rRRRRRRRRSRr..',
  '.rrRRRRRRRRSRrr.',
];

const ANCHO = SPRITE[0].length;
const MIN_COLUMNAS = 60;
const MIN_FILAS = 20;

function codigo(rgb, fondo, profundidad) {
  if (profundidad >= 24) return `${fondo ? 48 : 38};2;${rgb.join(';')}`;
  // cubo de 6x6x6 de la paleta de 256 colores
  const [r, g, b] = rgb.map((v) => Math.round((v / 255) * 5));
  return `${fondo ? 48 : 38};5;${16 + 36 * r + 6 * g + b}`;
}

// Las 7 lineas del dibujo, cada una de ANCHO columnas visibles
function lineas(profundidad) {
  const pinta = (...c) => `\x1b[${c.join(';')}m`;
  const resultado = [];
  for (let y = 0; y < SPRITE.length; y += 2) {
    let linea = '';
    for (let x = 0; x < ANCHO; x++) {
      const a = PALETA[SPRITE[y][x]];
      const b = PALETA[(SPRITE[y + 1] || '')[x]];
      if (!a && !b) linea += '\x1b[0m ';
      else if (a && !b) linea += '\x1b[0m' + pinta(codigo(a, false, profundidad)) + '▀';
      else if (!a && b) linea += '\x1b[0m' + pinta(codigo(b, false, profundidad)) + '▄';
      else linea += pinta(codigo(a, false, profundidad), codigo(b, true, profundidad)) + '▀';
    }
    resultado.push(linea + '\x1b[0m');
  }
  return resultado;
}

// Muestra la mascota con el saludo a la derecha. Devuelve false si la terminal no da para dibujarla.
function mostrarMascota(version) {
  const out = process.stdout;
  const profundidad = profundidadColor();
  if (profundidad < 8 || (out.columns || 80) < MIN_COLUMNAS || (out.rows || 24) < MIN_FILAS) return false;
  const saludo = [];
  saludo[2] = `${color.negrita('dev-launcher')} ${color.gris(version)}`;
  saludo[3] = color.gris(t('mascota.saludo'));
  const dibujo = lineas(profundidad).map((l, i) => (saludo[i] ? `  ${l}   ${saludo[i]}` : `  ${l}`));
  out.write(dibujo.join('\n') + '\n\n');
  return true;
}

module.exports = { mostrarMascota };
