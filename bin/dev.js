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
  dev -a, --agente [id]  Usa otro agente solo esta vez (sin id muestra un menu)
  dev -l, --lista        Muestra tus proyectos y sale
  dev --config           Cambia la carpeta, el agente o el modo por defecto
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

  config.agente = agenteId;
  config.modo = modo;
  if (Object.keys(config.agentesPersonalizados).length === 0) delete config.agentesPersonalizados;
  cfgLib.guardarConfig(config);
  console.log(color.verde(color.negrita('Listo.')) + ` Escribe ${color.negrita('dev')} para abrir el menu de proyectos.`);
  console.log(color.gris(`Configuracion guardada en ${cfgLib.CONFIG_PATH}\n`));
  return config;
}

async function elegirProyecto(root, busqueda) {
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
    items: proyectos.map((p) => ({ label: p, value: p })),
    filtro: busqueda || '',
  });
}

// Segundo menu: como abrir el proyecto. Marca por defecto lo ultimo que se uso en ese proyecto.
async function elegirModo(agente, proyecto, ultimo) {
  const modos = Object.keys(MODOS).filter((m) => agente[m]);
  if (modos.length === 1) return modos[0];
  const items = modos.map((m) => ({ label: MODOS[m], value: m, hint: agente[m] }));
  const inicial = Math.max(0, modos.indexOf(ultimo));
  return menu({
    titulo: `${proyecto}  ${color.gris('· ' + agente.nombre)}  -  Como lo abro?`,
    items,
    inicial,
    filtrable: false,
    ayuda: 'Flechas: mover · Enter: abrir · Esc: volver a proyectos',
  });
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
  let agenteId = config.agente;
  if (opts.elegirAgente) {
    if (opts.agente && agentes[opts.agente]) {
      agenteId = opts.agente;
    } else {
      if (opts.agente && !opts.proyecto) opts.proyecto = opts.agente; // no era un agente: era el proyecto
      else if (opts.agente) console.log(color.amarillo(`Agente desconocido: ${opts.agente}`));
      const items = Object.entries(agentes).map(([id, ag]) => etiquetaAgente(id, ag));
      const elegido = await menu({ titulo: 'Que agente quieres usar esta vez?', items, inicial: Math.max(0, items.findIndex((i) => i.value === agenteId)), filtrable: false });
      if (!elegido) return;
      agenteId = elegido;
    }
  }
  const agente = agentes[agenteId];
  if (!agente) {
    console.error(color.rojo(`El agente "${agenteId}" no existe. Usa "dev --config".`));
    process.exit(1);
  }
  if (!cfgLib.existeComando(agente.bin)) {
    console.error(color.rojo(`No encuentro "${agente.bin}" (${agente.nombre}). Instalalo o cambia de agente con "dev --config".`));
    process.exit(1);
  }

  let pedido = opts.modo || config.modo || 'preguntar';
  if (pedido === 'preguntar' && !process.stdin.isTTY) pedido = 'elegir';

  let busqueda = opts.proyecto;
  let proyecto;
  let ruta;
  for (;;) {
    proyecto = await elegirProyecto(config.root, busqueda);
    if (!proyecto) return;
    ruta = path.join(config.root, proyecto);
    if (pedido !== 'preguntar') break;
    const ultimo = (config.ultimoModo || {})[ruta];
    const elegido = await elegirModo(agente, proyecto, ultimo);
    if (elegido) {
      pedido = elegido;
      config.ultimoModo = Object.assign({}, config.ultimoModo, { [ruta]: elegido });
      try { cfgLib.guardarConfig(config); } catch (e) { /* no es critico */ }
      break;
    }
    busqueda = ''; // Esc: vuelve al menu de proyectos
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
