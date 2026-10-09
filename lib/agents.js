'use strict';

// Comandos por agente. Cada modo es el comando completo que se ejecuta
// dentro de la carpeta del proyecto. null = el agente no lo soporta al iniciar.
//   nueva     -> conversacion nueva
//   continuar -> retoma la ultima conversacion
//   elegir    -> muestra la lista de conversaciones anteriores para elegir
const PRESETS = {
  claude: {
    nombre: 'Claude Code',
    bin: 'claude',
    nueva: 'claude',
    continuar: 'claude --continue',
    elegir: 'claude --resume',
  },
  codex: {
    nombre: 'OpenAI Codex',
    bin: 'codex',
    nueva: 'codex',
    continuar: 'codex resume --last',
    elegir: 'codex resume',
  },
  gemini: {
    nombre: 'Gemini CLI',
    bin: 'gemini',
    nueva: 'gemini',
    continuar: 'gemini --resume',
    elegir: null,
    nota: 'nota.gemini', // clave de lib/i18n.js
  },
  copilot: {
    nombre: 'GitHub Copilot CLI',
    bin: 'copilot',
    nueva: 'copilot',
    continuar: 'copilot --continue',
    elegir: 'copilot --resume',
  },
  cursor: {
    nombre: 'Cursor CLI',
    bin: 'agent',
    nueva: 'agent',
    continuar: 'agent --continue',
    elegir: 'agent ls',
  },
  opencode: {
    nombre: 'OpenCode',
    bin: 'opencode',
    nueva: 'opencode',
    continuar: 'opencode --continue',
    elegir: null,
    nota: 'nota.opencode',
  },
  aider: {
    nombre: 'Aider',
    bin: 'aider',
    nueva: 'aider',
    continuar: 'aider --restore-chat-history',
    elegir: null,
  },
};

// Modos en el orden del menu; el texto de cada uno esta en lib/i18n.js (modo.<id>)
const MODOS = { elegir: 'modo.elegir', continuar: 'modo.continuar', nueva: 'modo.nueva' };

// Devuelve todos los agentes disponibles: presets + personalizados del usuario
function todosLosAgentes(config) {
  const propios = (config && config.agentesPersonalizados) || {};
  return Object.assign({}, PRESETS, propios);
}

// Si el modo pedido no existe para el agente, baja al siguiente disponible
function resolverModo(agente, modo) {
  const orden = { elegir: ['elegir', 'continuar', 'nueva'], continuar: ['continuar', 'nueva'], nueva: ['nueva'] };
  for (const m of orden[modo] || ['nueva']) {
    if (agente[m]) return m;
  }
  return 'nueva';
}

module.exports = { PRESETS, MODOS, todosLosAgentes, resolverModo };
