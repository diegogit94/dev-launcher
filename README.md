<div align="center">

# dev-launcher

**Pick a project, pick how to open it, and your AI coding agent starts right there.**

[![npm](https://img.shields.io/npm/v/dev-launcher?color=cb3837&logo=npm)](https://www.npmjs.com/package/dev-launcher)
[![license](https://img.shields.io/github/license/diegogit94/dev-launcher)](LICENSE)
![node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-informational)

English · [Español](README.es.md)

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/usage.gif" alt="dev-launcher demo: choosing a project and how to open it" width="760">

</div>

---

Tired of `cd`-ing into a folder every time you want to talk to your coding agent? Type `dev`, choose a project from a menu, choose whether to **resume an earlier conversation, continue the last one or start fresh**, and the agent opens inside that folder.

- **Works with any agent:** Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot CLI, Cursor CLI, OpenCode, Aider, or your own.
- **Cross-platform:** Windows (PowerShell, cmd, Windows Terminal), macOS and Linux.
- **Remembers per project** which option you used last, so `Enter` is usually all you need.
- **A different agent per project** if you want: Claude Code for one, Codex for another.
- **Several project folders**, all shown in one list.
- **Settings right from the menu:** folders, default agent, menu color, sort order and custom agents.
- **Type to filter** long project lists, or jump straight in with `dev <part-of-name>`.
- **Zero dependencies:** a single small Node.js package.

> **Note:** the interface is currently in Spanish (the screenshots below show it as-is). The commands and flags work the same for everyone.

## Install

Requires [Node.js](https://nodejs.org) 18+ and the agent you want to use.

```bash
npm install -g dev-launcher
dev --config
```

Or straight from GitHub:

```bash
npm install -g github:diegogit94/dev-launcher
```

> **Don't forget `-g`.** Without it, npm installs the package into the current folder instead of making the `dev` command available everywhere.
>
> **On Windows:**
> - If you get `EPERM: operation not permitted, mkdir 'C:\WINDOWS\system32\node_modules'`, you ran `npm i dev-launcher` without `-g` from a terminal opened as Administrator (which starts in `system32`). Run `npm install -g dev-launcher` instead. You don't need Administrator.
> - If PowerShell says it can't load `dev.ps1` because running scripts is disabled, run this once and try again:
>   ```powershell
>   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
>   ```

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/install.gif" alt="Installing dev-launcher and running the setup" width="760">

The first-time setup asks three things:

1. **Your projects folder.** Type the path (Tab autocompletes) or press Enter to pick it with your system's folder dialog.
2. **Your agent.** Installed agents are detected and marked.
3. **What to do when opening a project:** ask every time (recommended) or always use the same option.

You can link more project folders later from the settings.

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/setup-agent.png" alt="Choosing an agent during setup" width="620">

## Update

The same command on Windows, macOS and Linux:

```bash
npm install -g dev-launcher@latest
```

Check your version with `dev --version`. You can also update from the menu: **≡ Configuracion… → Actualizar dev-launcher**. `dev` checks npm once a day in the background (it never slows down the menu) and shows **"hay una version nueva"** next to *Configuracion* when there is one. To turn that check off, set the environment variable `DEV_LAUNCHER_NO_UPDATE_CHECK=1`.

- **Windows:** use a normal terminal, not one opened as Administrator (see the `EPERM` note above).
- **macOS / Linux:** if you get `EACCES: permission denied`, Node.js was installed for the whole system. The clean fix is to install Node with a version manager like [nvm](https://github.com/nvm-sh/nvm) or to [change npm's global folder](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally); `sudo npm install -g dev-launcher@latest` also works.
- **Installed from GitHub?** Update the same way with `npm install -g github:diegogit94/dev-launcher`.

## Usage

```bash
dev
```

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/project-menu.png" alt="Project menu with type-to-filter"></td>
    <td><img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/open-menu.png" alt="Menu to resume, continue or start a new conversation"></td>
  </tr>
  <tr>
    <td align="center"><sub>1. Choose a project (type to filter)</sub></td>
    <td align="center"><sub>2. Choose how to open it</sub></td>
  </tr>
</table>

Arrow keys move, Enter opens, Esc goes back. Skip the menus with flags when you already know what you want:

| Command | What it does |
|---|---|
| `dev` | Project menu, then how to open it |
| `dev <project>` | Opens that project (partial names work: `dev shop`) |
| `dev -r`, `--resume` | Pick an earlier conversation |
| `dev -c`, `--continue` | Continue the last conversation |
| `dev -n`, `--new` | Start a new conversation |
| `dev <project> -a [agent]` | Change that project's agent and remember it (no name shows a menu) |
| `dev -l`, `--list` | List your projects |
| `dev --config` | Open the settings (also the last option in the project menu) |
| `dev web -- --model opus` | Pass extra arguments to the agent |

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/flags.gif" alt="Opening projects directly with flags and another agent" width="760">

If `dev` clashes with another command on your system, `dev-launcher` does exactly the same.

## Supported agents

| Agent | `id` | New | Continue last | Pick earlier |
|---|---|---|---|---|
| Claude Code | `claude` | `claude` | `claude --continue` | `claude --resume` |
| OpenAI Codex | `codex` | `codex` | `codex resume --last` | `codex resume` |
| Gemini CLI | `gemini` | `gemini` | `gemini --resume` | `/resume` inside the chat |
| GitHub Copilot CLI | `copilot` | `copilot` | `copilot --continue` | `copilot --resume` |
| Cursor CLI | `cursor` | `agent` | `agent --continue` | `agent ls` |
| OpenCode | `opencode` | `opencode` | `opencode --continue` | `/sessions` inside the chat |
| Aider | `aider` | `aider` | `aider --restore-chat-history` | — |

When an agent can't do an option at startup, that option is hidden from the menu.

### A different agent per project

Every project uses the default agent from the settings, unless you give it its own:

- From the menu: open the project and choose **"Cambiar de agente…"** in the second menu.
- From the command line: `dev api -a codex` (or `dev api -a` to pick from a menu).

`dev` remembers that choice, and from then on `dev api` opens with Codex. Projects with their own agent show its name in the project menu. Choosing the default agent again puts the project back on the default.

### Adding your own agent

In the settings, choose **Agentes personalizados → Agregar agente…** and type the commands for each case. From there you can also edit or delete them later. They're saved in your config file:

```json
{
  "carpetas": ["/Users/you/Dev", "/Users/you/Work"],
  "agente": "my-agent",
  "modo": "preguntar",
  "agentesPersonalizados": {
    "my-agent": {
      "nombre": "My Agent",
      "bin": "myagent",
      "nueva": "myagent",
      "continuar": "myagent --continue",
      "elegir": null
    }
  }
}
```

## Configuration

Open the settings with the last option of the project menu, **"≡ Configuracion…"** (press ↑ from the first project, or type `config`), or with `dev --config`. Every change is saved right away:

| Setting | What it does |
|---|---|
| Carpetas de proyectos | Link more project folders or unlink one (unlinking never deletes anything from disk). With several folders, the menu shows which one each project comes from. |
| Agente por defecto | The agent for every project that doesn't have its own. |
| Al abrir un proyecto | Ask every time (recommended) or always use the same option. |
| Color del menu | Cyan, green, blue, magenta, yellow or plain (no color). You see each one as you move over it. |
| Orden de proyectos | Alphabetical, or the ones you opened last first. |
| Agentes personalizados | Add, edit or delete your own agents. |
| Actualizar dev-launcher | Shows your version, checks npm and installs the new one if there is one. |

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/settings.gif" alt="Settings menu: project folders and a live preview of the menu colors" width="760">

Settings live in `~/.dev-launcher.json` (on Windows: `C:\Users\<you>\.dev-launcher.json`).

## Uninstall

```bash
npm uninstall -g dev-launcher
```

## License

[MIT](LICENSE) © Diego
