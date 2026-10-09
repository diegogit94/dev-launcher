# dev-launcher — contexto para Claude Code

CLI multiplataforma (Windows, macOS, Linux) que abre proyectos con un agente de IA. El usuario escribe `dev`, elige un proyecto de su carpeta de proyectos, elige cómo abrirlo (retomar una conversación anterior, continuar la última o una nueva) y el agente se lanza dentro de esa carpeta.

- Autor: Diego (GitHub `diegogit94`). Repo: https://github.com/diegogit94/dev-launcher (público).
- Paquete npm: `dev-launcher` (publicado; 1.2.0 es la última versión en npm al 2026-10-08).
- Comandos instalados: `dev` y `dev-launcher` (alias por si `dev` choca con otro programa).

## Estructura

```
bin/dev.js        CLI: parseo de argumentos, menú de proyectos, segundo menú (modo / cambiar agente), lanzamiento del agente
lib/ajustes.js    asistente de la primera vez y menú de configuración (carpetas, agente, modo, color, orden, agentes personalizados)
lib/agents.js     PRESETS de agentes (comandos por modo), MODOS, resolverModo() (baja al siguiente modo disponible)
lib/config.js     leer/guardar ~/.dev-launcher.json (migra "root" a "carpetas"), expandir rutas, existeComando() (PATH + PATHEXT), listarTodos(), nombreCarpeta(), rutaCorta() (~)
lib/ui.js         menu() con flechas, filtro, hints alineados y alMover (vista previa), TEMAS de color, preguntar() con autocompletado de carpetas, selector de carpeta nativo
docs/assets/      GIFs y capturas del README (generados con scripts/demo)
scripts/demo/     gen.js (escenarios, grabación como asciicast y render con agg) y tty.js (terminal simulada para cada `dev`)
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
  { "carpetas": ["...", "..."], "agente": "claude", "modo": "preguntar",
    "color": "cian", "orden": "alfabetico",
    "agentesPersonalizados": { "id": { "nombre", "bin", "nueva", "continuar", "elegir" } },
    "ultimoModo": { "<ruta completa del proyecto>": "continuar" },
    "ultimoAgente": { "<ruta completa del proyecto>": "codex" },
    "ultimoUso": { "<ruta completa del proyecto>": 1791557244751 } }
  ```
- `carpetas`: carpetas de proyectos vinculadas. Hasta la 1.2.0 era una sola en `root`; `leerConfig()` la convierte sola. Todos los proyectos se muestran en una sola lista; con más de una carpeta, cada proyecto lleva de hint el nombre de su carpeta (`nombreCarpeta`: la ruta corta si dos carpetas se llaman igual). Una carpeta que ya no existe se avisa una vez y se ignora; no se puede desvincular la última.
- `color`: tema del menú (`TEMAS` en `lib/ui.js`: cian, verde, azul, magenta, amarillo, sobrio). Usar `color.acento` para títulos y no `color.cian`, así respeta el tema.
- `orden`: `alfabetico` o `recientes` (usa `ultimoUso`, que se guarda en cada lanzamiento).
- La última opción del menú de proyectos es `≡ Configuracion…` (el filtro la encuentra con `claves` desde 3 letras: "con", "aju", "opc"). `dev --config` abre el mismo menú; el asistente paso a paso (`configuracionInicial`) solo corre si no hay config. Cada cambio se guarda al instante.
- `modo`: `preguntar` (por defecto y recomendado: muestra el segundo menú), o fijo `elegir` | `continuar` | `nueva`.
- `ultimoModo` guarda por proyecto la última opción elegida en el segundo menú y la deja preseleccionada.
- `ultimoAgente` guarda el agente propio de cada proyecto (se elige con `Cambiar de agente…` en el segundo menú o con `-a`). Solo se guarda si es distinto de `agente`; si se vuelve a elegir el de por defecto, se borra la entrada y el proyecto sigue al de por defecto. Cambiar el agente por defecto (en la configuración) borra las entradas que quedan iguales al nuevo. Por eso el agente se resuelve **después** de elegir el proyecto.
- Flags `-n/--nueva/--new`, `-c/--continuar/--continue`, `-r/--elegir/--resume` saltan el segundo menú. `-a [id]` cambia el agente del proyecto y lo recuerda (sin id: menú de agentes después de elegir el proyecto; si el id no es un agente se toma como proyecto). `-l` lista proyectos. Todo lo que va después de `--` se pasa al agente.
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

Si cambia la interfaz, regenerar con `node scripts/demo/gen.js` (o solo algunos: `install`, `usage`, `flags`, `settings`). Funciona en Windows, macOS y Linux: cada `dev` corre de verdad en un proceso aparte con `tty.js` precargado, que simula la terminal (stdin/stdout TTY, teclas por IPC) y los agentes; no hace falta pty ni WSL. Necesita `agg` y la fuente JetBrains Mono en `scripts/demo/tools/` (`--descargar` los baja; la carpeta está en `.gitignore`) e ImageMagick (`magick`) para las capturas. Copia el resultado a `docs/assets/`. Revisar las capturas y algunos cuadros de los GIF: así se encontraron el ⚙ dibujado como emoji y el texto ilegible en los temas azul y magenta. El README enlaza las imágenes con URLs absolutas de `raw.githubusercontent.com/.../main/docs/assets/` para que se vean también en la página de npm.

## Publicar

1. Primera vez: `npm login` y `npm publish` (requiere 2FA en la cuenta de npm).
2. Actualizaciones: `npm version patch|minor` → `git push --follow-tags` → `npm publish`.
3. Hacer push a GitHub **no** publica en npm. Instalar con `npm i -g github:diegogit94/dev-launcher` sí toma lo último de `main`.

## Estado y pendientes (al 2026-10-08)

- [x] Primer commit subido a GitHub.
- [x] Commit con README en inglés, README.es.md, GIFs, `scripts/demo` y este archivo.
- [x] Primera publicación en npm (manual): `dev-launcher@1.1.0`; luego 1.1.1 (nota de instalación en Windows) y 1.2.0 (agente propio por proyecto).
- [ ] Workflow `.github/workflows/publish.yml` que publique en npm al crear un release, con **trusted publishing** (OIDC, sin token). Requiere que el paquete ya exista en npm y enlazar el repo y el workflow en la configuración del paquete en npmjs.com.
- [ ] Opcional: interfaz en inglés y español (detectar idioma del sistema o `--lang`), y luego regenerar los GIFs en inglés.
- [ ] Probar en Windows y macOS reales (ver "Probar").
- [x] GIFs y capturas regenerados (2026-10-09) con el generador en Node, incluido `settings.gif` del menú de configuración.

## Historia (para no repetir caminos)

1. Empezó como una función `dev` en el perfil de PowerShell (`Documents\dev-claude.ps1`), solo Windows y solo Claude Code.
2. Pasó a un módulo de PowerShell (DevClaude) con un instalador `.cmd`; se descartó por ser solo Windows.
3. Se reescribió en Node.js para que sea multiplataforma y permita cualquier agente.
4. El modo "preguntar cada vez", con memoria por proyecto, reemplazó al modo fijo como opción por defecto.
