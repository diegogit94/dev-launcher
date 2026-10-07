# dev-launcher — contexto para Claude Code

CLI multiplataforma (Windows, macOS, Linux) que abre proyectos con un agente de IA. El usuario escribe `dev`, elige un proyecto de su carpeta de proyectos, elige cómo abrirlo (retomar una conversación anterior, continuar la última o una nueva) y el agente se lanza dentro de esa carpeta.

- Autor: Diego (GitHub `diegogit94`). Repo: https://github.com/diegogit94/dev-launcher (público).
- Paquete npm: `dev-launcher` (nombre libre al 2026-10-07, **todavía no publicado**).
- Comandos instalados: `dev` y `dev-launcher` (alias por si `dev` choca con otro programa).

## Estructura

```
bin/dev.js        CLI: parseo de argumentos, asistente de configuración (--config), flujo principal, lanzamiento del agente
lib/agents.js     PRESETS de agentes (comandos por modo), MODOS, resolverModo() (baja al siguiente modo disponible)
lib/config.js     leer/guardar ~/.dev-launcher.json, expandir rutas, existeComando() (PATH + PATHEXT), listarProyectos(), rutaCorta() (~)
lib/ui.js         menu() con flechas y filtro por texto, preguntar() con autocompletado de carpetas, selector de carpeta nativo
docs/assets/      GIFs y capturas del README (generados con scripts/demo)
scripts/demo/     rec.py (graba bash en un pty como asciicast) y gen.py (escenarios + render con agg)
README.md         en inglés (principal) · README.es.md en español
```

## Convenciones

- **Cero dependencias**, CommonJS, Node >= 18. No agregar paquetes de npm salvo que sea imprescindible.
- Código y mensajes en **español**. Los textos de la interfaz van **sin tildes** a propósito (evita problemas de codificación en consolas viejas); se permiten símbolos como `✓ › · ↑ ↓ …`.
- Finales de línea LF (lo fuerza `.gitattributes`). El shebang de `bin/dev.js` debe quedar en LF o falla en macOS/Linux.
- `package.json` → `files` publica solo `bin`, `lib` y los README; `docs/` y `scripts/` no van al paquete.

## Cómo funciona

- Config en `~/.dev-launcher.json` (en Windows `C:\Users\<user>\.dev-launcher.json`). Se puede cambiar con la variable de entorno `DEV_LAUNCHER_CONFIG` (útil para probar sin tocar la config real):
  ```json
  { "root": "...", "agente": "claude", "modo": "preguntar",
    "agentesPersonalizados": { "id": { "nombre", "bin", "nueva", "continuar", "elegir" } },
    "ultimoModo": { "<ruta completa del proyecto>": "continuar" } }
  ```
- `modo`: `preguntar` (por defecto y recomendado: muestra el segundo menú), o fijo `elegir` | `continuar` | `nueva`.
- `ultimoModo` guarda por proyecto la última opción elegida en el segundo menú y la deja preseleccionada.
- Flags `-n/--nueva/--new`, `-c/--continuar/--continue`, `-r/--elegir/--resume` saltan el segundo menú. `-a [id]` cambia de agente solo esa vez. `-l` lista proyectos. Todo lo que va después de `--` se pasa al agente.
- `dev <texto>`: coincidencia exacta, si no la única que contenga el texto; si hay varias abre el menú ya filtrado.
- El agente se ejecuta con `spawn(comando, { shell: true, stdio: 'inherit', cwd })`; `dev` ignora SIGINT mientras el agente corre y sale con su código.
- Si un agente no soporta un modo al iniciar (valor `null`), ese modo no aparece en el menú y `resolverModo` usa el siguiente.

## Agentes incluidos (verificados en la documentación oficial, oct-2026)

| id | nueva | continuar | elegir |
|---|---|---|---|
| claude | `claude` | `claude --continue` | `claude --resume` |
| codex | `codex` | `codex resume --last` | `codex resume` |
| gemini | `gemini` | `gemini --resume` | null (`/resume` dentro del chat) |
| copilot | `copilot` | `copilot --continue` | `copilot --resume` |
| cursor | `agent` | `agent --continue` | `agent ls` |
| opencode | `opencode` | `opencode --continue` | null (`/sessions` dentro del chat) |
| aider | `aider` | `aider --restore-chat-history` | null |

Copilot y Aider no quedaron 100% confirmados; si alguno falla, corregir en `lib/agents.js`.

## Probar

- Rápido: `node bin/dev.js --help`, `node bin/dev.js -l`, y con una config aislada:
  `DEV_LAUNCHER_CONFIG=/tmp/dev-test.json node bin/dev.js --config` (en PowerShell: `$env:DEV_LAUNCHER_CONFIG="$env:TEMP\dev-test.json"`).
- Instalarlo global desde la carpeta: `npm pack` y luego `npm install -g dev-launcher-<versión>.tgz` (no usar `npm install -g .`, que crea un symlink).
- Hasta ahora se probó en Linux, con agentes simulados y manejando la terminal por pty: configuración inicial, menús, filtro, recordar modo por proyecto, Esc para volver, flags, agente personalizado e instalación global. **Falta probar en Windows y macOS de verdad**: el selector de carpeta nativo (COM `Shell.Application` en Windows, `osascript` en mac, `zenity`/`kdialog` en Linux), el modo raw del teclado en Windows y el shim `dev.ps1` de npm en PowerShell (necesita ExecutionPolicy `RemoteSigned`).

## Regenerar GIFs y capturas

Si cambia la interfaz, regenerar con `python3 scripts/demo/gen.py` (o solo uno: `install`, `usage` o `flags`). Necesita Linux o WSL como root, Pillow, y `agg` más la fuente JetBrains Mono en `scripts/demo/tools/` (ver el docstring de `gen.py`). Copia el resultado a `docs/assets/`. El README enlaza las imágenes con URLs absolutas de `raw.githubusercontent.com/.../main/docs/assets/` para que se vean también en la página de npm.

## Publicar

1. Primera vez: `npm login` y `npm publish` (requiere 2FA en la cuenta de npm).
2. Actualizaciones: `npm version patch|minor` → `git push --follow-tags` → `npm publish`.
3. Hacer push a GitHub **no** publica en npm. Instalar con `npm i -g github:diegogit94/dev-launcher` sí toma lo último de `main`.

## Estado y pendientes (al 2026-10-07)

- [x] Primer commit subido a GitHub.
- [ ] Commit con README en inglés, README.es.md, GIFs, `scripts/demo` y este archivo (pendiente de push).
- [ ] Primera publicación en npm (manual).
- [ ] Workflow `.github/workflows/publish.yml` que publique en npm al crear un release, con **trusted publishing** (OIDC, sin token). Requiere que el paquete ya exista en npm y enlazar el repo y el workflow en la configuración del paquete en npmjs.com.
- [ ] Opcional: interfaz en inglés y español (detectar idioma del sistema o `--lang`), y luego regenerar los GIFs en inglés.
- [ ] Probar en Windows y macOS reales (ver "Probar").

## Historia (para no repetir caminos)

1. Empezó como una función `dev` en el perfil de PowerShell (`Documents\dev-claude.ps1`), solo Windows y solo Claude Code.
2. Pasó a un módulo de PowerShell (DevClaude) con un instalador `.cmd`; se descartó por ser solo Windows.
3. Se reescribió en Node.js para que sea multiplataforma y permita cualquier agente.
4. El modo "preguntar cada vez", con memoria por proyecto, reemplazó al modo fijo como opción por defecto.
