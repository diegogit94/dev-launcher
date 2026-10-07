#!/usr/bin/env python3
"""Graba una sesion real de terminal (bash en un pty) como asciicast v2.
Uso: rec.py salida.cast escenario.json
escenario: {"cols":88,"rows":22,"env":{...},"rc":"...bashrc...","steps":[...]}
steps: {"type":"texto"} escribe caracter por caracter; {"key":"ENTER|DOWN|UP|TAB|ESC|BS"};
       {"sleep":segundos}; {"wait_for":"texto"} espera a que aparezca en la salida.
"""
import fcntl, json, os, pty, select, struct, sys, termios, time

out_path, scen_path = sys.argv[1], sys.argv[2]
scen = json.load(open(scen_path))
cols, rows = scen.get('cols', 88), scen.get('rows', 22)
KEYS = {'ENTER': b'\r', 'DOWN': b'\x1b[B', 'UP': b'\x1b[A', 'TAB': b'\t', 'ESC': b'\x1b', 'BS': b'\x7f'}

rcfile = scen_path + '.bashrc'
open(rcfile, 'w').write(scen.get('rc', ''))
env = dict(os.environ)
env.update({'TERM': 'xterm-256color', 'COLUMNS': str(cols), 'LINES': str(rows)})
env.update(scen.get('env', {}))

pid, fd = pty.fork()
if pid == 0:
    os.execvpe('bash', ['bash', '--noprofile', '--rcfile', rcfile, '-i'], env)

fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
events, buf = [], ''
t0 = None


def leer(segundos):
    global buf, t0
    fin = time.time() + segundos
    while time.time() < fin:
        r, _, _ = select.select([fd], [], [], 0.02)
        if r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                return
            if not data:
                return
            ahora = time.time()
            texto = data.decode('utf-8', errors='replace')
            if t0 is None:
                t0 = ahora
            events.append([round(ahora - t0, 4), 'o', texto])
            buf += texto


leer(1.5)
events.clear(); buf = ''; t0 = None
os.write(fd, b'clear\r'); leer(0.6)
events.clear(); buf = ''; t0 = time.time()
leer(0.4)
events.insert(0, [0.0, 'o', '\x1b[1;36m~\x1b[0m \x1b[1;35m❯\x1b[0m '])
visto = 0

marks = {}
for st in scen['steps']:
    if 'mark' in st:
        marks[st['mark']] = round(time.time() - t0, 3)
    elif 'sleep' in st:
        leer(st['sleep'])
    elif 'key' in st:
        os.write(fd, KEYS[st['key']]); leer(st.get('after', 0.45))
    elif 'wait_for' in st:
        fin = time.time() + st.get('timeout', 15)
        while st['wait_for'] not in buf[visto:] and time.time() < fin:
            leer(0.1)
        if st['wait_for'] in buf[visto:]:
            visto = buf.index(st['wait_for'], visto) + len(st['wait_for'])
        else:
            print('AVISO: no aparecio', st['wait_for'], file=sys.stderr)
        leer(st.get('after', 0.3))
    elif 'type' in st:
        for ch in st['type']:
            os.write(fd, ch.encode()); leer(st.get('cps', 0.07))
        leer(st.get('after', 0.25))

os.write(fd, b'exit\r'); leer(0.5)
header = {'version': 2, 'width': cols, 'height': rows, 'timestamp': int(time.time()),
          'env': {'TERM': 'xterm-256color', 'SHELL': '/bin/bash'}}
# quita la ultima linea "exit"
while events and ('exit' in events[-1][2] or events[-1][2].strip() == ''):
    events.pop()
with open(out_path, 'w') as f:
    f.write(json.dumps(header) + '\n')
    for e in events:
        f.write(json.dumps(e) + '\n')
json.dump(marks, open(out_path + '.marks.json', 'w'))
print(f'{out_path}: {len(events)} eventos, {events[-1][0] if events else 0:.1f}s')
