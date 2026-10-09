#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const { PRESETS, MODOS, todosLosAgentes, resolverModo } = require('../lib/agents');
const cfgLib = require('../lib/config');
const { color, aplicarTema, menu } = require('../lib/ui');
const { etiquetaAgente, configuracionInicial, menuConfiguracion } = require('../lib/ajustes');
const pkg = require('../package.json');

// Se arma al pedirla para que use el color del tema elegido
const ayuda = () => `
${color.negrita('dev')} - abre tus proyectos con tu agente de IA favorito

${color.acento('Uso')}
  dev                    Menu con tus proyectos y luego como abrirlo
                         (elegir anterior / continuar / nueva)
  dev <proyecto>         Abre ese proyecto (acepta parte del nombre)
  dev -n, --nueva        Conversacion nueva (sin preguntar)
  dev -c, --continuar    Continua la ultima conversacion
  dev -r, --elegir       Lista de conversaciones anteriores para elegir
  dev -a, --agente [id]  Cambia el agente de ese proyecto y lo recuerda
                         (sin id muestra un menu)
  dev -l, --lista        Muestra tus proyectos y sale
  dev --config           Abre la configuracion: carpetas de proyectos, agente,
                         color, orden... (tambien esta al final del menu)
  dev ... -- <args>      Pasa argumentos extra al agente (ej: dev web -- --model opus)

${color.acento('Agentes incluidos')}
  ${Object.keys(PRESETS).join(', ')} (y puedes agregar uno propio en la configuracion)

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

// Proyectos de todas las carpetas, en el orden elegido en la configuracion
function proyectosOrdenados(config) {
  const proyectos = cfgLib.listarTodos(config.carpetas.filter(cfgLib.esCarpeta));
  const alfabetico = (a, b) => a.nombre.localeCompare(b.nombre, undefined, { sensitivity: 'base' });
  if (config.orden !== 'recientes') return proyectos.sort(alfabetico);
  const uso = config.ultimoUso || {};
  return proyectos.sort((a, b) => (uso[b.ruta] || 0) - (uso[a.ruta] || 0) || alfabetico(a, b));
}

const CONFIGURACION = '__config__';
const avisadas = new Set();

// Menu de proyectos. Devuelve { nombre, ruta, carpeta }, CONFIGURACION o null (Esc).
async function elegirProyecto(config, agentes, busqueda) {
  for (const c of config.carpetas) {
    if (!cfgLib.esCarpeta(c) && !avisadas.has(c)) {
      avisadas.add(c);
      console.log(color.amarillo(`No encuentro la carpeta ${cfgLib.rutaCorta(c)}. Si ya no la usas, desvinculala en Configuracion.`));
    }
  }
  const proyectos = proyectosOrdenados(config);
  if (busqueda) {
    const q = busqueda.toLowerCase();
    const exactos = proyectos.filter((p) => p.nombre.toLowerCase() === q);
    const parecidos = exactos.length ? exactos : proyectos.filter((p) => p.nombre.toLowerCase().includes(q));
    if (parecidos.length === 1) return parecidos[0];
    if (parecidos.length === 0) {
      console.log(color.amarillo(`No encontre "${busqueda}" en tus carpetas de proyectos.`));
      busqueda = '';
    }
  }
  if (!process.stdin.isTTY) {
    console.error(proyectos.length ? 'Indica el proyecto: dev <proyecto>' : 'No hay proyectos en tus carpetas.');
    return null;
  }
  if (proyectos.length === 0) {
    console.log(color.amarillo('No hay proyectos en tus carpetas. Vincula otra en Configuracion.'));
  }
  const varias = config.carpetas.length > 1;
  const items = proyectos.map((p) => {
    const extra = [];
    if (varias) extra.push(cfgLib.nombreCarpeta(p.carpeta, config.carpetas));
    const id = agenteDelProyecto(config, agentes, p.ruta);
    if (id !== config.agente) extra.push(agentes[id].nombre);
    return { label: p.nombre, value: p, hint: extra.length ? '· ' + extra.join('  · ') : undefined };
  });
  items.push({ label: '≡ Configuracion…', value: CONFIGURACION, claves: ['configuracion', 'ajustes', 'opciones'] });
  const donde = varias ? `${config.carpetas.length} carpetas` : cfgLib.rutaCorta(config.carpetas[0]);
  return menu({
    titulo: `Elige un proyecto  ${color.gris('(' + donde + ')')}`,
    items,
    filtro: busqueda || '',
  });
}

// Agente de un proyecto: el que se eligio para el, o el agente por defecto
function agenteDelProyecto(config, agentes, ruta) {
  const id = (config.ultimoAgente || {})[ruta];
  return id && agentes[id] ? id : config.agente;
}

// Guarda el agente elegido para un proyecto. Si es el de por defecto no se guarda,
// asi el proyecto sigue al agente por defecto si luego se cambia en la configuracion.
function recordarAgente(config, ruta, id) {
  const mapa = Object.assign({}, config.ultimoAgente);
  if (id === config.agente) delete mapa[ruta];
  else mapa[ruta] = id;
  if (Object.keys(mapa).length) config.ultimoAgente = mapa;
  else delete config.ultimoAgente;
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


function guardarSinFallar(config) {
  try { cfgLib.guardarConfig(config); } catch (e) { /* no es critico */ }
}

async function main() {
  const opts = parsearArgs(process.argv.slice(2));
  let config = cfgLib.leerConfig();
  if (config) aplicarTema(config.color);
  if (opts.ayuda) return console.log(ayuda());
  if (opts.version) return console.log(pkg.version);
  if (opts.desconocido) {
    console.error(color.rojo(`Opcion desconocida: ${opts.desconocido}`) + '\nUsa "dev --help" para ver las opciones.');
    process.exit(1);
  }

  const configurada = config && config.carpetas.length > 0 && config.agente;
  if (opts.configurar) {
    if (!configurada) {
      await configuracionInicial(config);
    } else if (!process.stdin.isTTY) {
      console.error(`La configuracion se cambia desde la terminal. Archivo: ${cfgLib.CONFIG_PATH}`);
      process.exit(1);
    } else {
      await menuConfiguracion(config);
    }
    return;
  }
  if (!configurada) {
    console.log(color.acento('Bienvenido a dev. Configuremos tu carpeta de proyectos y tu agente.'));
    config = await configuracionInicial(config);
  }

  if (opts.lista) {
    const varias = config.carpetas.length > 1;
    proyectosOrdenados(config).forEach((p) => console.log(varias
      ? `${p.nombre}  ${color.gris('(' + cfgLib.nombreCarpeta(p.carpeta, config.carpetas) + ')')}`
      : p.nombre));
    return;
  }

  let agentes = todosLosAgentes(config);
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

  let busqueda = opts.proyecto;
  let proyecto;
  let ruta;
  let agenteId;
  let pedido;
  proyectos: for (;;) {
    // se calcula en cada vuelta porque se puede cambiar desde la configuracion
    pedido = opts.modo || config.modo || 'preguntar';
    if (pedido === 'preguntar' && !process.stdin.isTTY) pedido = 'elegir';

    const elegido = await elegirProyecto(config, agentes, busqueda);
    if (!elegido) return;
    busqueda = ''; // si se vuelve con Esc, se muestra el menu completo
    if (elegido === CONFIGURACION) {
      await menuConfiguracion(config);
      agentes = todosLosAgentes(config);
      continue;
    }
    proyecto = elegido.nombre;
    ruta = elegido.ruta;
    agenteId = agenteForzado && agentes[agenteForzado] ? agenteForzado : agenteDelProyecto(config, agentes, ruta);
    if (menuAgente) {
      const otro = await elegirAgente(agentes, proyecto, agenteId);
      if (!otro) continue; // Esc: vuelve al menu de proyectos
      agenteId = otro;
    }
    if (agenteForzado || menuAgente) {
      recordarAgente(config, ruta, agenteId);
      guardarSinFallar(config);
    }
    if (pedido !== 'preguntar') break;
    for (;;) {
      const ultimo = (config.ultimoModo || {})[ruta];
      const modo = await elegirModo(agentes[agenteId], proyecto, ultimo);
      if (!modo) continue proyectos; // Esc: vuelve al menu de proyectos
      if (modo === CAMBIAR_AGENTE) {
        const otro = await elegirAgente(agentes, proyecto, agenteId);
        if (otro) {
          agenteId = otro;
          recordarAgente(config, ruta, agenteId);
          guardarSinFallar(config);
        }
        continue;
      }
      pedido = modo;
      config.ultimoModo = Object.assign({}, config.ultimoModo, { [ruta]: modo });
      break proyectos;
    }
  }

  const agente = agentes[agenteId];
  if (!cfgLib.existeComando(agente.bin)) {
    guardarSinFallar(config);
    console.error(color.rojo(`No encuentro "${agente.bin}" (${agente.nombre}). Instalalo o cambia el agente de este proyecto con "dev ${proyecto} -a".`));
    process.exit(1);
  }
  config.ultimoUso = Object.assign({}, config.ultimoUso, { [ruta]: Date.now() });
  guardarSinFallar(config);

  const modo = resolverModo(agente, pedido);
  if (modo !== pedido) {
    console.log(color.amarillo(`${agente.nombre} no permite "${MODOS[pedido].toLowerCase()}" al iniciar; se usara "${MODOS[modo].toLowerCase()}".`));
    if (agente.nota) console.log(color.gris(agente.nota));
  }
  const comando = [agente[modo], ...opts.extra.map(citar)].join(' ');

  console.log(`${color.acento('›')} ${color.negrita(proyecto)}  ${color.gris('·')}  ${agente.nombre}  ${color.gris('· ' + comando)}`);
  ejecutar(comando, ruta);
}

main().catch((e) => {
  process.stdout.write('\x1b[?25h');
  console.error(color.rojo(e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
