'use strict';

// Configuracion: asistente de la primera vez y menu de configuracion
// (se abre desde el menu de proyectos o con "dev --config").

const { MODOS, todosLosAgentes } = require('./agents');
const cfg = require('./config');
const { color, TEMAS, aplicarTema, menu, preguntar, selectorCarpetaNativo, abrirEnNavegador } = require('./ui');
const { t, fijarIdioma, detectarIdioma, idiomaActual, IDIOMAS, NOMBRES } = require('./i18n');
const act = require('./actualizar');
const pkg = require('../package.json');

const ORDENES = ['alfabetico', 'recientes'];

function etiquetaAgente(id, ag) {
  const instalado = cfg.existeComando(ag.bin);
  return {
    label: `${ag.nombre} (${id})`,
    value: id,
    hint: instalado ? t('agente.instalado') : t('agente.noEncontrado'),
    instalado,
  };
}

function textoModo(modo) {
  return !modo || modo === 'preguntar' ? t('modo.preguntarCada') : t('modo.siempre', { modo: t(MODOS[modo]).toLowerCase() });
}

function guardar(config) {
  if (config.agentesPersonalizados && Object.keys(config.agentesPersonalizados).length === 0) {
    delete config.agentesPersonalizados;
  }
  cfg.guardarConfig(config);
}

// Pide una carpeta: ruta escrita (Tab autocompleta) o, con Enter, el selector del sistema.
// Si no es obligatoria, devuelve null cuando se cancela el selector.
async function pedirCarpeta({ obligatoria }) {
  console.log(color.gris(t('carpeta.ayuda')));
  for (;;) {
    let resp = await preguntar(t('carpeta.ruta'), { completarCarpetas: true });
    if (!resp) {
      resp = selectorCarpetaNativo(t('carpeta.selector'));
      if (!resp) {
        if (!obligatoria) return null;
        console.log(color.amarillo(t('carpeta.selectorFallo')));
        continue;
      }
    }
    const ruta = cfg.expandirRuta(resp);
    if (cfg.esCarpeta(ruta)) return ruta;
    console.log(color.amarillo(t('carpeta.noExiste', { ruta })));
  }
}

// Crea un agente personalizado, o edita uno si se pasa "previo" ({ id, agente })
async function pedirAgente(agentes, previo) {
  const p = previo ? previo.agente : {};
  console.log(color.acento(previo ? t('propio.editar', { nombre: p.nombre }) : t('propio.titulo')));
  console.log(color.gris(t('propio.instrucciones')));
  if (previo) console.log(color.gris(t('propio.mantener')));
  const leer = async (texto, actual, obligatorio) => {
    const sufijo = actual ? color.gris(` [${actual}]`) : '';
    for (;;) {
      const r = await preguntar(`${texto}${sufijo}: `);
      if (r === '-' && !obligatorio) return null;
      const v = r || actual || '';
      if (v || !obligatorio) return v || null;
    }
  };
  const omitir = previo ? '' : t('propio.omitir');
  const nombre = await leer(t('propio.nombre'), p.nombre, true);
  const nueva = await leer(t('propio.nueva'), p.nueva, true);
  const continuar = await leer(t('propio.continuar') + omitir, p.continuar, false);
  const elegir = await leer(t('propio.elegir') + omitir, p.elegir, false);

  let id = previo && previo.id;
  if (!id) {
    const base = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'personalizado';
    id = base;
    for (let n = 2; agentes[id]; n++) id = `${base}-${n}`; // no pisar un agente que ya existe
  }
  return {
    id,
    agente: Object.assign({}, p, { nombre, bin: nueva.split(/\s+/)[0], nueva, continuar, elegir }),
  };
}

// Cambia el agente por defecto. Los proyectos que ya usaban ese agente como propio
// dejan de necesitarlo.
function fijarAgentePorDefecto(config, id) {
  config.agente = id;
  const propios = Object.entries(config.ultimoAgente || {}).filter(([, a]) => a !== id);
  if (propios.length) config.ultimoAgente = Object.fromEntries(propios);
  else delete config.ultimoAgente;
}

// Asistente de la primera vez: carpeta, agente y modo
async function configuracionInicial(actual) {
  const config = Object.assign({}, actual);
  console.log(color.acento(color.negrita(t('inicial.titulo'))));

  // 1. Carpeta de proyectos
  console.log(t('inicial.paso1'));
  const root = await pedirCarpeta({ obligatoria: true });
  const n = cfg.listarProyectos(root).length;
  console.log(color.verde(`   ✓ ${cfg.rutaCorta(root)} (${t('n.proyectos', { n })})`));
  console.log(color.gris(t('inicial.masCarpetas')));
  config.carpetas = [root];

  // 2. Agente
  config.agentesPersonalizados = config.agentesPersonalizados || {};
  const agentes = todosLosAgentes(config);
  const items = Object.entries(agentes).map(([id, ag]) => etiquetaAgente(id, ag));
  items.push({ label: t('inicial.otro'), value: '__nuevo__' });
  let inicial = items.findIndex((it) => it.value === config.agente);
  if (inicial < 0) inicial = Math.max(0, items.findIndex((it) => it.instalado));
  let agenteId = await menu({ titulo: t('inicial.paso2'), items, inicial, filtrable: false, ayuda: t('ayuda.elegir') });
  if (!agenteId) agenteId = config.agente || 'claude';
  if (agenteId === '__nuevo__') {
    const { id, agente } = await pedirAgente(agentes);
    config.agentesPersonalizados[id] = agente;
    agenteId = id;
  }
  const agente = todosLosAgentes(config)[agenteId];
  console.log(color.verde(t('inicial.agenteOk', { nombre: agente.nombre })));
  if (!cfg.existeComando(agente.bin)) {
    console.log(color.amarillo(t('inicial.avisoAgente', { bin: agente.bin })));
  }
  fijarAgentePorDefecto(config, agenteId);

  // 3. Modo por defecto
  const modo = await elegirModoPorDefecto(config, t('inicial.paso3'));
  config.modo = modo || 'preguntar';
  console.log(color.verde(t('inicial.modoOk', { modo: textoModo(config.modo) })));

  guardar(config);
  console.log(color.verde(color.negrita(t('inicial.listo'))) + t('inicial.escribe', { dev: color.negrita('dev') }));
  console.log(color.gris(t('inicial.guardada', { ruta: cfg.CONFIG_PATH })));
  return config;
}

async function elegirModoPorDefecto(config, titulo) {
  const agente = todosLosAgentes(config)[config.agente];
  const modos = ['preguntar', ...Object.keys(MODOS).filter((m) => agente[m])];
  const items = modos.map((m) => (m === 'preguntar'
    ? { label: t('modoDef.preguntar'), value: m, hint: t('modoDef.recomendado') }
    : { label: t('modoDef.siempre', { modo: t(MODOS[m]).toLowerCase() }), value: m, hint: agente[m] }));
  return menu({ titulo, items, inicial: Math.max(0, modos.indexOf(config.modo)), filtrable: false, ayuda: t('ayuda.volver') });
}

// ---- Menu de configuracion ----

function textoIdioma(config) {
  return IDIOMAS.includes(config.idioma) ? NOMBRES[config.idioma] : t('idioma.auto', { actual: NOMBRES[detectarIdioma()] });
}

async function menuConfiguracion(config) {
  let aviso = '';
  let inicial = 0;
  for (;;) {
    const agentes = todosLosAgentes(config);
    const propios = Object.keys(config.agentesPersonalizados || {}).length;
    const items = [
      { label: t('config.carpetas'), value: 'carpetas', hint: t('n.vinculadas', { n: config.carpetas.length }) },
      { label: t('config.agente'), value: 'agente', hint: agentes[config.agente].nombre },
      { label: t('config.modo'), value: 'modo', hint: textoModo(config.modo) },
      { label: t('config.color'), value: 'color', hint: t('tema.' + (TEMAS[config.color] ? config.color : 'cian')) },
      { label: t('config.orden'), value: 'orden', hint: t('orden.' + (config.orden || 'alfabetico')) },
      { label: t('config.idioma'), value: 'idioma', hint: textoIdioma(config) },
      { label: t('config.mascota'), value: 'mascota', hint: textoMascota(config) },
      { label: t('config.propios'), value: 'propios', hint: propios ? String(propios) : t('config.ninguno') },
      { label: t('config.actualizar'), value: 'actualizar', hint: textoVersion(config) },
      { label: t('config.apoyar'), value: 'apoyar', hint: t('config.apoyarHint') },
      { label: t('config.volver'), value: 'volver' },
    ];
    const opcion = await menu({
      titulo: `${t('config.titulo')}  ${color.gris(cfg.rutaCorta(cfg.CONFIG_PATH))}${aviso}`,
      items,
      inicial,
      filtrable: false,
      ayuda: t('ayuda.volver'),
    });
    if (!opcion || opcion === 'volver') return;
    inicial = items.findIndex((it) => it.value === opcion);
    const acciones = {
      carpetas: menuCarpetas, agente: menuAgentePorDefecto, modo: menuModo, color: menuColor, orden: menuOrden,
      idioma: menuIdioma, mascota: alternarMascota, propios: menuPropios, actualizar: menuActualizar, apoyar: menuApoyar,
    };
    const msg = await acciones[opcion](config);
    aviso = msg ? '  ' + msg : '';
  }
}

async function menuCarpetas(config) {
  let aviso = '';
  let cambios = '';
  for (;;) {
    const items = config.carpetas.map((c) => {
      const existe = cfg.esCarpeta(c);
      const detalle = existe ? t('n.proyectos', { n: cfg.listarProyectos(c).length }) : t('carpetas.noExiste');
      return { label: cfg.nombreCarpeta(c, config.carpetas), value: c, hint: `${cfg.rutaCorta(c)} · ${detalle}` };
    });
    items.push({ label: t('carpetas.vincular'), value: '__nueva__' });
    const elegida = await menu({ titulo: `${t('config.carpetas')}${aviso}`, items, filtrable: false, ayuda: t('ayuda.volver') });
    if (!elegida) return cambios;

    if (elegida === '__nueva__') {
      console.log(color.acento(t('carpetas.vincularTitulo')));
      const ruta = await pedirCarpeta({ obligatoria: false });
      if (!ruta) {
        aviso = '';
      } else if (config.carpetas.some((c) => cfg.mismaRuta(c, ruta))) {
        aviso = '  ' + color.amarillo(t('carpetas.yaVinculada'));
      } else {
        config.carpetas.push(ruta);
        guardar(config);
        aviso = '  ' + color.verde(t('carpetas.vinculada', { ruta: cfg.rutaCorta(ruta) }));
        cambios = color.verde(t('carpetas.actualizadas'));
      }
      continue;
    }

    const nombre = cfg.nombreCarpeta(elegida, config.carpetas);
    const accion = await menu({
      titulo: `${nombre}  ${color.gris(cfg.rutaCorta(elegida))}`,
      items: [
        { label: t('carpetas.desvincular'), value: 'quitar', hint: t('carpetas.desvincularHint') },
        { label: t('volver'), value: 'volver' },
      ],
      filtrable: false,
      ayuda: t('ayuda.volver'),
    });
    if (accion !== 'quitar') { aviso = ''; continue; }
    if (config.carpetas.length === 1) {
      aviso = '  ' + color.amarillo(t('carpetas.unica'));
      continue;
    }
    config.carpetas = config.carpetas.filter((c) => c !== elegida);
    guardar(config);
    aviso = '  ' + color.verde(t('carpetas.desvinculada', { nombre }));
    cambios = color.verde(t('carpetas.actualizadas'));
  }
}

async function menuAgentePorDefecto(config) {
  const agentes = todosLosAgentes(config);
  const items = Object.entries(agentes).map(([id, ag]) => etiquetaAgente(id, ag));
  const id = await menu({
    titulo: t('agenteDef.titulo'),
    items,
    inicial: Math.max(0, items.findIndex((it) => it.value === config.agente)),
    filtrable: false,
    ayuda: t('ayuda.volver'),
  });
  if (!id || id === config.agente) return '';
  fijarAgentePorDefecto(config, id);
  guardar(config);
  const ag = agentes[id];
  return cfg.existeComando(ag.bin)
    ? color.verde(t('agenteDef.ok', { nombre: ag.nombre }))
    : color.amarillo(t('agenteDef.falta', { nombre: ag.nombre, bin: ag.bin }));
}

async function menuModo(config) {
  const modo = await elegirModoPorDefecto(config, t('modoDef.titulo'));
  if (!modo || modo === (config.modo || 'preguntar')) return '';
  config.modo = modo;
  guardar(config);
  return color.verde(t('modo.ok', { modo: textoModo(modo) }));
}

async function menuColor(config) {
  const actual = TEMAS[config.color] ? config.color : 'cian';
  const ids = Object.keys(TEMAS);
  const items = ids.map((id) => ({
    label: t('tema.' + id),
    value: id,
    hint: id === 'cian' ? t('color.porDefecto') : id === 'sobrio' ? t('color.sobrio') : undefined,
  }));
  const id = await menu({
    titulo: t('color.titulo'),
    items,
    inicial: ids.indexOf(actual),
    filtrable: false,
    ayuda: t('ayuda.color'),
    alMover: (it) => aplicarTema(it.value),
  });
  if (!id || id === actual) {
    aplicarTema(actual);
    return '';
  }
  config.color = id;
  aplicarTema(id);
  guardar(config);
  return color.verde(t('color.ok', { nombre: t('tema.' + id) }));
}

async function menuOrden(config) {
  const actual = config.orden || 'alfabetico';
  const id = await menu({
    titulo: t('config.orden'),
    items: ORDENES.map((o) => ({ label: t('orden.' + o), value: o, hint: t(`orden.${o}Hint`) })),
    inicial: ORDENES.indexOf(actual),
    filtrable: false,
    ayuda: t('ayuda.volver'),
  });
  if (!id || id === actual) return '';
  config.orden = id;
  guardar(config);
  return color.verde(t('orden.ok', { nombre: t('orden.' + id).toLowerCase() }));
}

// Idioma: automatico (el del sistema) o uno fijo. Se aplica al instante.
async function menuIdioma(config) {
  const actual = IDIOMAS.includes(config.idioma) ? config.idioma : 'auto';
  const ids = ['auto', ...IDIOMAS];
  const id = await menu({
    titulo: t('config.idioma'),
    items: ids.map((i) => (i === 'auto'
      ? { label: t('idioma.auto', { actual: NOMBRES[detectarIdioma()] }), value: i, hint: t('idioma.autoHint') }
      : { label: NOMBRES[i], value: i })),
    inicial: ids.indexOf(actual),
    filtrable: false,
    ayuda: t('ayuda.volver'),
  });
  if (!id || id === actual) return '';
  if (id === 'auto') delete config.idioma;
  else config.idioma = id;
  fijarIdioma(config.idioma);
  guardar(config);
  return color.verde(t('idioma.ok', { nombre: NOMBRES[idiomaActual()] }));
}

function textoMascota(config) {
  if (config.mascota === false) return t('mascota.oculta');
  return config.color === 'sobrio' ? `${t('mascota.visible')} (${t('mascota.sinColor')})` : t('mascota.visible');
}

// Muestra u oculta la mascota del menu de proyectos (se guarda solo "false"; visible es lo normal)
async function alternarMascota(config) {
  if (config.mascota === false) delete config.mascota;
  else config.mascota = false;
  guardar(config);
  return color.verde(t('mascota.ok', { estado: config.mascota === false ? t('mascota.oculta') : t('mascota.visible') }));
}

async function menuPropios(config) {
  let aviso = '';
  let cambios = '';
  for (;;) {
    const propios = config.agentesPersonalizados || {};
    const items = Object.entries(propios).map(([id, ag]) => ({ label: `${ag.nombre} (${id})`, value: id, hint: ag.nueva }));
    items.push({ label: t('propios.agregar'), value: '__nuevo__' });
    const elegido = await menu({ titulo: `${t('config.propios')}${aviso}`, items, filtrable: false, ayuda: t('ayuda.volver') });
    if (!elegido) return cambios;

    if (elegido === '__nuevo__') {
      const { id, agente } = await pedirAgente(todosLosAgentes(config));
      config.agentesPersonalizados = Object.assign({}, propios, { [id]: agente });
      guardar(config);
      aviso = '  ' + color.verde(t('propios.agregado', { nombre: agente.nombre }));
      cambios = color.verde(t('propios.actualizados'));
      continue;
    }

    const ag = propios[elegido];
    const accion = await menu({
      titulo: `${ag.nombre} (${elegido})`,
      items: [
        { label: t('propios.editar'), value: 'editar' },
        { label: t('propios.borrar'), value: 'borrar' },
        { label: t('volver'), value: 'volver' },
      ],
      filtrable: false,
      ayuda: t('ayuda.volver'),
    });
    if (accion === 'editar') {
      const { agente } = await pedirAgente(todosLosAgentes(config), { id: elegido, agente: ag });
      propios[elegido] = agente;
      guardar(config);
      aviso = '  ' + color.verde(t('propios.guardado', { nombre: agente.nombre }));
      cambios = color.verde(t('propios.actualizados'));
    } else if (accion === 'borrar') {
      if (elegido === config.agente) {
        aviso = '  ' + color.amarillo(t('propios.esDefecto'));
        continue;
      }
      delete propios[elegido];
      // los proyectos que lo usaban vuelven al agente por defecto
      const quedan = Object.entries(config.ultimoAgente || {}).filter(([, a]) => a !== elegido);
      if (quedan.length) config.ultimoAgente = Object.fromEntries(quedan);
      else delete config.ultimoAgente;
      guardar(config);
      aviso = '  ' + color.verde(t('propios.borrado', { nombre: ag.nombre }));
      cambios = color.verde(t('propios.actualizados'));
    } else {
      aviso = '';
    }
  }
}

function textoVersion(config) {
  const nueva = act.disponible(config);
  return nueva ? t('version.nueva', { v: act.ACTUAL, nueva }) : t('version.actual', { v: act.ACTUAL });
}

async function menuActualizar(config) {
  if (act.esCopiaLocal()) {
    return color.amarillo(t('act.copiaLocal'));
  }
  console.log(color.gris(t('act.buscando')));
  const ultima = await act.consultarUltima();
  if (!ultima) return color.amarillo(t('act.sinConexion', { cmd: act.COMANDO }));
  act.anotar(config, ultima);
  guardar(config);
  if (!act.esMasNueva(ultima, act.ACTUAL)) return color.verde(t('act.alDia', { v: act.ACTUAL }));

  const accion = await menu({
    titulo: `${t('act.hayNueva', { v: ultima })}  ${color.gris(t('act.tienes', { v: act.ACTUAL }))}`,
    items: [
      { label: t('act.ahora'), value: 'si', hint: act.COMANDO },
      { label: t('act.noAhora'), value: 'no' },
    ],
    filtrable: false,
    ayuda: t('ayuda.volver'),
  });
  if (accion !== 'si') return '';
  console.log(`${color.acento('›')} ${act.COMANDO}`);
  const codigo = await act.instalar();
  if (codigo === 0) {
    // el codigo que esta corriendo ya es el viejo: mejor salir y que se vuelva a abrir
    console.log(color.verde(t('act.listo', { v: ultima, dev: color.negrita('dev') })));
    process.exit(0);
  }
  console.log(color.rojo(t('act.fallo', { codigo })));
  console.log(color.gris(t('act.reintentar')));
  if (process.platform !== 'win32') console.log(color.gris(t('act.eacces')));
  return color.amarillo(t('act.manual', { cmd: act.COMANDO }));
}

// Formas de apoyar el proyecto: salen de "funding" en package.json
const DONACIONES = {
  github: { nombre: 'GitHub Sponsors', hint: 'apoyar.github' },
  'ko-fi': { nombre: 'Ko-fi', hint: 'apoyar.kofi' },
};

function formasDeApoyar() {
  return [].concat(pkg.funding || []).map((f) => (typeof f === 'string' ? { url: f } : f))
    .map((f) => {
      const d = DONACIONES[f.type];
      return { nombre: d ? d.nombre : f.url, hint: d ? t(d.hint) : '', url: f.url };
    });
}

// Elige como apoyar y abre la pagina; si no hay navegador, al menos muestra el enlace
async function menuApoyar() {
  const url = await menu({
    titulo: `${t('config.apoyar')}  ${color.gris(t('apoyar.subtitulo'))}`,
    items: formasDeApoyar().map((f) => ({ label: f.nombre, value: f.url, hint: f.hint })),
    filtrable: false,
    ayuda: t('ayuda.apoyar'),
  });
  if (!url) return '';
  return abrirEnNavegador(url)
    ? color.verde(t('apoyar.abriendo', { url }))
    : t('apoyar.enlace', { url });
}

module.exports = { etiquetaAgente, configuracionInicial, menuConfiguracion };
