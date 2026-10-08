<div align="center">

# dev-launcher

**Elige un proyecto, elige cómo abrirlo y tu agente de IA arranca ahí mismo.**

[![npm](https://img.shields.io/npm/v/dev-launcher?color=cb3837&logo=npm)](https://www.npmjs.com/package/dev-launcher)
[![licencia](https://img.shields.io/github/license/diegogit94/dev-launcher)](LICENSE)
![node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![plataformas](https://img.shields.io/badge/plataforma-Windows%20%7C%20macOS%20%7C%20Linux-informational)

[English](README.md) · Español

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/usage.gif" alt="Demo de dev-launcher: elegir un proyecto y cómo abrirlo" width="760">

</div>

---

¿Cansado de hacer `cd` a una carpeta cada vez que quieres hablar con tu agente? Escribe `dev`, elige el proyecto en un menú, elige si quieres **retomar una conversación anterior, continuar la última o empezar una nueva**, y el agente se abre dentro de esa carpeta.

- **Funciona con cualquier agente:** Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot CLI, Cursor CLI, OpenCode, Aider o el tuyo.
- **Multiplataforma:** Windows (PowerShell, cmd, Windows Terminal), macOS y Linux.
- **Recuerda por proyecto** la última opción que usaste, así que casi siempre basta con Enter.
- **Un agente distinto por proyecto** si quieres: Claude Code en uno, Codex en otro.
- **Escribe para filtrar** listas largas de proyectos, o entra directo con `dev <parte-del-nombre>`.
- **Sin dependencias:** un solo paquete pequeño de Node.js.

## Instalación

Requiere [Node.js](https://nodejs.org) 18 o superior y el agente que vayas a usar.

```bash
npm install -g dev-launcher
dev --config
```

O directo desde GitHub:

```bash
npm install -g github:diegogit94/dev-launcher
```

> **No olvides el `-g`.** Sin él, npm instala el paquete en la carpeta actual y el comando `dev` no queda disponible en todas partes.
>
> **En Windows:**
> - Si te sale `EPERM: operation not permitted, mkdir 'C:\WINDOWS\system32\node_modules'`, ejecutaste `npm i dev-launcher` sin `-g` desde una terminal abierta como Administrador (que arranca en `system32`). Usa `npm install -g dev-launcher`. No necesitas ser Administrador.
> - Si PowerShell dice que no puede cargar `dev.ps1` porque la ejecución de scripts está deshabilitada, ejecuta esto una vez y vuelve a intentar:
>   ```powershell
>   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
>   ```

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/install.gif" alt="Instalación de dev-launcher y configuración inicial" width="760">

La primera vez te pregunta tres cosas:

1. **Tu carpeta de proyectos.** Escribe la ruta (Tab autocompleta) o presiona Enter para elegirla con el explorador de tu sistema.
2. **Tu agente.** Detecta y marca los que tienes instalados.
3. **Qué hacer al abrir un proyecto:** preguntar cada vez (recomendado) o usar siempre la misma opción.

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/setup-agent.png" alt="Elección del agente en la configuración" width="620">

## Uso

```bash
dev
```

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/project-menu.png" alt="Menú de proyectos con filtro"></td>
    <td><img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/open-menu.png" alt="Menú para retomar, continuar o abrir una conversación nueva"></td>
  </tr>
  <tr>
    <td align="center"><sub>1. Elige un proyecto (escribe para filtrar)</sub></td>
    <td align="center"><sub>2. Elige cómo abrirlo</sub></td>
  </tr>
</table>

Flechas para moverte, Enter para abrir, Esc para volver. Si ya sabes lo que quieres, sáltate los menús con flags:

| Comando | Qué hace |
|---|---|
| `dev` | Menú de proyectos y luego cómo abrirlo |
| `dev <proyecto>` | Abre ese proyecto (acepta parte del nombre: `dev shop`) |
| `dev -r`, `--elegir` | Elegir una conversación anterior |
| `dev -c`, `--continuar` | Continuar la última conversación |
| `dev -n`, `--nueva` | Conversación nueva |
| `dev <proyecto> -a [agente]` | Cambia el agente de ese proyecto y lo recuerda (sin nombre muestra un menú) |
| `dev -l`, `--lista` | Lista tus proyectos |
| `dev --config` | Cambia la carpeta, el agente o el comportamiento por defecto |
| `dev web -- --model opus` | Pasa argumentos extra al agente |

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/flags.gif" alt="Abrir proyectos directo con flags y con otro agente" width="760">

Si el nombre `dev` choca con otro comando en tu sistema, `dev-launcher` hace exactamente lo mismo.

## Agentes incluidos

| Agente | `id` | Nueva | Continuar la última | Elegir anterior |
|---|---|---|---|---|
| Claude Code | `claude` | `claude` | `claude --continue` | `claude --resume` |
| OpenAI Codex | `codex` | `codex` | `codex resume --last` | `codex resume` |
| Gemini CLI | `gemini` | `gemini` | `gemini --resume` | `/resume` dentro del chat |
| GitHub Copilot CLI | `copilot` | `copilot` | `copilot --continue` | `copilot --resume` |
| Cursor CLI | `cursor` | `agent` | `agent --continue` | `agent ls` |
| OpenCode | `opencode` | `opencode` | `opencode --continue` | `/sessions` dentro del chat |
| Aider | `aider` | `aider` | `aider --restore-chat-history` | — |

Si un agente no permite una opción al iniciar, esa opción no aparece en el menú.

### Un agente distinto por proyecto

Cada proyecto usa el agente que elegiste en `dev --config`, salvo que le asignes uno propio:

- Desde el menú: abre el proyecto y elige **"Cambiar de agente…"** en el segundo menú.
- Desde la línea de comandos: `dev api -a codex` (o `dev api -a` para elegirlo en un menú).

`dev` recuerda esa elección y desde entonces `dev api` abre con Codex. Los proyectos con agente propio muestran su nombre en el menú de proyectos. Si vuelves a elegir el agente por defecto, el proyecto vuelve a seguir al de por defecto.

### Agregar tu propio agente

En `dev --config` elige **"Otro: agregar un agente personalizado"** y escribe los comandos de cada caso. Se guardan en tu archivo de configuración, donde también puedes editarlos:

```json
{
  "root": "C:\\Users\\tu-usuario\\Dev",
  "agente": "mi-agente",
  "modo": "preguntar",
  "agentesPersonalizados": {
    "mi-agente": {
      "nombre": "Mi Agente",
      "bin": "miagente",
      "nueva": "miagente",
      "continuar": "miagente --continue",
      "elegir": null
    }
  }
}
```

## Configuración

Se guarda en `~/.dev-launcher.json` (en Windows: `C:\Users\<tu usuario>\.dev-launcher.json`). Corre `dev --config` cuando quieras cambiarla.

## Desinstalar

```bash
npm uninstall -g dev-launcher
```

## Licencia

[MIT](LICENSE) © Diego
