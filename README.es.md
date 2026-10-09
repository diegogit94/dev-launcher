<div align="center">

# dev-launcher

**Elige un proyecto, elige cómo abrirlo y tu agente de IA arranca ahí mismo.**

[![npm](https://img.shields.io/npm/v/dev-launcher?color=cb3837&logo=npm)](https://www.npmjs.com/package/dev-launcher)
[![licencia](https://img.shields.io/github/license/diegogit94/dev-launcher)](LICENSE)
![node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![plataformas](https://img.shields.io/badge/plataforma-Windows%20%7C%20macOS%20%7C%20Linux-informational)

[English](README.md) · Español

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/usage-es.gif" alt="Demo de dev-launcher: elegir un proyecto y cómo abrirlo" width="760">

</div>

---

¿Cansado de hacer `cd` a una carpeta cada vez que quieres hablar con tu agente? Escribe `dev`, elige el proyecto en un menú, elige si quieres **retomar una conversación anterior, continuar la última o empezar una nueva**, y el agente se abre dentro de esa carpeta.

- **Funciona con cualquier agente:** Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot CLI, Cursor CLI, OpenCode, Aider o el tuyo.
- **Multiplataforma:** Windows (PowerShell, cmd, Windows Terminal), macOS y Linux.
- **En español e inglés:** usa el idioma de tu sistema, o elige uno en la configuración.
- **Recuerda por proyecto** la última opción que usaste, así que casi siempre basta con Enter.
- **Un agente distinto por proyecto** si quieres: Claude Code en uno, Codex en otro.
- **Varias carpetas de proyectos**, todas en una sola lista.
- **Configuración desde el mismo menú:** carpetas, agente por defecto, color del menú, orden y agentes personalizados.
- **Escribe para filtrar** listas largas de proyectos, o entra directo con `dev <parte-del-nombre>`.
- **Un tech-priest en pixel art** te saluda arriba del menú de proyectos (lo puedes ocultar).
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

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/install-es.gif" alt="Instalación de dev-launcher y configuración inicial" width="760">

La primera vez te pregunta tres cosas:

1. **Tu carpeta de proyectos.** Escribe la ruta (Tab autocompleta) o presiona Enter para elegirla con el explorador de tu sistema.
2. **Tu agente.** Detecta y marca los que tienes instalados.
3. **Qué hacer al abrir un proyecto:** preguntar cada vez (recomendado) o usar siempre la misma opción.

Después puedes vincular más carpetas de proyectos desde la configuración.

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/setup-agent-es.png" alt="Elección del agente en la configuración" width="620">

## Actualizar

El mismo comando en Windows, macOS y Linux:

```bash
npm install -g dev-launcher@latest
```

Revisa tu versión con `dev --version`. También puedes actualizar desde el menú: **≡ Configuracion… → Actualizar dev-launcher**. `dev` revisa npm una vez al día en segundo plano (nunca hace esperar al menú) y, si hay una versión nueva, lo indica al lado de *Configuracion* con **"hay una version nueva"**. Para desactivar esa revisión, define la variable de entorno `DEV_LAUNCHER_NO_UPDATE_CHECK=1`.

- **Windows:** usa una terminal normal, no una abierta como Administrador (mira la nota del `EPERM` más arriba).
- **macOS / Linux:** si te sale `EACCES: permission denied`, Node.js está instalado para todo el sistema. Lo más limpio es instalar Node con un gestor de versiones como [nvm](https://github.com/nvm-sh/nvm) o [cambiar la carpeta global de npm](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally); `sudo npm install -g dev-launcher@latest` también funciona.
- **¿Lo instalaste desde GitHub?** Se actualiza igual con `npm install -g github:diegogit94/dev-launcher`.

## Uso

```bash
dev
```

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/project-menu-es.png" alt="Menú de proyectos con filtro"></td>
    <td><img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/open-menu-es.png" alt="Menú para retomar, continuar o abrir una conversación nueva"></td>
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
| `dev --lang es\|en` | Idioma de la interfaz solo esa vez |
| `dev --config` | Abre la configuración (también es la última opción del menú de proyectos) |
| `dev web -- --model opus` | Pasa argumentos extra al agente |

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/flags-es.gif" alt="Abrir proyectos directo con flags y con otro agente" width="760">

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

Cada proyecto usa el agente por defecto de la configuración, salvo que le asignes uno propio:

- Desde el menú: abre el proyecto y elige **"Cambiar de agente…"** en el segundo menú.
- Desde la línea de comandos: `dev api -a codex` (o `dev api -a` para elegirlo en un menú).

`dev` recuerda esa elección y desde entonces `dev api` abre con Codex. Los proyectos con agente propio muestran su nombre en el menú de proyectos. Si vuelves a elegir el agente por defecto, el proyecto vuelve a seguir al de por defecto.

### Agregar tu propio agente

En la configuración elige **Agentes personalizados → Agregar agente…** y escribe los comandos de cada caso. Desde ahí también puedes editarlos o borrarlos después. Se guardan en tu archivo de configuración:

```json
{
  "carpetas": ["C:\\Users\\tu-usuario\\Dev", "C:\\Users\\tu-usuario\\Trabajo"],
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

Ábrela con la última opción del menú de proyectos, **"≡ Configuracion…"** (presiona ↑ desde el primer proyecto o escribe `config`), o con `dev --config`. Cada cambio se guarda al instante:

| Opción | Qué hace |
|---|---|
| Carpetas de proyectos | Vincula más carpetas de proyectos o desvincula una (desvincular nunca borra nada del disco). Con varias carpetas, el menú muestra de cuál viene cada proyecto. |
| Agente por defecto | El agente de todos los proyectos que no tienen uno propio. |
| Al abrir un proyecto | Preguntar cada vez (recomendado) o usar siempre la misma opción. |
| Color del menu | Cian, verde, azul, magenta, amarillo o sobrio (sin color). Cada uno se ve al pasar por encima. |
| Orden de proyectos | Alfabético, o los últimos que abriste primero. |
| Idioma | Automático (el de tu sistema), español o inglés. Cambia al instante. |
| Mascota | Muestra u oculta el tech-priest de arriba del menú de proyectos. También se oculta solo en terminales chicas, sin color o con el tema sobrio. |
| Agentes personalizados | Agrega, edita o borra tus propios agentes. |
| Actualizar dev-launcher | Muestra tu versión, consulta npm e instala la nueva si la hay. |
| Invitame una miniatura de Warhammer | Abre GitHub Sponsors o Ko-fi en el navegador, para dejar una propina (va para la mesa de pintura). |

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/settings-es.gif" alt="Menú de configuración: carpetas de proyectos y vista previa de los colores del menú" width="760">

Se guarda en `~/.dev-launcher.json` (en Windows: `C:\Users\<tu usuario>\.dev-launcher.json`).

## Desinstalar

```bash
npm uninstall -g dev-launcher
```

## Apoya el proyecto

dev-launcher es gratis y lo seguirá siendo. Si te ahorra tiempo y quieres dejar una propina, ¡gracias! Puedes hacerlo de dos formas:

- **[GitHub Sponsors](https://github.com/sponsors/diegogit94)**: una sola vez o cada mes, con tu cuenta de GitHub.
- **[Ko-fi](https://ko-fi.com/mr_hyde)**: sin crear cuenta, con tarjeta o PayPal.

También puedes abrirlas desde el menú: **≡ Configuracion… → Invitame una miniatura de Warhammer**. Darle una estrella al repo o reportar un error también ayuda.

## Licencia

[MIT](LICENSE) © Diego
