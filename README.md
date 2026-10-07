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

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/install.gif" alt="Installing dev-launcher and running the setup" width="760">

The first-time setup asks three things:

1. **Your projects folder.** Type the path (Tab autocompletes) or press Enter to pick it with your system's folder dialog.
2. **Your agent.** Installed agents are detected and marked.
3. **What to do when opening a project:** ask every time (recommended) or always use the same option.

<img src="https://raw.githubusercontent.com/diegogit94/dev-launcher/main/docs/assets/setup-agent.png" alt="Choosing an agent during setup" width="620">

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
| `dev -a [agent]` | Use another agent just this once (no name shows a menu) |
| `dev -l`, `--list` | List your projects |
| `dev --config` | Change folder, agent or default behavior |
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

### Adding your own agent

Choose **"Otro: agregar un agente personalizado"** in `dev --config` and type the commands for each case. They're saved in your config file, where you can also edit them:

```json
{
  "root": "/Users/you/Dev",
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

Settings live in `~/.dev-launcher.json` (on Windows: `C:\Users\<you>\.dev-launcher.json`). Run `dev --config` any time to change them.

## Uninstall

```bash
npm uninstall -g dev-launcher
```

## License

[MIT](LICENSE) © Diego
