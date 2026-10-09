'use strict';

// Configuracion: asistente de la primera vez y menu de configuracion
// (se abre desde el menu de proyectos o con "dev --config").

const { MODOS, todosLosAgentes } = require('./agents');
const cfg = require('./config');
const { color, TEMAS, aplicarTema, menu, preguntar, selectorCarpetaNativo } = require('./ui');

const AYUDA = 'Flechas: mover · Enter: elegir · Esc: volver';
const ORDENES = {
  alfabetico: { nombre: 'Alfabetico', hint: 'de la A a la Z' },
  recientes: { nombre: 'Recientes primero', hint: 'los ultimos que abriste, arriba' },
};

function plural(n, palabra) {
  return `${n} ${palabra}${n === 1 ? '' : 's'}`;
}

function etiquetaAgente(id, ag) {
  const instalado = cfg.existeComando(ag.bin);
  return {
    label: `${ag.nombre} (${id})`,
    value: id,
    hint: instalado ? '✓ instalado' : 'no encontrado',
    instalado,
  };
}

function textoModo(modo) {
  return !modo || modo === 'preguntar' ? 'preguntar cada vez' : 'siempre: ' + MODOS[modo].toLowerCase();
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
  console.log(color.gris('   Escribe la ruta (Tab autocompleta) o presiona Enter para abrir el explorador.'));
  for (;;) {
    let resp = await preguntar('   Ruta: ', { completarCarpetas: true });
    if (!resp) {
      resp = selectorCarpetaNativo('Elige la carpeta donde guardas tus proyectos');
      if (!resp) {
        if (!obligatoria) return null;
        console.log(color.amarillo('   No se pudo abrir el explorador o se cancelo. Escribe la ruta.'));
        continue;
      }
    }
    const ruta = cfg.expandirRuta(resp);
    if (cfg.esCarpeta(ruta)) return ruta;
    console.log(color.amarillo(`   No existe la carpeta: ${ruta}`));
  }
}

// Crea un agente personalizado, o edita uno si se pasa "previo" ({ id, agente })
async function pedirAgente(agentes, previo) {
  const p = previo ? previo.agente : {};
  console.log(color.acento(previo ? `\nEditar ${p.nombre}` : '\nAgente personalizado'));
  console.log(color.gris('Escribe el comando completo que abre el agente en cada caso.'));
  if (previo) console.log(color.gris('Enter mantiene el valor actual; "-" quita un comando opcional.'));
  const leer = async (texto, actual, obligatorio) => {
    const sufijo = actual ? color.gris(` [${actual}]`) : '';
    for (;;) {
      const r = await preguntar(`${texto}${sufijo}: `);
      if (r === '-' && !obligatorio) return null;
      const v = r || actual || '';
      if (v || !obligatorio) return v || null;
    }
  };
  const omitir = previo ? '' : ' (Enter para omitir)';
  const nombre = await leer('Nombre (ej: Mi Agente)', p.nombre, true);
  const nueva = await leer('Comando para conversacion nueva (obligatorio, ej: miagente)', p.nueva, true);
  const continuar = await leer('Comando para continuar la ultima' + omitir, p.continuar, false);
  const elegir = await leer('Comando para elegir una anterior' + omitir, p.elegir, false);

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
  console.log(color.acento(color.negrita('\n=== Configuracion de dev ===\n')));

  // 1. Carpeta de proyectos
  console.log('1) Carpeta donde guardas tus proyectos');
  const root = await pedirCarpeta({ obligatoria: true });
  const n = cfg.listarProyectos(root).length;
  console.log(color.verde(`   ✓ ${cfg.rutaCorta(root)} (${plural(n, 'proyecto')})`));
  console.log(color.gris('   Puedes vincular mas carpetas despues, desde "Configuracion" en el menu.\n'));
  config.carpetas = [root];

  // 2. Agente
  config.agentesPersonalizados = config.agentesPersonalizados || {};
  const agentes = todosLosAgentes(config);
  const items = Object.entries(agentes).map(([id, ag]) => etiquetaAgente(id, ag));
  items.push({ label: 'Otro: agregar un agente personalizado', value: '__nuevo__' });
  let inicial = items.findIndex((it) => it.value === config.agente);
  if (inicial < 0) inicial = Math.max(0, items.findIndex((it) => it.instalado));
  let agenteId = await menu({ titulo: '2) Que agente usas?', items, inicial, filtrable: false, ayuda: 'Flechas: mover · Enter: elegir' });
  if (!agenteId) agenteId = config.agente || 'claude';
  if (agenteId === '__nuevo__') {
    const { id, agente } = await pedirAgente(agentes);
    config.agentesPersonalizados[id] = agente;
    agenteId = id;
  }
  const agente = todosLosAgentes(config)[agenteId];
  console.log(color.verde(`2) Agente: ✓ ${agente.nombre}\n`));
  if (!cfg.existeComando(agente.bin)) {
    console.log(color.amarillo(`   Aviso: no encuentro el comando "${agente.bin}". Instalalo antes de usar dev.\n`));
  }
  fijarAgentePorDefecto(config, agenteId);

  // 3. Modo por defecto
  const modo = await elegirModoPorDefecto(config, '3) Que hacer al abrir un proyecto?');
  config.modo = modo || 'preguntar';
  console.log(color.verde(`3) Al abrir: ✓ ${textoModo(config.modo)}\n`));

  guardar(config);
  console.log(color.verde(color.negrita('Listo.')) + ` Escribe ${color.negrita('dev')} para abrir el menu de proyectos.`);
  console.log(color.gris(`Configuracion guardada en ${cfg.CONFIG_PATH}\n`));
  return config;
}

async function elegirModoPorDefecto(config, titulo) {
  const agente = todosLosAgentes(config)[config.agente];
  const modos = ['preguntar', ...Object.keys(MODOS).filter((m) => agente[m])];
  const items = modos.map((m) => (m === 'preguntar'
    ? { label: 'Preguntar cada vez (menu al abrir el proyecto)', value: m, hint: 'recomendado' }
    : { label: 'Siempre: ' + MODOS[m].toLowerCase(), value: m, hint: agente[m] }));
  return menu({ titulo, items, inicial: Math.max(0, modos.indexOf(config.modo)), filtrable: false, ayuda: AYUDA });
}

// ---- Menu de configuracion ----

async function menuConfiguracion(config) {
  let aviso = '';
  let inicial = 0;
  for (;;) {
    const agentes = todosLosAgentes(config);
    const propios = Object.keys(config.agentesPersonalizados || {}).length;
    const items = [
      { label: 'Carpetas de proyectos', value: 'carpetas', hint: plural(config.carpetas.length, 'vinculada') },
      { label: 'Agente por defecto', value: 'agente', hint: agentes[config.agente].nombre },
      { label: 'Al abrir un proyecto', value: 'modo', hint: textoModo(config.modo) },
      { label: 'Color del menu', value: 'color', hint: (TEMAS[config.color] || TEMAS.cian).nombre },
      { label: 'Orden de proyectos', value: 'orden', hint: ORDENES[config.orden || 'alfabetico'].nombre },
      { label: 'Agentes personalizados', value: 'propios', hint: propios ? String(propios) : 'ninguno' },
      { label: 'Volver a los proyectos', value: 'volver' },
    ];
    const opcion = await menu({
      titulo: `Configuracion  ${color.gris(cfg.rutaCorta(cfg.CONFIG_PATH))}${aviso}`,
      items,
      inicial,
      filtrable: false,
      ayuda: AYUDA,
    });
    if (!opcion || opcion === 'volver') return;
    inicial = items.findIndex((it) => it.value === opcion);
    const acciones = { carpetas: menuCarpetas, agente: menuAgentePorDefecto, modo: menuModo, color: menuColor, orden: menuOrden, propios: menuPropios };
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
      const detalle = existe ? plural(cfg.listarProyectos(c).length, 'proyecto') : 'no existe';
      return { label: cfg.nombreCarpeta(c, config.carpetas), value: c, hint: `${cfg.rutaCorta(c)} · ${detalle}` };
    });
    items.push({ label: '+ Vincular otra carpeta…', value: '__nueva__' });
    const elegida = await menu({ titulo: `Carpetas de proyectos${aviso}`, items, filtrable: false, ayuda: AYUDA });
    if (!elegida) return cambios;

    if (elegida === '__nueva__') {
      console.log(color.acento('Vincular una carpeta de proyectos'));
      const ruta = await pedirCarpeta({ obligatoria: false });
      if (!ruta) {
        aviso = '';
      } else if (config.carpetas.some((c) => cfg.mismaRuta(c, ruta))) {
        aviso = '  ' + color.amarillo('Esa carpeta ya estaba vinculada');
      } else {
        config.carpetas.push(ruta);
        guardar(config);
        aviso = '  ' + color.verde(`✓ Vinculada: ${cfg.rutaCorta(ruta)}`);
        cambios = color.verde('✓ Carpetas actualizadas');
      }
      continue;
    }

    const nombre = cfg.nombreCarpeta(elegida, config.carpetas);
    const accion = await menu({
      titulo: `${nombre}  ${color.gris(cfg.rutaCorta(elegida))}`,
      items: [
        { label: 'Desvincular', value: 'quitar', hint: 'deja de mostrar sus proyectos; no borra nada del disco' },
        { label: 'Volver', value: 'volver' },
      ],
      filtrable: false,
      ayuda: AYUDA,
    });
    if (accion !== 'quitar') { aviso = ''; continue; }
    if (config.carpetas.length === 1) {
      aviso = '  ' + color.amarillo('Es la unica carpeta: vincula otra antes de desvincularla');
      continue;
    }
    config.carpetas = config.carpetas.filter((c) => c !== elegida);
    guardar(config);
    aviso = '  ' + color.verde(`✓ Desvinculada: ${nombre}`);
    cambios = color.verde('✓ Carpetas actualizadas');
  }
}

async function menuAgentePorDefecto(config) {
  const agentes = todosLosAgentes(config);
  const items = Object.entries(agentes).map(([id, ag]) => etiquetaAgente(id, ag));
  const id = await menu({
    titulo: 'Agente por defecto (los proyectos con agente propio lo conservan)',
    items,
    inicial: Math.max(0, items.findIndex((it) => it.value === config.agente)),
    filtrable: false,
    ayuda: AYUDA,
  });
  if (!id || id === config.agente) return '';
  fijarAgentePorDefecto(config, id);
  guardar(config);
  const ag = agentes[id];
  return cfg.existeComando(ag.bin)
    ? color.verde(`✓ Agente por defecto: ${ag.nombre}`)
    : color.amarillo(`Agente por defecto: ${ag.nombre} (no encuentro "${ag.bin}", instalalo)`);
}

async function menuModo(config) {
  const modo = await elegirModoPorDefecto(config, 'Que hacer al abrir un proyecto?');
  if (!modo || modo === (config.modo || 'preguntar')) return '';
  config.modo = modo;
  guardar(config);
  return color.verde(`✓ Al abrir: ${textoModo(modo)}`);
}

async function menuColor(config) {
  const actual = TEMAS[config.color] ? config.color : 'cian';
  const ids = Object.keys(TEMAS);
  const items = ids.map((id) => ({
    label: TEMAS[id].nombre,
    value: id,
    hint: id === 'cian' ? 'por defecto' : id === 'sobrio' ? 'sin color: negrita e inverso' : undefined,
  }));
  const id = await menu({
    titulo: 'Color del menu (se ve al moverte)',
    items,
    inicial: ids.indexOf(actual),
    filtrable: false,
    ayuda: 'Flechas: probar · Enter: guardar · Esc: volver sin cambiar',
    alMover: (it) => aplicarTema(it.value),
  });
  if (!id || id === actual) {
    aplicarTema(actual);
    return '';
  }
  config.color = id;
  aplicarTema(id);
  guardar(config);
  return color.verde(`✓ Color: ${TEMAS[id].nombre}`);
}

async function menuOrden(config) {
  const ids = Object.keys(ORDENES);
  const actual = config.orden || 'alfabetico';
  const id = await menu({
    titulo: 'Orden de proyectos',
    items: ids.map((o) => ({ label: ORDENES[o].nombre, value: o, hint: ORDENES[o].hint })),
    inicial: ids.indexOf(actual),
    filtrable: false,
    ayuda: AYUDA,
  });
  if (!id || id === actual) return '';
  config.orden = id;
  guardar(config);
  return color.verde(`✓ Orden: ${ORDENES[id].nombre.toLowerCase()}`);
}

async function menuPropios(config) {
  let aviso = '';
  let cambios = '';
  for (;;) {
    const propios = config.agentesPersonalizados || {};
    const items = Object.entries(propios).map(([id, ag]) => ({ label: `${ag.nombre} (${id})`, value: id, hint: ag.nueva }));
    items.push({ label: '+ Agregar agente…', value: '__nuevo__' });
    const elegido = await menu({ titulo: `Agentes personalizados${aviso}`, items, filtrable: false, ayuda: AYUDA });
    if (!elegido) return cambios;

    if (elegido === '__nuevo__') {
      const { id, agente } = await pedirAgente(todosLosAgentes(config));
      config.agentesPersonalizados = Object.assign({}, propios, { [id]: agente });
      guardar(config);
      aviso = '  ' + color.verde(`✓ Agregado: ${agente.nombre}`);
      cambios = color.verde('✓ Agentes personalizados actualizados');
      continue;
    }

    const ag = propios[elegido];
    const accion = await menu({
      titulo: `${ag.nombre} (${elegido})`,
      items: [
        { label: 'Editar comandos', value: 'editar' },
        { label: 'Borrar', value: 'borrar' },
        { label: 'Volver', value: 'volver' },
      ],
      filtrable: false,
      ayuda: AYUDA,
    });
    if (accion === 'editar') {
      const { agente } = await pedirAgente(todosLosAgentes(config), { id: elegido, agente: ag });
      propios[elegido] = agente;
      guardar(config);
      aviso = '  ' + color.verde(`✓ Guardado: ${agente.nombre}`);
      cambios = color.verde('✓ Agentes personalizados actualizados');
    } else if (accion === 'borrar') {
      if (elegido === config.agente) {
        aviso = '  ' + color.amarillo('Es el agente por defecto: elige otro antes de borrarlo');
        continue;
      }
      delete propios[elegido];
      // los proyectos que lo usaban vuelven al agente por defecto
      const quedan = Object.entries(config.ultimoAgente || {}).filter(([, a]) => a !== elegido);
      if (quedan.length) config.ultimoAgente = Object.fromEntries(quedan);
      else delete config.ultimoAgente;
      guardar(config);
      aviso = '  ' + color.verde(`✓ Borrado: ${ag.nombre}`);
      cambios = color.verde('✓ Agentes personalizados actualizados');
    } else {
      aviso = '';
    }
  }
}

module.exports = { etiquetaAgente, configuracionInicial, menuConfiguracion };
