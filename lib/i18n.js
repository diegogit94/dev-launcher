'use strict';

// Textos de la interfaz en espanol e ingles. Sin tildes a proposito (consolas viejas).
// t('clave', { variable }) reemplaza {variable}; un texto tambien puede ser una funcion (plurales, ayuda).
//
// Idioma: --lang > "idioma" en la config > DEV_LAUNCHER_LANG > el del sistema (es* -> es, si no en).

const TEXTOS = {
  es: {
    // menu() de ui.js
    'menu.filtrar': 'Escribe para filtrar',
    'menu.buscar': 'Buscar',
    'menu.sinResultados': '(sin resultados)',
    'menu.mas': 'mas',
    'ayuda.salir': 'Flechas: mover · Enter: abrir · Esc: salir',
    'ayuda.volver': 'Flechas: mover · Enter: elegir · Esc: volver',
    'ayuda.elegir': 'Flechas: mover · Enter: elegir',
    'ayuda.modo': 'Flechas: mover · Enter: abrir · Esc: volver a proyectos',
    'ayuda.color': 'Flechas: probar · Enter: guardar · Esc: volver sin cambiar',
    'ayuda.apoyar': 'Flechas: mover · Enter: abrir en el navegador · Esc: volver',
    'tema.cian': 'Cian', 'tema.verde': 'Verde', 'tema.azul': 'Azul',
    'tema.magenta': 'Magenta', 'tema.amarillo': 'Amarillo', 'tema.rojo': 'Rojo', 'tema.sobrio': 'Sobrio',

    // modos y agentes
    'modo.elegir': 'Elegir una conversacion anterior',
    'modo.continuar': 'Continuar la ultima conversacion',
    'modo.nueva': 'Abrir una conversacion nueva',
    'nota.gemini': 'En Gemini CLI la lista de sesiones se abre con /resume dentro del chat.',
    'nota.opencode': 'En OpenCode la lista de sesiones se abre con /sessions dentro del chat.',
    'agente.instalado': '✓ instalado',
    'agente.noEncontrado': 'no encontrado',

    // menu de proyectos y segundo menu
    'proyectos.titulo': 'Elige un proyecto',
    'proyectos.carpetas': '{n} carpetas',
    'proyectos.configuracion': '≡ Configuracion…',
    'proyectos.claves': 'configuracion,ajustes,opciones,actualizar',
    'proyectos.versionNueva': '· hay una version nueva: {v}',
    'proyectos.faltaCarpeta': 'No encuentro la carpeta {ruta}. Si ya no la usas, desvinculala en Configuracion.',
    'proyectos.noEncontre': 'No encontre "{q}" en tus carpetas de proyectos.',
    'proyectos.indica': 'Indica el proyecto: dev <proyecto>',
    'proyectos.ninguno': 'No hay proyectos en tus carpetas.',
    'proyectos.ningunoVincula': 'No hay proyectos en tus carpetas. Vincula otra en Configuracion.',
    'modo.titulo': '{proyecto}  {agente}  -  Como lo abro?',
    'modo.cambiarAgente': 'Cambiar de agente…',
    'modo.soloEste': 'solo para este proyecto',
    'modo.noPermite': '{agente} no permite "{pedido}" al iniciar; se usara "{modo}".',
    'agente.titulo': '{proyecto}  -  Que agente usas en este proyecto?',
    'agente.falta': 'No encuentro "{bin}" ({nombre}). Instalalo o elige otro.',
    'agente.desconocido': 'Agente desconocido: {id}',
    'agente.indica': 'Indica el agente: dev -a <id>  ({lista})',
    'error.agenteNoExiste': 'El agente "{id}" no existe. Usa "dev --config".',
    'error.faltaAgente': 'No encuentro "{bin}" ({nombre}). Instalalo o cambia el agente de este proyecto con "dev {proyecto} -a".',
    'error.ejecutar': 'No se pudo ejecutar "{cmd}": {msg}',
    'error.opcion': 'Opcion desconocida: {op}',
    'error.usaAyuda': 'Usa "dev --help" para ver las opciones.',
    'error.idioma': 'Idioma no soportado: {id} (usa es o en)',
    'error.configTerminal': 'La configuracion se cambia desde la terminal. Archivo: {ruta}',
    bienvenida: 'Bienvenido a dev. Configuremos tu carpeta de proyectos y tu agente.',

    // configuracion
    'n.proyectos': ({ n }) => (n === 1 ? '1 proyecto' : `${n} proyectos`),
    'n.vinculadas': ({ n }) => (n === 1 ? '1 vinculada' : `${n} vinculadas`),
    'modo.preguntarCada': 'preguntar cada vez',
    'modo.siempre': 'siempre: {modo}',
    'modoDef.preguntar': 'Preguntar cada vez (menu al abrir el proyecto)',
    'modoDef.recomendado': 'recomendado',
    'modoDef.siempre': 'Siempre: {modo}',
    'modoDef.titulo': 'Que hacer al abrir un proyecto?',
    'carpeta.ayuda': '   Escribe la ruta (Tab autocompleta) o presiona Enter para abrir el explorador.',
    'carpeta.ruta': '   Ruta: ',
    'carpeta.selector': 'Elige la carpeta donde guardas tus proyectos',
    'carpeta.selectorFallo': '   No se pudo abrir el explorador o se cancelo. Escribe la ruta.',
    'carpeta.noExiste': '   No existe la carpeta: {ruta}',
    'propio.titulo': '\nAgente personalizado',
    'propio.editar': '\nEditar {nombre}',
    'propio.instrucciones': 'Escribe el comando completo que abre el agente en cada caso.',
    'propio.mantener': 'Enter mantiene el valor actual; "-" quita un comando opcional.',
    'propio.omitir': ' (Enter para omitir)',
    'propio.nombre': 'Nombre (ej: Mi Agente)',
    'propio.nueva': 'Comando para conversacion nueva (obligatorio, ej: miagente)',
    'propio.continuar': 'Comando para continuar la ultima',
    'propio.elegir': 'Comando para elegir una anterior',
    'inicial.titulo': '\n=== Configuracion de dev ===\n',
    'inicial.paso1': '1) Carpeta donde guardas tus proyectos',
    'inicial.masCarpetas': '   Puedes vincular mas carpetas despues, desde "Configuracion" en el menu.\n',
    'inicial.otro': 'Otro: agregar un agente personalizado',
    'inicial.paso2': '2) Que agente usas?',
    'inicial.agenteOk': '2) Agente: ✓ {nombre}\n',
    'inicial.avisoAgente': '   Aviso: no encuentro el comando "{bin}". Instalalo antes de usar dev.\n',
    'inicial.paso3': '3) Que hacer al abrir un proyecto?',
    'inicial.modoOk': '3) Al abrir: ✓ {modo}\n',
    'inicial.listo': 'Listo.',
    'inicial.escribe': ' Escribe {dev} para abrir el menu de proyectos.',
    'inicial.guardada': 'Configuracion guardada en {ruta}\n',
    'config.titulo': 'Configuracion',
    'config.carpetas': 'Carpetas de proyectos',
    'config.agente': 'Agente por defecto',
    'config.modo': 'Al abrir un proyecto',
    'config.color': 'Color del menu',
    'config.orden': 'Orden de proyectos',
    'config.propios': 'Agentes personalizados',
    'config.ninguno': 'ninguno',
    'config.idioma': 'Idioma',
    'config.actualizar': 'Actualizar dev-launcher',
    'config.apoyar': 'Invitame una miniatura de Warhammer',
    'config.apoyarHint': 'Apoya este proyecto ♥',
    'config.volver': 'Volver a los proyectos',
    volver: 'Volver',
    'carpetas.vincular': '+ Vincular otra carpeta…',
    'carpetas.vincularTitulo': 'Vincular una carpeta de proyectos',
    'carpetas.yaVinculada': 'Esa carpeta ya estaba vinculada',
    'carpetas.vinculada': '✓ Vinculada: {ruta}',
    'carpetas.actualizadas': '✓ Carpetas actualizadas',
    'carpetas.noExiste': 'no existe',
    'carpetas.desvincular': 'Desvincular',
    'carpetas.desvincularHint': 'deja de mostrar sus proyectos; no borra nada del disco',
    'carpetas.unica': 'Es la unica carpeta: vincula otra antes de desvincularla',
    'carpetas.desvinculada': '✓ Desvinculada: {nombre}',
    'agenteDef.titulo': 'Agente por defecto (los proyectos con agente propio lo conservan)',
    'agenteDef.ok': '✓ Agente por defecto: {nombre}',
    'agenteDef.falta': 'Agente por defecto: {nombre} (no encuentro "{bin}", instalalo)',
    'modo.ok': '✓ Al abrir: {modo}',
    'color.titulo': 'Color del menu (se ve al moverte)',
    'color.porDefecto': 'por defecto',
    'color.sobrio': 'sin color: negrita e inverso',
    'color.ok': '✓ Color: {nombre}',
    'orden.alfabetico': 'Alfabetico',
    'orden.alfabeticoHint': 'de la A a la Z',
    'orden.recientes': 'Recientes primero',
    'orden.recientesHint': 'los ultimos que abriste, arriba',
    'orden.ok': '✓ Orden: {nombre}',
    'propios.agregar': '+ Agregar agente…',
    'propios.agregado': '✓ Agregado: {nombre}',
    'propios.actualizados': '✓ Agentes personalizados actualizados',
    'propios.editar': 'Editar comandos',
    'propios.borrar': 'Borrar',
    'propios.guardado': '✓ Guardado: {nombre}',
    'propios.esDefecto': 'Es el agente por defecto: elige otro antes de borrarlo',
    'propios.borrado': '✓ Borrado: {nombre}',
    'mascota.saludo': 'Ave Omnissiah. El espiritu maquina espera.',
    'config.mascota': 'Mascota',
    'mascota.visible': 'visible',
    'mascota.oculta': 'oculta',
    'mascota.sinColor': 'no se ve con el tema sobrio',
    'mascota.ok': '✓ Mascota: {estado}',
    'idioma.auto': 'Automatico ({actual})',
    'idioma.autoHint': 'el del sistema',
    'idioma.ok': '✓ Idioma: {nombre}',
    'version.actual': 'version {v}',
    'version.nueva': 'version {v} · hay una nueva: {nueva}',
    'act.copiaLocal': 'Estas usando una copia local del repo: actualizala con git pull',
    'act.buscando': 'Buscando la ultima version en npm…',
    'act.sinConexion': 'No pude consultar npm. Actualiza a mano: {cmd}',
    'act.alDia': '✓ Ya tienes la ultima version ({v})',
    'act.hayNueva': 'Hay una version nueva: {v}',
    'act.tienes': '(tienes la {v})',
    'act.ahora': 'Actualizar ahora',
    'act.noAhora': 'Ahora no',
    'act.listo': '\n✓ dev-launcher actualizado a la {v}. Escribe {dev} para abrirlo.',
    'act.fallo': '\nNo se pudo actualizar (npm salio con el codigo {codigo}).',
    'act.reintentar': 'Si la version es muy reciente, npm puede tardar unos minutos en tenerla lista: prueba de nuevo en un rato.',
    'act.eacces': 'Si es un error de permisos (EACCES), la solucion esta en el README (seccion Update / Actualizar).',
    'act.manual': 'No se pudo actualizar. Prueba a mano: {cmd}',
    'apoyar.github': 'sin comision, con tu cuenta de GitHub',
    'apoyar.kofi': 'sin crear cuenta, con tarjeta o PayPal',
    'apoyar.subtitulo': '(gracias por pensarlo!)',
    'apoyar.abriendo': '✓ Abriendo {url} en el navegador. Gracias!',
    'apoyar.enlace': 'Puedes apoyar el proyecto en {url}  Gracias!',

    ayuda: ({ c, agentes, config, apoyo }) => `
${c.negrita('dev')} - abre tus proyectos con tu agente de IA favorito

${c.acento('Uso')}
  dev                    Menu con tus proyectos y luego como abrirlo
                         (elegir anterior / continuar / nueva)
  dev <proyecto>         Abre ese proyecto (acepta parte del nombre)
  dev -n, --nueva        Conversacion nueva (sin preguntar)
  dev -c, --continuar    Continua la ultima conversacion
  dev -r, --elegir       Lista de conversaciones anteriores para elegir
  dev -a, --agente [id]  Cambia el agente de ese proyecto y lo recuerda
                         (sin id muestra un menu)
  dev -l, --lista        Muestra tus proyectos y sale
  dev --lang es|en       Idioma de la interfaz solo esta vez
  dev --config           Abre la configuracion: carpetas de proyectos, agente,
                         color, orden, idioma... (tambien esta al final del menu)
  dev ... -- <args>      Pasa argumentos extra al agente (ej: dev web -- --model opus)

${c.acento('Agentes incluidos')}
  ${agentes} (y puedes agregar uno propio en la configuracion)

Configuracion: ${config}
Apoya el proyecto: ${apoyo}
`,
  },

  en: {
    'menu.filtrar': 'Type to filter',
    'menu.buscar': 'Search',
    'menu.sinResultados': '(no results)',
    'menu.mas': 'more',
    'ayuda.salir': 'Arrows: move · Enter: open · Esc: quit',
    'ayuda.volver': 'Arrows: move · Enter: select · Esc: back',
    'ayuda.elegir': 'Arrows: move · Enter: select',
    'ayuda.modo': 'Arrows: move · Enter: open · Esc: back to projects',
    'ayuda.color': 'Arrows: try · Enter: save · Esc: back without changes',
    'ayuda.apoyar': 'Arrows: move · Enter: open in your browser · Esc: back',
    'tema.cian': 'Cyan', 'tema.verde': 'Green', 'tema.azul': 'Blue',
    'tema.magenta': 'Magenta', 'tema.amarillo': 'Yellow', 'tema.rojo': 'Red', 'tema.sobrio': 'Plain',

    'modo.elegir': 'Pick an earlier conversation',
    'modo.continuar': 'Continue the last conversation',
    'modo.nueva': 'Start a new conversation',
    'nota.gemini': 'In Gemini CLI, open the session list with /resume inside the chat.',
    'nota.opencode': 'In OpenCode, open the session list with /sessions inside the chat.',
    'agente.instalado': '✓ installed',
    'agente.noEncontrado': 'not found',

    'proyectos.titulo': 'Choose a project',
    'proyectos.carpetas': '{n} folders',
    'proyectos.configuracion': '≡ Settings…',
    'proyectos.claves': 'settings,config,options,update',
    'proyectos.versionNueva': '· new version available: {v}',
    'proyectos.faltaCarpeta': 'Can\'t find the folder {ruta}. If you no longer use it, unlink it in Settings.',
    'proyectos.noEncontre': 'Couldn\'t find "{q}" in your project folders.',
    'proyectos.indica': 'Specify the project: dev <project>',
    'proyectos.ninguno': 'There are no projects in your folders.',
    'proyectos.ningunoVincula': 'There are no projects in your folders. Link another one in Settings.',
    'modo.titulo': '{proyecto}  {agente}  -  How should I open it?',
    'modo.cambiarAgente': 'Change agent…',
    'modo.soloEste': 'for this project only',
    'modo.noPermite': '{agente} can\'t "{pedido}" at startup; using "{modo}" instead.',
    'agente.titulo': '{proyecto}  -  Which agent for this project?',
    'agente.falta': 'Can\'t find "{bin}" ({nombre}). Install it or choose another one.',
    'agente.desconocido': 'Unknown agent: {id}',
    'agente.indica': 'Specify the agent: dev -a <id>  ({lista})',
    'error.agenteNoExiste': 'The agent "{id}" doesn\'t exist. Run "dev --config".',
    'error.faltaAgente': 'Can\'t find "{bin}" ({nombre}). Install it or change this project\'s agent with "dev {proyecto} -a".',
    'error.ejecutar': 'Couldn\'t run "{cmd}": {msg}',
    'error.opcion': 'Unknown option: {op}',
    'error.usaAyuda': 'Run "dev --help" to see the options.',
    'error.idioma': 'Unsupported language: {id} (use es or en)',
    'error.configTerminal': 'Settings are changed from the terminal. File: {ruta}',
    bienvenida: 'Welcome to dev. Let\'s set up your projects folder and your agent.',

    'n.proyectos': ({ n }) => (n === 1 ? '1 project' : `${n} projects`),
    'n.vinculadas': ({ n }) => `${n} linked`,
    'modo.preguntarCada': 'ask every time',
    'modo.siempre': 'always: {modo}',
    'modoDef.preguntar': 'Ask every time (menu when opening the project)',
    'modoDef.recomendado': 'recommended',
    'modoDef.siempre': 'Always: {modo}',
    'modoDef.titulo': 'What to do when opening a project?',
    'carpeta.ayuda': '   Type the path (Tab autocompletes) or press Enter to open the folder picker.',
    'carpeta.ruta': '   Path: ',
    'carpeta.selector': 'Choose the folder where you keep your projects',
    'carpeta.selectorFallo': '   Couldn\'t open the folder picker, or it was canceled. Type the path.',
    'carpeta.noExiste': '   That folder doesn\'t exist: {ruta}',
    'propio.titulo': '\nCustom agent',
    'propio.editar': '\nEdit {nombre}',
    'propio.instrucciones': 'Type the full command that opens the agent in each case.',
    'propio.mantener': 'Enter keeps the current value; "-" removes an optional command.',
    'propio.omitir': ' (Enter to skip)',
    'propio.nombre': 'Name (e.g. My Agent)',
    'propio.nueva': 'Command for a new conversation (required, e.g. myagent)',
    'propio.continuar': 'Command to continue the last one',
    'propio.elegir': 'Command to pick an earlier one',
    'inicial.titulo': '\n=== dev setup ===\n',
    'inicial.paso1': '1) Folder where you keep your projects',
    'inicial.masCarpetas': '   You can link more folders later, from "Settings" in the menu.\n',
    'inicial.otro': 'Other: add a custom agent',
    'inicial.paso2': '2) Which agent do you use?',
    'inicial.agenteOk': '2) Agent: ✓ {nombre}\n',
    'inicial.avisoAgente': '   Note: can\'t find the command "{bin}". Install it before using dev.\n',
    'inicial.paso3': '3) What to do when opening a project?',
    'inicial.modoOk': '3) When opening: ✓ {modo}\n',
    'inicial.listo': 'Done.',
    'inicial.escribe': ' Type {dev} to open the project menu.',
    'inicial.guardada': 'Settings saved to {ruta}\n',
    'config.titulo': 'Settings',
    'config.carpetas': 'Project folders',
    'config.agente': 'Default agent',
    'config.modo': 'When opening a project',
    'config.color': 'Menu color',
    'config.orden': 'Project order',
    'config.propios': 'Custom agents',
    'config.ninguno': 'none',
    'config.idioma': 'Language',
    'config.actualizar': 'Update dev-launcher',
    'config.apoyar': 'Buy me a Warhammer mini',
    'config.apoyarHint': 'Support this project ♥',
    'config.volver': 'Back to projects',
    volver: 'Back',
    'carpetas.vincular': '+ Link another folder…',
    'carpetas.vincularTitulo': 'Link a project folder',
    'carpetas.yaVinculada': 'That folder was already linked',
    'carpetas.vinculada': '✓ Linked: {ruta}',
    'carpetas.actualizadas': '✓ Folders updated',
    'carpetas.noExiste': 'missing',
    'carpetas.desvincular': 'Unlink',
    'carpetas.desvincularHint': 'stops showing its projects; deletes nothing from disk',
    'carpetas.unica': 'It\'s the only folder: link another one before unlinking it',
    'carpetas.desvinculada': '✓ Unlinked: {nombre}',
    'agenteDef.titulo': 'Default agent (projects with their own agent keep it)',
    'agenteDef.ok': '✓ Default agent: {nombre}',
    'agenteDef.falta': 'Default agent: {nombre} (can\'t find "{bin}", install it)',
    'modo.ok': '✓ When opening: {modo}',
    'color.titulo': 'Menu color (preview as you move)',
    'color.porDefecto': 'default',
    'color.sobrio': 'no color: bold and inverse',
    'color.ok': '✓ Color: {nombre}',
    'orden.alfabetico': 'Alphabetical',
    'orden.alfabeticoHint': 'from A to Z',
    'orden.recientes': 'Recent first',
    'orden.recientesHint': 'the ones you opened last, on top',
    'orden.ok': '✓ Order: {nombre}',
    'propios.agregar': '+ Add agent…',
    'propios.agregado': '✓ Added: {nombre}',
    'propios.actualizados': '✓ Custom agents updated',
    'propios.editar': 'Edit commands',
    'propios.borrar': 'Delete',
    'propios.guardado': '✓ Saved: {nombre}',
    'propios.esDefecto': 'It\'s the default agent: choose another one before deleting it',
    'propios.borrado': '✓ Deleted: {nombre}',
    'mascota.saludo': 'Praise the Omnissiah. The machine spirit awaits.',
    'config.mascota': 'Mascot',
    'mascota.visible': 'shown',
    'mascota.oculta': 'hidden',
    'mascota.sinColor': 'not shown with the plain theme',
    'mascota.ok': '✓ Mascot: {estado}',
    'idioma.auto': 'Automatic ({actual})',
    'idioma.autoHint': 'from the system',
    'idioma.ok': '✓ Language: {nombre}',
    'version.actual': 'version {v}',
    'version.nueva': 'version {v} · new: {nueva}',
    'act.copiaLocal': 'You\'re running a local copy of the repo: update it with git pull',
    'act.buscando': 'Checking npm for the latest version…',
    'act.sinConexion': 'Couldn\'t reach npm. Update manually: {cmd}',
    'act.alDia': '✓ You already have the latest version ({v})',
    'act.hayNueva': 'A new version is available: {v}',
    'act.tienes': '(you have {v})',
    'act.ahora': 'Update now',
    'act.noAhora': 'Not now',
    'act.listo': '\n✓ dev-launcher updated to {v}. Type {dev} to open it.',
    'act.fallo': '\nCouldn\'t update (npm exited with code {codigo}).',
    'act.reintentar': 'If the version is very recent, npm may need a few minutes to have it ready: try again in a while.',
    'act.eacces': 'If it\'s a permissions error (EACCES), see the "Update" section of the README.',
    'act.manual': 'Couldn\'t update. Try manually: {cmd}',
    'apoyar.github': 'no fees, with your GitHub account',
    'apoyar.kofi': 'no account needed, card or PayPal',
    'apoyar.subtitulo': '(thanks for even thinking about it!)',
    'apoyar.abriendo': '✓ Opening {url} in your browser. Thank you!',
    'apoyar.enlace': 'You can support the project at {url}  Thank you!',

    ayuda: ({ c, agentes, config, apoyo }) => `
${c.negrita('dev')} - open your projects with your favorite AI agent

${c.acento('Usage')}
  dev                    Project menu, then how to open it
                         (pick earlier / continue / new)
  dev <project>          Open that project (partial names work)
  dev -n, --new          New conversation (no menu)
  dev -c, --continue     Continue the last conversation
  dev -r, --resume       List earlier conversations to pick one
  dev -a, --agent [id]   Change that project's agent and remember it
                         (no id shows a menu)
  dev -l, --list         List your projects and exit
  dev --lang es|en       Interface language for this run only
  dev --config           Open the settings: project folders, agent,
                         color, order, language... (also at the end of the menu)
  dev ... -- <args>      Pass extra arguments to the agent (e.g. dev web -- --model opus)

${c.acento('Included agents')}
  ${agentes} (and you can add your own in the settings)

Settings: ${config}
Support the project: ${apoyo}
`,
  },
};

const NOMBRES = { es: 'Espanol', en: 'English' };
let idioma = 'es';

function detectarIdioma() {
  const env = process.env;
  let local = env.DEV_LAUNCHER_LANG || '';
  // en Windows LANG suele venir de Git Bash u otras herramientas, no del sistema
  if (!local && process.platform !== 'win32') local = env.LC_ALL || env.LC_MESSAGES || env.LANG || '';
  if (!local || local === 'C' || local === 'POSIX') {
    try { local = Intl.DateTimeFormat().resolvedOptions().locale; } catch (e) { local = ''; }
  }
  return /^es\b|^es[-_]/i.test(local) ? 'es' : 'en';
}

// Fija el idioma: 'es', 'en', o cualquier otro valor (auto) para detectarlo
function fijarIdioma(id) {
  idioma = TEXTOS[id] ? id : detectarIdioma();
  return idioma;
}

function texto(id, clave, vars = {}) {
  const s = TEXTOS[id][clave] !== undefined ? TEXTOS[id][clave] : TEXTOS.es[clave];
  if (s === undefined) return clave;
  if (typeof s === 'function') return s(vars);
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

const t = (clave, vars) => texto(idioma, clave, vars);

module.exports = { t, texto, fijarIdioma, detectarIdioma, idiomaActual: () => idioma, IDIOMAS: Object.keys(TEXTOS), NOMBRES };
