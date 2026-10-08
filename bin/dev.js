#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { PRESETS, MODOS, todosLosAgentes, resolverModo } = require('../lib/agents');
const cfgLib = require('../lib/config');
const { color, menu, preguntar, selectorCarpetaNativo } = require('../lib/ui');
const pkg = require('../package.json');

const AYUDA = `
${color.negrita('dev')} - abre tus proyectos con tu agente de IA favorito

${color.cian('Uso')}
  dev                    Menu con tus proyectos y luego como abrirlo
                         (elegir anterior / continuar / nueva)
  dev <proyecto>         Abre ese proyecto (acepta parte del nombre)
  dev -n, --nueva        Conversacion nueva (sin preguntar)
  dev -c, --continuar    Continua la ultima conversacion
  dev -r, --elegir       Lista de conversaciones anteriores para elegir
  dev -a, --agente [id]  Cambia el agente de ese proyecto y lo recuerda
                         (sin id muestra un menu)
  dev -l, --lista        Muestra tus proyectos y sale
  dev --config           Cambia la carpeta, el agente o el modo por defecto
                         (los proyectos con agente propio lo conservan)
  dev ... -- <args>      Pasa argumentos extra al agente (ej: dev web -- --model opus)

${color.cian('Agentes incluidos')}
  ${Object.keys(PRESETS).join(', ')} (y puedes agregar uno propio en --config)

Configuracion: ${cfgLib.CONFIG_PATH}
`;

function parsearArgs(argv) {
  const opts = { extra: [] };
  const corte = argv.indexOf('--');
  if (corte >= 0) {
    opts.extra = argv.slice(corte + 1);
    argv = argv.slice(0, corte);
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h': case '--help': case '--ayuda': opts.ayuda = true; break;
      case '-v': case '--version': opts.version = true; break;
      case '--config': case '--configurar': opts.configurar = true; break;
      case '-n': case '--nueva': case '--new': opts.modo = 'nueva'; break;
      case '-c': case '--continuar': case '--continue': opts.modo = 'continuar'; break;
      case '-r': case '--elegir': case '--resume': opts.modo = 'elegir'; break;
      case '-l': case '--lista': case '--list': opts.lista = true; break;
      case '-a': case '--agente': case '--agent':
        opts.elegirAgente = true;
        if (argv[i + 1] && !argv[i + 1].startsWith('-')) opts.agenteCandidato = argv[i + 1];
        break;
      default:
        if (a.startsWith('--agente=') || a.startsWith('--agent=')) {
          opts.elegirAgente = true;
          opts.agente = a.split('=')[1];
        } else if (a.startsWith('-')) {
          opts.desconocido = a;
        } else if (opts.agenteCandidato === a && opts.agente === undefined) {
          opts.agente = a; // se valida despues; si no es un agente se usa como proyecto
        } else if (!opts.proyecto) {
          opts.proyecto = a;
        }
    }
  }
  return opts;
}

function etiquetaAgente(id, ag) {
  const instalado = cfgLib.existeComando(ag.bin);
  return {
    label: `${ag.nombre} (${id})`,
    value: id,
    hint: instalado ? '✓ instalado' : 'no encontrado',
    instalado,
  };
}

async function crearAgentePersonalizado() {
  console.log(color.cian('\nAgente personalizado'));
  console.log(color.gris('Escribe el comando completo que abre el agente en cada caso.'));
  let nombre = '';
  while (!nombre) nombre = await preguntar('Nombre (ej: Mi Agente): ');
  const id = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'personalizado';
  let nueva = '';
  while (!nueva) nueva = await preguntar('Comando para conversacion nueva (obligatorio, ej: miagente): ');
  const continuar = await preguntar('Comando para continuar la ultima (Enter para omitir): ');
  const elegir = await preguntar('Comando para elegir una anterior (Enter para omitir): ');
  return {
    id,
    agente: {
      nombre,
      bin: nueva.split(/\s+/)[0],
      nueva,
      continuar: continuar || null,
      elegir: elegir || null,
    },
  };
}

async function configurar(actual) {
  actual = actual || {};
  console.log(color.cian(color.negrita('\n=== Configuracion de dev ===\n')));

  // 1. Carpeta de proyectos
  console.log('1) Carpeta donde guardas tus proyectos');
  console.log(color.gris('   Escribe la ruta (Tab autocompleta) o presiona Enter para abrir el explorador.'));
  if (actual.root) console.log(color.gris(`   Actual: ${cfgLib.rutaCorta(actual.root)}  (escribe "=" para mantenerla)`));
  let root = null;
  while (!root) {
    let resp = await preguntar('   Ruta: ', { completarCarpetas: true });
    if (resp === '=' && actual.root) resp = actual.root;
    if (!resp) {
      resp = selectorCarpetaNativo('Elige la carpeta donde guardas tus proyectos');
      if (!resp) {
        console.log(color.amarillo('   No se pudo abrir el explorador o se cancelo. Escribe la ruta.'));
        continue;
      }
    }
    const ruta = cfgLib.expandirRuta(resp);
    if (cfgLib.esCarpeta(ruta)) {
      root = ruta;
    } else {
      console.log(color.amarillo(`   No existe la carpeta: ${ruta}`));
    }
  }
  const n = cfgLib.listarProyectos(root).length;
  console.log(color.verde(`   ✓ ${cfgLib.rutaCorta(root)} (${n} proyecto${n === 1 ? '' : 's'})\n`));

  // 2. Agente
  const config = { root, agentesPersonalizados: actual.agentesPersonalizados || {} };
  const agentes = todosLosAgentes(config);
  const items = Object.entries(agentes).map(([id, ag]) => etiquetaAgente(id, ag));
  items.push({ label: 'Otro: agregar un agente personalizado', value: '__nuevo__' });
  let inicial = items.findIndex((it) => it.value === actual.agente);
  if (inicial < 0) inicial = Math.max(0, items.findIndex((it) => it.instalado));
  let agenteId = await menu({ titulo: '2) Que agente usas?', items, inicial, filtrable: false, ayuda: 'Flechas: mover · Enter: elegir' });
  if (!agenteId) agenteId = actual.agente || 'claude';
  if (agenteId === '__nuevo__') {
    const { id, agente } = await crearAgentePersonalizado();
    config.agentesPersonalizados[id] = agente;
    agenteId = id;
  }
  const agente = todosLosAgentes(config)[agenteId];
  console.log(color.verde(`2) Agente: ✓ ${agente.nombre}\n`));
  if (!cfgLib.existeComando(agente.bin)) {
    console.log(color.amarillo(`   Aviso: no encuentro el comando "${agente.bin}". Instalalo antes de usar dev.\n`));
  }

  // 3. Modo por defecto
  const modos = ['preguntar', ...Object.keys(MODOS).filter((m) => agente[m])];
  const itemsModo = modos.map((m) => (m === 'preguntar'
    ? { label: 'Preguntar cada vez (menu al abrir el proyecto)', value: m, hint: 'recomendado' }
    : { label: 'Siempre: ' + MODOS[m].toLowerCase(), value: m, hint: agente[m] }));
  const iniModo = Math.max(0, modos.indexOf(actual.modo));
  let modo = await menu({ titulo: '3) Que hacer al abrir un proyecto?', items: itemsModo, inicial: iniModo, filtrable: false, ayuda: 'Flechas: mover · Enter: elegir' });
  if (!modo) modo = modos[iniModo];
  console.log(color.verde(`3) Al abrir: ✓ ${modo === 'preguntar' ? 'preguntar cada vez' : MODOS[modo].toLowerCase()}\n`));
  if (actual.ultimoModo) config.ultimoModo = actual.ultimoModo;
  // los proyectos que ya usan el nuevo agente por defecto dejan de necesitar uno propio
  const propios = Object.entries(actual.ultimoAgente || {}).filter(([, id]) => id !== agenteId);
  if (propios.length) config.ultimoAgente = Object.fromEntries(propios);

  config.agente = agenteId;
  config.modo = modo;
  if (Object.keys(config.agentesPersonalizados).length === 0) delete config.agentesPersonalizados;
  cfgLib.guardarConfig(config);
  console.log(color.verde(color.negrita('Listo.')) + ` Escribe ${color.negrita('dev')} para abrir el menu de proyectos.`);
  console.log(color.gris(`Configuracion guardada en ${cfgLib.CONFIG_PATH}\n`));
  return config;
}

// Agente de un proyecto: el que se eligio para el, o el agente por defecto
function agenteDelProyecto(config, agentes, ruta) {
  const id = (config.ultimoAgente || {})[ruta];
  return id && agentes[id] ? id : config.agente;
}

// Guarda el agente elegido para un proyecto. Si es el de por defecto no se guarda,
// asi el proyecto sigue al agente por defecto si luego se cambia en --config.
function recordarAgente(config, ruta, id) {
  const mapa = Object.assign({}, config.ultimoAgente);
  if (id === config.agente) delete mapa[ruta];
  else mapa[ruta] = id;
  if (Object.keys(mapa).length) config.ultimoAgente = mapa;
  else delete config.ultimoAgente;
}

async function elegirProyecto(config, agentes, busqueda) {
  const root = config.root;
  const proyectos = cfgLib.listarProyectos(root);
  if (proyectos.length === 0) {
    console.error(color.rojo(`No hay proyectos en ${root}. Usa "dev --config" para cambiar la carpeta.`));
    return null;
  }
  if (busqueda) {
    const q = busqueda.toLowerCase();
    const exacto = proyectos.find((p) => p.toLowerCase() === q);
    if (exacto) return exacto;
    const parecidos = proyectos.filter((p) => p.toLowerCase().includes(q));
    if (parecidos.length === 1) return parecidos[0];
    if (parecidos.length === 0) {
      console.log(color.amarillo(`No encontre "${busqueda}" en ${root}.`));
      busqueda = '';
    }
  }
  if (!process.stdin.isTTY) {
    console.error('Indica el proyecto: dev <proyecto>');
    return null;
  }
  return menu({
    titulo: `Elige un proyecto  ${color.gris('(' + cfgLib.rutaCorta(root) + ')')}`,
    items: proyectos.map((p) => {
      const id = agenteDelProyecto(config, agentes, path.join(root, p));
      return { label: p, value: p, hint: id !== config.agente ? '· ' + agentes[id].nombre : undefined };
    }),
    filtro: busqueda || '',
  });
}

const CAMBIAR_AGENTE = '__agente__';

// Segundo menu: como abrir el proyecto. Marca por defecto lo ultimo que se uso en ese proyecto.
// Incluye la opcion de cambiar el agente del proyecto (devuelve CAMBIAR_AGENTE).
async function elegirModo(agente, proyecto, ultimo) {
  const modos = Object.keys(MODOS).filter((m) => agente[m]);
  const items = modos.map((m) => ({ label: MODOS[m], value: m, hint: agente[m] }));
  items.push({ label: 'Cambiar de agente…', value: CAMBIAR_AGENTE, hint: 'solo para este proyecto' });
  const inicial = Math.max(0, modos.indexOf(ultimo));
  return menu({
    titulo: `${proyecto}  ${color.gris('· ' + agente.nombre)}  -  Como lo abro?`,
    items,
    inicial,
    filtrable: false,
    ayuda: 'Flechas: mover · Enter: abrir · Esc: volver a proyectos',
  });
}

// Menu de agentes para un proyecto. No deja elegir uno que no este instalado.
async function elegirAgente(agentes, proyecto, actual) {
  const items = Object.entries(agentes).map(([id, ag]) => etiquetaAgente(id, ag));
  let inicial = Math.max(0, items.findIndex((i) => i.value === actual));
  for (;;) {
    const elegido = await menu({
      titulo: `${proyecto}  -  Que agente usas en este proyecto?`,
      items,
      inicial,
      filtrable: false,
      ayuda: 'Flechas: mover · Enter: elegir · Esc: volver',
    });
    if (!elegido) return null;
    const item = items.find((i) => i.value === elegido);
    if (item.instalado) return elegido;
    console.log(color.amarillo(`No encuentro "${agentes[elegido].bin}" (${agentes[elegido].nombre}). Instalalo o elige otro.`));
    inicial = items.indexOf(item);
  }
}

function citar(arg) {
  return /[\s"'&|<>^()]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

function ejecutar(comando, cwd) {
  const hijo = spawn(comando, { cwd, stdio: 'inherit', shell: true });
  const ignorar = () => {}; // Ctrl+C lo maneja el agente, no dev
  process.on('SIGINT', ignorar);
  hijo.on('error', (e) => {
    console.error(color.rojo(`No se pudo ejecutar "${comando}": ${e.message}`));
    process.exit(1);
  });
  hijo.on('exit', (code, signal) => {
    process.removeListener('SIGINT', ignorar);
    process.exit(code === null ? (signal ? 1 : 0) : code);
  });
}

async function main() {
  const opts = parsearArgs(process.argv.slice(2));
  if (opts.ayuda) return console.log(AYUDA);
  if (opts.version) return console.log(pkg.version);
  if (opts.desconocido) {
    console.error(color.rojo(`Opcion desconocida: ${opts.desconocido}`) + '\nUsa "dev --help" para ver las opciones.');
    process.exit(1);
  }

  let config = cfgLib.leerConfig();
  if (opts.configurar) {
    await configurar(config);
    return;
  }
  if (!config || !config.root || !config.agente) {
    console.log(color.cian('Bienvenido a dev. Configuremos tu carpeta de proyectos y tu agente.'));
    config = await configurar(config);
  } else if (!cfgLib.esCarpeta(config.root)) {
    console.log(color.amarillo(`La carpeta configurada ya no existe: ${config.root}`));
    config = await configurar(config);
  }

  if (opts.lista) {
    cfgLib.listarProyectos(config.root).forEach((p) => console.log(p));
    return;
  }

  const agentes = todosLosAgentes(config);
  if (!agentes[config.agente]) {
    console.error(color.rojo(`El agente "${config.agente}" no existe. Usa "dev --config".`));
    process.exit(1);
  }
  let agenteForzado = null; // dev -a <id>
  let menuAgente = false; // dev -a sin id: menu de agentes despues de elegir el proyecto
  if (opts.elegirAgente) {
    if (opts.agente && agentes[opts.agente]) {
      agenteForzado = opts.agente;
    } else {
      if (opts.agente && !opts.proyecto) opts.proyecto = opts.agente; // no era un agente: era el proyecto
      else if (opts.agente) console.log(color.amarillo(`Agente desconocido: ${opts.agente}`));
      if (!process.stdin.isTTY) {
        console.error(`Indica el agente: dev -a <id>  (${Object.keys(agentes).join(', ')})`);
        process.exit(1);
      }
      menuAgente = true;
    }
  }

  let pedido = opts.modo || config.modo || 'preguntar';
  if (pedido === 'preguntar' && !process.stdin.isTTY) pedido = 'elegir';

  let busqueda = opts.proyecto;
  let proyecto;
  let ruta;
  let agenteId;
  proyectos: for (;;) {
    proyecto = await elegirProyecto(config, agentes, busqueda);
    if (!proyecto) return;
    busqueda = ''; // si se vuelve con Esc, se muestra el menu completo
    ruta = path.join(config.root, proyecto);
    agenteId = agenteForzado || agenteDelProyecto(config, agentes, ruta);
    if (menuAgente) {
      const elegido = await elegirAgente(agentes, proyecto, agenteId);
      if (!elegido) continue; // Esc: vuelve al menu de proyectos
      agenteId = elegido;
    }
    if (agenteForzado || menuAgente) {
      recordarAgente(config, ruta, agenteId);
      try { cfgLib.guardarConfig(config); } catch (e) { /* no es critico */ }
    }
    if (pedido !== 'preguntar') break;
    for (;;) {
      const ultimo = (config.ultimoModo || {})[ruta];
      const elegido = await elegirModo(agentes[agenteId], proyecto, ultimo);
      if (!elegido) continue proyectos; // Esc: vuelve al menu de proyectos
      if (elegido === CAMBIAR_AGENTE) {
        const otro = await elegirAgente(agentes, proyecto, agenteId);
        if (otro) {
          agenteId = otro;
          recordarAgente(config, ruta, agenteId);
          try { cfgLib.guardarConfig(config); } catch (e) { /* no es critico */ }
        }
        continue;
      }
      pedido = elegido;
      config.ultimoModo = Object.assign({}, config.ultimoModo, { [ruta]: elegido });
      try { cfgLib.guardarConfig(config); } catch (e) { /* no es critico */ }
      break proyectos;
    }
  }

  const agente = agentes[agenteId];
  if (!cfgLib.existeComando(agente.bin)) {
    console.error(color.rojo(`No encuentro "${agente.bin}" (${agente.nombre}). Instalalo o cambia el agente de este proyecto con "dev ${proyecto} -a".`));
    process.exit(1);
  }

  const modo = resolverModo(agente, pedido);
  if (modo !== pedido) {
    console.log(color.amarillo(`${agente.nombre} no permite "${MODOS[pedido].toLowerCase()}" al iniciar; se usara "${MODOS[modo].toLowerCase()}".`));
    if (agente.nota) console.log(color.gris(agente.nota));
  }
  const comando = [agente[modo], ...opts.extra.map(citar)].join(' ');

  console.log(`${color.cian('›')} ${color.negrita(proyecto)}  ${color.gris('·')}  ${agente.nombre}  ${color.gris('· ' + comando)}`);
  ejecutar(comando, ruta);
}

main().catch((e) => {
  process.stdout.write('\x1b[?25h');
  console.error(color.rojo(e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
