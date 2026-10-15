'use strict';

// Mascota de dev: un tech-priest en pixel art (inspirado en Warhammer, sin simbolos oficiales).
// Se dibuja con medios bloques: cada caracter son 2 pixeles, ▄ con el color de texto abajo y el de
// fondo arriba (▀ si solo hay pixel arriba). Color de 24 bits, o la paleta de 256 si la terminal no da mas.
// Va con ▄ y no con ▀ porque Terminal de macOS dibuja el bloque con la fuente y deja un hueco arriba de
// cada caracter, que se ve del color de fondo: con ▀ ese hueco salia del color de abajo (ojos de mas).

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
const ANCHO_TEXTO = 28; // ancho del saludo cuando va debajo del dibujo

// Paleta de 256 colores (sin los 16 primeros, que cada terminal pinta a su manera): el cubo de 6x6x6,
// cuyos niveles no son parejos (0, 95, 135... y no 0, 51, 102...), y la escala de grises
const NIVELES = [0, 95, 135, 175, 215, 255];
const PALETA_256 = [];
for (let i = 0; i < 216; i++) PALETA_256[16 + i] = [NIVELES[Math.floor(i / 36)], NIVELES[Math.floor(i / 6) % 6], NIVELES[i % 6]];
for (let i = 0; i < 24; i++) PALETA_256[232 + i] = [8 + 10 * i, 8 + 10 * i, 8 + 10 * i];

// El color de la paleta de 256 mas parecido (distancia con el peso de cada canal en el brillo)
function mas256(rgb) {
  let mejor = 16;
  let menor = Infinity;
  for (let n = 16; n < 256; n++) {
    const [r, g, b] = PALETA_256[n];
    const d = 3 * (r - rgb[0]) ** 2 + 4 * (g - rgb[1]) ** 2 + 2 * (b - rgb[2]) ** 2;
    if (d < menor) [mejor, menor] = [n, d];
  }
  return mejor;
}

function codigo(rgb, fondo, profundidad) {
  if (profundidad >= 24) return `${fondo ? 48 : 38};2;${rgb.join(';')}`;
  return `${fondo ? 48 : 38};5;${mas256(rgb)}`;
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
      else linea += pinta(codigo(b, false, profundidad), codigo(a, true, profundidad)) + '▄';
    }
    resultado.push(linea + '\x1b[0m');
  }
  return resultado;
}

// Parte el saludo en frases y cada frase en lineas de hasta "ancho" caracteres
function partir(texto, ancho) {
  const resultado = [];
  for (const frase of texto.split(/(?<=\.) /)) {
    let linea = '';
    for (const palabra of frase.split(' ')) {
      if (linea && linea.length + 1 + palabra.length > ancho) {
        resultado.push(linea);
        linea = palabra;
      } else {
        linea = linea ? `${linea} ${palabra}` : palabra;
      }
    }
    if (linea) resultado.push(linea);
  }
  return resultado;
}

// La mascota lista para menu({ panel }), en dos formas: "derecha" (al lado de la lista, con el saludo
// debajo del dibujo) y "arriba" (encima del menu, con el saludo a su derecha). El menu usa la que quepa.
// preferencia: 'auto' | 'arriba' | 'derecha' (ver menu() en ui.js).
// Devuelve null si la terminal no tiene al menos 256 colores.
function panelMascota(version, preferencia = 'auto') {
  const profundidad = profundidadColor();
  if (profundidad < 8) return null;
  const dibujo = lineas(profundidad);
  const nombre = `${color.negrita('dev-launcher')} ${color.gris(version)}`;
  const saludo = t('mascota.saludo');

  const frases = partir(saludo, ANCHO_TEXTO);
  const derecha = [...dibujo, '', nombre, ...frases.map((f) => color.gris(f))];
  const anchoDerecha = Math.max(ANCHO, `dev-launcher ${version}`.length, ...frases.map((f) => f.length));

  const alLado = [];
  alLado[2] = nombre;
  alLado[3] = color.gris(saludo);
  const arriba = dibujo.map((l, i) => (alLado[i] ? `  ${l}   ${alLado[i]}` : `  ${l}`));
  const anchoArriba = 2 + ANCHO + 3 + Math.max(`dev-launcher ${version}`.length, saludo.length);

  return {
    preferencia,
    derecha: { lineas: derecha, ancho: anchoDerecha },
    arriba: { lineas: arriba, ancho: anchoArriba },
  };
}

module.exports = { panelMascota };
