#!/usr/bin/env python3
"""Regenera los GIFs y capturas de docs/assets grabando sesiones reales de `dev`.

Requisitos (Linux o WSL, como root porque usa /home/demo y /opt):
  - Python 3 con Pillow  (pip install pillow)
  - agg (https://github.com/asciinema/agg/releases) y la fuente JetBrains Mono (.ttf)
    en $DEMO_TOOLS (por defecto scripts/demo/tools/): tools/agg y tools/fonts/*.ttf
  - Node.js y npm

Uso:  python3 scripts/demo/gen.py            # todos
      python3 scripts/demo/gen.py usage      # solo uno (install | usage | flags)
Los agentes son stubs que imprimen "(X session starts here...)"; no hace falta tener ninguno instalado.
"""
import json, os, shutil, subprocess, sys
from PIL import Image

S = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(S))
TOOLS = os.environ.get('DEMO_TOOLS', os.path.join(S, 'tools'))
OUT = os.path.join(S, 'out')
ASSETS = os.path.join(REPO, 'docs', 'assets')
NODE_DIR = os.path.dirname(shutil.which('node'))
os.makedirs(OUT, exist_ok=True)
solo = sys.argv[1:]  # escenarios a regenerar (vacio = todos)

# Nombre final en docs/assets para cada archivo generado
DESTINOS = {'install.gif': 'install.gif', 'usage.gif': 'usage.gif', 'flags.gif': 'flags.gif',
            'install-agentes.png': 'setup-agent.png', 'usage-filtro.png': 'project-menu.png',
            'usage-menu_modo.png': 'open-menu.png'}


def preparar_entorno():
    """Proyectos de ejemplo, agentes simulados y el paquete empaquetado desde este repo."""
    for d in ('/opt/demo', '/opt/demo-bin', '/opt/demo-npm'):
        shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    shutil.rmtree('/home/demo', ignore_errors=True)
    for p in ('api-gateway', 'design-system', 'landing-page', 'mobile-app', 'portfolio', 'shop-backend'):
        os.makedirs(f'/home/demo/Dev/{p}')
    subprocess.run(['npm', 'pack', '--silent', '--pack-destination', '/opt/demo'], cwd=REPO, check=True, capture_output=True)
    tgz = [f for f in os.listdir('/opt/demo') if f.endswith('.tgz')][0]
    os.rename(f'/opt/demo/{tgz}', '/opt/demo/dev-launcher.tgz')
    for b, n in (('claude', 'Claude Code'), ('codex', 'OpenAI Codex')):
        with open(f'/opt/demo-bin/{b}', 'w') as f:
            f.write(f"#!/bin/sh\nprintf '\\033[2m  ({n} session starts here, in %s)\\033[0m\\n' \"$(basename \"$PWD\")\"\n")
        os.chmod(f'/opt/demo-bin/{b}', 0o755)

RC = r"""
export PS1='\[\e[1;36m\]~\[\e[0m\] \[\e[1;35m\]❯\[\e[0m\] '
export PATH=/opt/demo-npm/bin:/opt/demo-bin:NODE_DIR:/usr/local/bin:/usr/bin:/bin
npm() { if [ "$*" = "install -g dev-launcher" ]; then command npm install -g --prefix /opt/demo-npm /opt/demo/dev-launcher.tgz --no-fund --no-audit --loglevel=error; else command npm "$@"; fi; }
cd ~
""".replace('NODE_DIR', NODE_DIR)
ENV = {'HOME': '/home/demo', 'NO_UPDATE_NOTIFIER': '1', 'npm_config_update_notifier': 'false'}

T = lambda s, **k: dict(type=s, **k)
K = lambda s, **k: dict(key=s, **k)
W = lambda s, **k: dict(wait_for=s, **k)
Z = lambda s: dict(sleep=s)
M = lambda s: dict(mark=s)

ESCENARIOS = {
    'install': dict(cols=92, rows=27, steps=[
        Z(0.8), T('npm install -g dev-launcher'), K('ENTER'), W('added 1 package'), Z(1.2),
        T('dev --config'), K('ENTER'), W('Ruta:'), Z(0.8),
        T('~/De', cps=0.12), K('TAB', after=0.7), Z(0.4), K('ENTER'), W('Que agente'), Z(1.0),
        K('DOWN', after=0.6), K('UP', after=0.6), M('agentes'), Z(0.6), K('ENTER'), W('Que hacer'), Z(1.0), M('modo'), Z(0.4),
        K('ENTER'), W('Listo'), Z(2.5),
    ]),
    'usage': dict(cols=92, rows=17, steps=[
        Z(0.8), T('dev'), K('ENTER'), W('Elige un proyecto'), Z(1.0),
        K('DOWN', after=0.5), K('DOWN', after=0.5), Z(0.3), T('sho', cps=0.25), Z(0.6), M('filtro'), Z(0.4),
        K('ENTER'), W('Como lo abro'), Z(0.8), M('menu_modo'), Z(0.4), K('DOWN', after=0.7), K('ENTER'), W('session starts'), Z(1.6),
        T('dev shop'), K('ENTER'), W('Como lo abro'), Z(1.8), K('ENTER'), W('session starts'), Z(2.2),
    ]),
    'flags': dict(cols=92, rows=17, steps=[
        Z(0.8), T('dev land -n'), K('ENTER'), W('session starts'), Z(1.2),
        T('dev -a codex api -c'), K('ENTER'), W('session starts'), Z(1.2),
        T('dev -l'), K('ENTER'), Z(2.5),
    ]),
}


def agg(cast, gif, **kw):
    cmd = [os.path.join(TOOLS, 'agg'), '--font-dir', os.path.join(TOOLS, 'fonts'), '--font-family', 'JetBrains Mono',
           '--font-size', str(kw.get('font', 18)), '--theme', 'github-dark', '--idle-time-limit', '1.6',
           '--last-frame-duration', str(kw.get('last', 4)), '--fps-cap', '20', cast, gif]
    subprocess.run(cmd, check=True, capture_output=True)


def recortar(cast, hasta, destino):
    lineas = open(cast).read().splitlines()
    with open(destino, 'w') as f:
        f.write(lineas[0] + '\n')
        for l in lineas[1:]:
            if json.loads(l)[0] <= hasta:
                f.write(l + '\n')


def captura(cast, marca_t, png):
    tmp_cast, tmp_gif = png + '.cast', png + '.gif'
    recortar(cast, marca_t, tmp_cast)
    agg(tmp_cast, tmp_gif, font=20, last=0.1)
    im = Image.open(tmp_gif)
    im.seek(im.n_frames - 1)
    im.convert('RGB').save(png, optimize=True)
    os.remove(tmp_cast); os.remove(tmp_gif)


if not solo or 'install' in solo:
    preparar_entorno()

for nombre, esc in ESCENARIOS.items():
    if solo and nombre not in solo:
        continue
    if nombre == 'install':
        subprocess.run('npm uninstall -g --prefix /opt/demo-npm dev-launcher --silent; rm -f /home/demo/.dev-launcher.json', shell=True)
    elif nombre == 'usage':
        cfg_p = '/home/demo/.dev-launcher.json'
        cfg = json.load(open(cfg_p)); cfg.pop('ultimoModo', None); json.dump(cfg, open(cfg_p, 'w'))
    esc = dict(esc, rc=RC, env=ENV)
    jpath = os.path.join(S, f'{nombre}.json')
    json.dump(esc, open(jpath, 'w'))
    cast = os.path.join(OUT, f'{nombre}.cast')
    subprocess.run([sys.executable, os.path.join(S, 'rec.py'), cast, jpath], check=True)
    agg(cast, os.path.join(OUT, f'{nombre}.gif'))
    marks = json.load(open(cast + '.marks.json'))
    for m, t in marks.items():
        captura(cast, t, os.path.join(OUT, f'{nombre}-{m}.png'))

os.makedirs(ASSETS, exist_ok=True)
for origen, destino in DESTINOS.items():
    if os.path.exists(os.path.join(OUT, origen)):
        shutil.copy(os.path.join(OUT, origen), os.path.join(ASSETS, destino))

for f in sorted(os.listdir(OUT)):
    if f.endswith(('.gif', '.png')):
        p = os.path.join(OUT, f)
        im = Image.open(p)
        print(f'{f}: {im.size[0]}x{im.size[1]}, {os.path.getsize(p)//1024} KB, frames={getattr(im, "n_frames", 1)}')
