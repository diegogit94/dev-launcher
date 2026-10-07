# dev-launcher

Abre tus proyectos con tu agente de IA desde un menú en la terminal. Funciona en **Windows, macOS y Linux**.

```
Elige un proyecto  (~/Dev)
  Buscar: lu
  > luca-app

luca-app  · Claude Code  -  Como lo abro?
  > Elegir una conversacion anterior   claude --resume
    Continuar la ultima conversacion   claude --continue
    Abrir una conversacion nueva       claude
```

Agentes incluidos: **Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot CLI, Cursor CLI, OpenCode y Aider**. También puedes agregar cualquier otro agente escribiendo sus comandos.

## Requisitos

- [Node.js](https://nodejs.org) 18 o superior
- El agente que vayas a usar, instalado (por ejemplo, `claude`)

## Instalación

```
npm install -g dev-launcher
dev --config
```

O directo desde GitHub:
```
npm install -g github:diegogit94/dev-launcher
```

La primera vez te pregunta:
1. La carpeta donde guardas tus proyectos (escríbela con Tab para autocompletar, o deja vacío y presiona Enter para elegirla con el explorador).
2. Qué agente usas (marca cuáles tienes instalados).
3. Qué hacer al abrir un proyecto: **preguntar cada vez** (recomendado) o usar siempre el mismo modo.

## Uso

| Comando | Qué hace |
|---|---|
| `dev` | Menú con tus proyectos (escribe para filtrar) y luego cómo abrirlo: elegir una conversación anterior, continuar la última o una nueva. Cada proyecto recuerda la última opción. |
| `dev <proyecto>` | Abre ese proyecto. Acepta parte del nombre. |
| `dev -n` | Conversación nueva (sin preguntar) |
| `dev -c` | Continúa la última conversación |
| `dev -r` | Lista de conversaciones anteriores para elegir |
| `dev -a [agente]` | Usa otro agente solo esta vez (sin nombre muestra un menú) |
| `dev -l` | Lista tus proyectos |
| `dev --config` | Cambia la carpeta, el agente o el modo por defecto |
| `dev web -- --model opus` | Pasa argumentos extra al agente |

Si el nombre `dev` choca con otro programa, usa `dev-launcher`, que hace lo mismo.

## Configuración

Se guarda en `~/.dev-launcher.json` (en Windows: `C:\Users\<tu usuario>\.dev-launcher.json`). Puedes editar ahí los comandos de un agente personalizado.

## Desinstalar

```
npm uninstall -g dev-launcher
```
