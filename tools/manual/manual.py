#!/usr/bin/env python3
# PULSAR · user manual (English by default, Spanish edition) — HTML pages rendered to PDF by pdf.mjs
import os, math, json
HERE = os.path.dirname(os.path.abspath(__file__))
L = 'en'
def T(en, es): return es if L == 'es' else en
DON = 'https://www.paypal.com/donate/?business=drophlex%40gmail.com&amp;no_recurring=0&amp;item_name=PULSAR&amp;currency_code=USD'
WEB = 'https://drophlex.github.io/PULSAR/'
REPO = 'https://github.com/drophlex/PULSAR'
IG, YT = 'https://www.instagram.com/polaris.sound.lab/', 'https://www.youtube.com/@PolarisSoundLab'
def shot(n): return f'shots/{L}_{n}.png'
def img(n, cap='', w='100%', cls='fig'):
    return f'<figure class="{cls}" style="width:{w}"><img src="{shot(n)}">' + (f'<figcaption>{cap}</figcaption>' if cap else '') + '</figure>'
def table(head, rows, cls=''):
    return f'<table class="{cls}"><tr>' + ''.join(f'<th>{h}</th>' for h in head) + '</tr>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows) + '</table>'
def kick(t): return f'<div class="kick">{t}</div>'
def k(t, c='k'): return f'<span class="{c}">{t}</span>'
def tip(t): return f'<div class="tip"><b>{T("Tip", "Consejo")}</b> {t}</div>'
def note(t): return f'<div class="note">{t}</div>'

def pulsar_svg(size=520, beams=True):
    cx = cy = size / 2; R = size * .07; out = [f'<svg viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg"><defs>'
        f'<radialGradient id="core"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#a6f3ff"/><stop offset="1" stop-color="#46e0ff" stop-opacity="0"/></radialGradient>'
        f'<linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#46e0ff" stop-opacity=".75"/><stop offset="1" stop-color="#46e0ff" stop-opacity="0"/></linearGradient></defs>']
    for i in range(1, 9):   # field lines: the pulse rings
        out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{R * (1.6 + i * .95):.1f}" ry="{R * (.55 + i * .33):.1f}" transform="rotate(-24 {cx} {cy})" fill="none" stroke="#46e0ff" stroke-opacity="{.32 - i * .03:.2f}" stroke-width="1"/>')
    if beams:
        for s in (1, -1):
            a = math.radians(-58 if s > 0 else 122); w = .13
            p1 = (cx + math.cos(a - w) * size * .62, cy + math.sin(a - w) * size * .62); p2 = (cx + math.cos(a + w) * size * .62, cy + math.sin(a + w) * size * .62)
            out.append(f'<polygon points="{cx},{cy} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="#46e0ff" fill-opacity=".22"/>')
    for i in range(48):     # beats around it: a 16-step ring, accents brighter
        a = math.radians(i * 7.5 - 90); r1 = size * .43; on = i % 3 == 0
        out.append(f'<circle cx="{cx + math.cos(a) * r1:.1f}" cy="{cy + math.sin(a) * r1:.1f}" r="{3.2 if on else 1.6}" fill="{"#ff5a36" if i % 12 == 0 else "#46e0ff"}" fill-opacity="{.9 if on else .35}"/>')
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{R * 2.2:.1f}" fill="url(#core)"/></svg>')
    return ''.join(out)

PAGES = []
def page(title, body, cls=''): PAGES.append((cls, body, title))

def build():
    global PAGES; PAGES = []
    # 1 cover
    page('', f'''<div class="cover"><div class="cart">{pulsar_svg()}</div>
<div class="ctitle">PULSAR</div><div class="csub">{T('a drum machine for broken beats', 'una caja de ritmos para beats rotos')}</div>
<div class="cmeta">{T('USER MANUAL', 'MANUAL DE USO')} · WEB · VST3 · AU · FM-1</div>
<div class="clang">{T('ENGLISH EDITION', 'EDICIÓN EN ESPAÑOL') if L != 'both' else 'ENGLISH · ESPAÑOL'}</div>
<div class="cfoot">Dark Funk Durcal {T('design', 'diseño')} · {T('built at', 'construido en')} <b>POLARIS SOUND LAB</b> · Mérida, Yucatán, México<br>
<a href="{IG}">Instagram @polaris.sound.lab</a> · <a href="{YT}">YouTube @PolarisSoundLab</a></div></div>''', 'coverp')
    # 2 welcome
    toc = [T('Quick start', 'Inicio rápido'), T('The screen', 'La pantalla'), T('LIVE view', 'Vista LIVE'), T('The grid', 'La cuadrícula'), T('Editing a step', 'Editar un paso'),
           T('Sounds', 'Sonidos'), T('Breaks and sampler eras', 'Breaks y épocas de sampler'), T('Mixer', 'Mezcla'), T('Tracks and polymeter', 'Pistas y polirritmo'),
           T('Perform: 16 tricks', 'Tocar en vivo: 16 trucos'), T('Recording movement', 'Grabar movimientos'), T('Styles and generators', 'Estilos y generadores'),
           T('Patterns and song', 'Patrones y canción'), T('Master, export, keys', 'Master, exportar, teclas'), T('Recipes', 'Recetas'), T('Sounds and credits', 'Sonidos y créditos')]
    page(T('Welcome', 'Bienvenida'), f'''{kick(T('Welcome', 'Bienvenida'))}<h1>{T('Beats that <i>break</i>, made to play live.', 'Ritmos que <i>se rompen</i>, hechos para tocar en vivo.')}</h1>
<p class="lead">{T('PULSAR is a drum machine for big beat, braindance, drill’n’bass, jungle and every broken rhythm in between. Sixteen tracks, real breakbeats you can chop and stretch, a sound library recorded from the best free drum kits, and the producers’ tricks on one button each — all as easy as a hardware box.', 'PULSAR es una caja de ritmos para big beat, braindance, drill’n’bass, jungle y todo ritmo roto que haya entre ellos. Dieciséis pistas, breakbeats reales que puedes picar y estirar, una librería grabada de las mejores baterías libres, y los trucos de los productores a un botón cada uno — tan fácil como una caja de hardware.')}</p>
<div class="grid3">
<div class="card"><h3>WEB</h3><p>{T('Open it in Chrome and play. Nothing to install.', 'Ábrelo en Chrome y toca. Nada que instalar.')}<br><a href="{WEB}">drophlex.github.io/PULSAR</a></p></div>
<div class="card"><h3>VST3 · AU</h3><p>{T('The same instrument inside Ableton Live or any DAW (coming next).', 'El mismo instrumento dentro de Ableton Live o cualquier DAW (en camino).')}</p></div>
<div class="card"><h3>FM-1</h3><p>{T('A firmware for the M-VAVE FM-1 (coming after the plug-in).', 'Un firmware para el M-VAVE FM-1 (después del plug-in).')}</p></div></div>
{note(f"<b>English · Español.</b> {T('PULSAR opens in English. The', 'PULSAR abre en inglés. El botón')} <span class='k'>EN · ES</span> {T('button (top right) switches the whole program to Spanish and remembers it. This manual exists in both languages.', '(arriba a la derecha) cambia todo el programa a español y lo recuerda. Este manual existe en los dos idiomas.')}")}
{note(f"<b>{T('Free and open source', 'Gratis y de código abierto')}</b> (AGPL-3.0). {T('If PULSAR makes your music better, you can support it:', 'Si PULSAR mejora tu música, puedes apoyarlo:')} <a class='paypal' href='{DON}'>♥ {T('Donate with PayPal', 'Donar con PayPal')}</a>")}
<h3>{T('In this manual', 'En este manual')}</h3><div class="toc">{''.join(f'<div><span>{i + 3:02d}</span>{t}</div>' for i, t in enumerate(toc))}</div>''')
    # 3 quick start
    page(T('Quick start', 'Inicio rápido'), f'''{kick(T('Quick start', 'Inicio rápido'))}<h1>{T('Your first beat in <i>one minute</i>', 'Tu primer ritmo en <i>un minuto</i>')}</h1>
<ol class="steps">
<li><b>{T('Open PULSAR and press START.', 'Abre PULSAR y presiona EMPEZAR.')}</b> {T('Chrome or Edge on a computer works best. The sounds load in a few seconds.', 'Chrome o Edge en computadora funcionan mejor. Los sonidos cargan en unos segundos.')}</li>
<li><b>{T('Choose a style', 'Elige un estilo')}</b> {T('in the menu at the top left (BIG BEAT, BRAINDANCE, DRILL N BASS…).', 'en el menú de arriba a la izquierda (BIG BEAT, BRAINDANCE, DRILL N BASS…).')}</li>
<li><b>{T('Press', 'Presiona')} {k('⚡ GENERATE', 'k hot')}.</b> {T('A whole kit and a pattern appear and start playing. Press it again for a new idea.', 'Aparecen un kit completo y un patrón, y empiezan a sonar. Presiónalo otra vez para otra idea.')}</li>
<li><b>{T('Play it with your hands.', 'Tócalo con las manos.')}</b> {T('Move the faders, tap the pads, mute instruments, and press the tricks at the bottom (STUTTER, DRILL, FILTER…).', 'Mueve los faders, toca los pads, silencia instrumentos y presiona los trucos de abajo (STUTTER, DRILL, FILTER…).')}</li>
<li><b>{T('Make it a song.', 'Hazlo canción.')}</b> {k('BUILD TRACK')} {T('writes intro, groove, variations, a break and fills; then', 'escribe intro, groove, variaciones, un break y remates; luego')} {k('⤓ MIDI')} {T('or', 'o')} {k('● WAV')} {T('takes it to your DAW.', 'lo lleva a tu DAW.')}</li></ol>
{img('live', T('<b>fig. 1</b> — the LIVE view, ready to play.', '<b>fig. 1</b> — la vista LIVE, lista para tocar.'))}
{tip(T('Everything has a reset: double-click a knob to send it back to its starting value.', 'Todo tiene regreso: doble clic en una perilla la devuelve a su valor inicial.'))}''')
    # 4 screen map
    pins = [('A', T('Logo, LIVE / GRID views, PLAY, REC (records movement)', 'Logo, vistas LIVE / GRID, PLAY, REC (graba movimientos)')),
            ('B', T('Tempo (drag up/down) and TAP', 'Tempo (arrastra arriba/abajo) y TAP')), ('C', T('16 patterns and SONG mode', '16 patrones y modo canción')),
            ('D', T('Style, complexity, GENERATE, VARY, BUILD TRACK', 'Estilo, complejidad, GENERAR, VARIAR, ARMAR TEMA')),
            ('E', T('MIDI and WAV export, SAVE / OPEN, help, EN · ES, credits, donate', 'Exportar MIDI y WAV, GUARDAR / ABRIR, ayuda, EN · ES, créditos, donar')),
            ('F', T('The instruments: grid or strips', 'Los instrumentos: cuadrícula o tiras')), ('G', T('The panel of the chosen instrument (SOUND, MIX, STEP, TRACK, SONG, MASTER)', 'El panel del instrumento elegido (SONIDO, MEZCLA, PASO, PISTA, CANCIÓN, MASTER)')),
            ('H', T('Scope, the 16 tricks, master DRIVE / COMP / HUMAN / VOLUME', 'Osciloscopio, los 16 trucos, DRIVE / COMP / HUMANO / VOLUMEN del master'))]
    pos = {'A': (12, 3), 'B': (37, 3), 'C': (50, 3), 'D': (14, 8), 'E': (75, 8), 'F': (40, 50), 'G': (88, 50), 'H': (50, 95)}
    page(T('The screen', 'La pantalla'), f'''{kick(T('The screen', 'La pantalla'))}<h1>{T('Everything <i>in one place</i>', 'Todo <i>en un lugar</i>')}</h1>
<div class="map"><img src="{shot('main')}">{''.join(f'<span class="pin" style="left:{pos[p][0]}%;top:{pos[p][1]}%">{p}</span>' for p, _ in pins)}</div>
{table([T('', ''), T('What it is', 'Qué es')], [[f'<span class="pin2">{p}</span>', t] for p, t in pins], 'tight')}''')
    # 5 LIVE
    page(T('LIVE view', 'Vista LIVE'), f'''{kick(T('LIVE view', 'Vista LIVE'))}<h1>{T('A strip <i>per instrument</i>', 'Una tira <i>por instrumento</i>')}</h1>
<div class="two"><div>{img('strips', T('<b>fig. 2</b> — four strips of the sixteen.', '<b>fig. 2</b> — cuatro tiras de las dieciséis.'))}</div><div>
<p>{T('The LIVE view is made for playing, like a hardware drum machine: every sound has its own controls in front of you, no menus.', 'La vista LIVE está hecha para tocar, como una caja de ritmos de hardware: cada sonido tiene sus controles al frente, sin menús.')}</p>
{table([T('Control', 'Control'), T('What it does', 'Qué hace')], [
 [T('Name', 'Nombre'), T('Tap it to choose the instrument (its steps appear below, its panel on the right).', 'Tócalo para elegir el instrumento (sus pasos aparecen abajo y su panel a la derecha).')],
 ['TUNE', T('Pitch in semitones, ±24.', 'Tono en semitonos, ±24.')], ['DECAY', T('How long it rings (for breaks: how much of the slice).', 'Cuánto suena (en breaks: cuánto del corte).')],
 ['COLOR', T('One knob filter: left darkens (low pass), right thins (high pass), middle is off.', 'Filtro de una perilla: izquierda oscurece (pasa bajos), derecha adelgaza (pasa altos), al centro no hace nada.')],
 ['FX', T('Send to the tempo delay.', 'Envío al delay en tempo.')], [T('Fader', 'Fader'), T('Volume of the instrument.', 'Volumen del instrumento.')],
 [T('Pad', 'Pad'), T('Plays the sound. Hit high for loud, low for soft. It lights up on every hit.', 'Toca el sonido. Arriba suena fuerte, abajo suave. Se ilumina con cada golpe.')],
 ['MUTE', T('Silences the instrument (the pattern keeps running).', 'Silencia el instrumento (el patrón sigue corriendo).')]], 'tight')}</div></div>
<h2>{T('The step row', 'La fila de pasos')}</h2><p>{T('Under the strips: the sixteen steps of the chosen instrument, like on classic boxes. Tap a step to write or erase a hit. Right click (or long press) a step to edit it.', 'Bajo las tiras: los dieciséis pasos del instrumento elegido, como en las cajas clásicas. Toca un paso para escribir o borrar un golpe. Clic derecho (o mantener) en un paso para editarlo.')}</p>
{img('tr8', '')}''')
    # 6 GRID
    page(T('The grid', 'La cuadrícula'), f'''{kick(T('GRID view', 'Vista GRID'))}<h1>{T('All sixteen tracks <i>at once</i>', 'Las dieciséis pistas <i>a la vez</i>')}</h1>
{img('grid', T('<b>fig. 3</b> — rows are instruments, columns are 16ths. The white frame is the playhead.', '<b>fig. 3</b> — las filas son instrumentos, las columnas son dieciseisavos. El marco blanco es el cabezal.'))}
{table([T('Do this', 'Haz esto'), T('…to get', '…para lograr')], [
 [T('Click a step', 'Clic en un paso'), T('a hit on / off (velocity 100).', 'un golpe encendido / apagado (velocidad 100).')],
 [T('Drag up or down on a lit step', 'Arrastra arriba o abajo un paso encendido'), T('its velocity: the darker part shows how soft it is.', 'su velocidad: la parte oscura muestra qué tan suave es.')],
 [T('Right click / long press', 'Clic derecho / mantener'), T('the step editor (next page).', 'el editor del paso (página siguiente).')],
 [T('Drag the number at the right', 'Arrastra el número de la derecha'), T('the length of that track, 1 to 64 steps.', 'el largo de esa pista, de 1 a 64 pasos.')],
 ['M · S', T('mute · solo.', 'silencio · solo.')], [T('Click a track name', 'Clic en un nombre'), T('hear it and open its sound.', 'escucharlo y abrir su sonido.')],
 ['1-16 · 17-32 …', T('pages, when a track is longer than 16.', 'páginas, cuando una pista mide más de 16.')]], 'tight')}
<p>{T('Colours tell the role: <b class="c1">kick</b>, <b class="c2">snare</b>, <b class="c3">hat</b>, <b class="c4">perc</b>, <b class="c5">break</b>, <b class="c6">cymbal</b>. Small marks on a step: <b>×4</b> = a roll, <b>1:4</b> = a condition, stripes = it plays only sometimes.', 'Los colores dicen el papel: <b class="c1">bombo</b>, <b class="c2">caja</b>, <b class="c3">hat</b>, <b class="c4">percusión</b>, <b class="c5">break</b>, <b class="c6">platillo</b>. Marcas pequeñas en un paso: <b>×4</b> = redoble, <b>1:4</b> = una condición, rayas = suena solo a veces.')}</p>''')
    # 7 STEP
    page(T('Editing a step', 'Editar un paso'), f'''{kick(T('Editing a step', 'Editar un paso'))}<h1>{T('Every hit, <i>alive</i>', 'Cada golpe, <i>vivo</i>')}</h1>
<div class="two"><div>{img('panel_step', '')}</div><div>
{table([T('Knob', 'Perilla'), T('What it does', 'Qué hace')], [
 [T('VELOCITY', 'VELOCIDAD'), T('how hard (1–127).', 'qué tan fuerte (1–127).')], [T('CHANCE', 'PROBAB.'), T('the % of loops it plays: life without effort.', 'el % de vueltas en que suena: vida sin esfuerzo.')],
 ['MICRO', T('early or late, up to half a step: swing a single hit.', 'antes o después, hasta medio paso: mueve un solo golpe.')],
 [T('PITCH', 'TONO'), T('± 24 semitones for this hit only (melodic toms, pitched snares).', '± 24 semitonos solo para este golpe (toms melódicos, cajas afinadas).')],
 [T('ROLL', 'REDOBLE'), T('repeats the hit inside the step, ×2 to ×8.', 'repite el golpe dentro del paso, ×2 a ×8.')],
 [T('ROLL CHANCE', 'PROB. REDOBLE'), T('the roll happens only sometimes; the rest is one hit.', 'el redoble pasa solo a veces; el resto es un golpe.')],
 [T('SLICE', 'CORTE'), T('for breaks: which of the 32 slices. FOLLOW = the one under this step.', 'en breaks: cuál de los 32 cortes. SEGUIR = el que le toca a este paso.')]], 'tight')}</div></div>
<div class="two"><div><h3>{T('Roll shapes', 'Formas de redoble')}</h3>{table(['', ''], [['EVEN', T('equal hits', 'golpes iguales')], ['CRESC', T('getting louder', 'crece')], ['DECRESC', T('fading', 'se apaga')], ['PITCH UP / DOWN', T('each hit higher / lower', 'cada golpe más agudo / grave')], ['ACCEL', T('speeding up, like a bouncing ball', 'acelera, como una pelota que rebota')]], 'tight')}</div>
<div><h3>{T('Conditions', 'Condiciones')}</h3>{table(['', ''], [['1:2 · 2:2', T('first / second of every 2 loops', 'primera / segunda de cada 2 vueltas')], ['1:3 … 3:3', T('one of every 3', 'una de cada 3')], ['1:4 … 4:4', T('one of every 4', 'una de cada 4')], ['FILL · NOT FILL', T('only with / without FILL', 'solo con / sin FILL')], ['FIRST · NOT FIRST', T('only the first loop / never the first', 'solo la primera vuelta / nunca la primera')]], 'tight')}</div></div>''')
    # 8 SOUND
    lib = [('designed', T('Kicks (punch, rave, boom, gabber, big beat, electro), layered snares, a clap stack, metal hats, FM blips, zap, riser — designed here.', 'Bombos (punch, rave, boom, gabber, big beat, electro), cajas en capas, palmas apiladas, hats metálicos, blips FM, zap, riser — diseñados aquí.')),
           ('studio kit', T('A deeply sampled studio kit: kick, snares, toms, hats, ride, crash, china.', 'Una batería de estudio sampleada a fondo: bombo, cajas, toms, hats, ride, crash, china.')),
           ('big kit', T('An oversized 1980s kit: huge kick and snare, toms, hats, ride, crash.', 'Una batería enorme de los 80: bombo y caja gigantes, toms, hats, ride, crash.')),
           ('snares', T('Nine snare drums from a 10" piccolo to a 20" fat one, a hand clap, a tambourine.', 'Nueve cajas, de una piccolo de 10" a una gorda de 20", palmas y pandero.')),
           ('odd kit', T('A strange kit where every drum is a snare: perfect for weird sounds.', 'Una batería rara donde todo es caja: perfecta para sonidos extraños.')),
           ('70s kit · 70s retro', T('A 1973-style kit, clean and on a cheap microphone.', 'Una batería estilo 1973, limpia y con un micrófono barato.')),
           ('breaks hifi · breaks', T('Thirteen breakbeats played here on those kits (see the next page).', 'Trece breakbeats tocados aquí en esas baterías (ver la página siguiente).')),
           ('rhythm box · 80s studio', T('Classic rhythm machines, for colour.', 'Cajas de ritmo clásicas, para dar color.'))]
    page(T('Sounds', 'Sonidos'), f'''{kick(T('Sounds', 'Sonidos'))}<h1>{T('Three ways <i>to sound</i>', 'Tres formas <i>de sonar</i>')}</h1>
<div class="two"><div>{img('panel_synth', '')}</div><div>
<p><b>SYNTH</b> — {T('fourteen drum synthesizers designed for PULSAR: KICK, BOOM, HARD KICK, SNARE, CLAP, HAT, OPEN HAT, RIDE, TOM, RIM, COWBELL, FM PERC, ZAP, NOISE. TONE, SNAP and ATTACK shape them.', 'catorce sintetizadores de batería diseñados para PULSAR: KICK, BOOM, HARD KICK, SNARE, CLAP, HAT, OPEN HAT, RIDE, TOM, RIM, COWBELL, FM PERC, ZAP, NOISE. TONO, GOLPE y ATAQUE les dan forma.')}</p>
<p><b>SAMPLE</b> — {T('a recorded sound from the library or yours. START POINT skips the attack, REVERSE flips it.', 'un sonido grabado de la librería o tuyo. INICIO se salta el ataque, REVERSA lo voltea.')}</p>
<p><b>BREAK</b> — {T('a breakbeat cut into slices, one per step.', 'un breakbeat cortado en pedazos, uno por paso.')}</p>
<p>{T('◀ ▶ walk through the library while the beat plays: you hear each sound in context.', '◀ ▶ recorren la librería mientras suena el ritmo: escuchas cada sonido en contexto.')}</p></div></div>
<h2>{T('The library', 'La librería')}</h2>{table([T('Group', 'Grupo'), T('What is in it', 'Qué tiene')], [[f'<b>{g}</b>', d] for g, d in lib], 'tight')}''')
    # 9 BREAKS + ERAS
    slices = ''.join(f'<rect x="{10 + i * 17.5}" y="20" width="16" height="50" rx="3" fill="{"#ffc54d" if i in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 2) else "#ffc54d"}" fill-opacity="{.85 if i % 4 == 0 else .45}"/><text x="{18 + i * 17.5}" y="84" font-size="7" fill="#7d8699" text-anchor="middle">{i + 1}</text>' for i in range(16))
    order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 12, 13, 4, 5]
    arrows = ''.join(f'<line x1="{18 + o * 17.5}" y1="72" x2="{18 + i * 17.5}" y2="118" stroke="#46e0ff" stroke-opacity=".5"/>' for i, o in enumerate(order))
    re = ''.join(f'<rect x="{10 + i * 17.5}" y="120" width="16" height="40" rx="3" fill="#46e0ff" fill-opacity="{.85 if order[i] % 4 == 0 else .4}"/><text x="{18 + i * 17.5}" y="172" font-size="7" fill="#7d8699" text-anchor="middle">{order[i] + 1}</text>' for i in range(16))
    page(T('Breaks and sampler eras', 'Breaks y épocas'), f'''{kick(T('Breaks', 'Breaks'))}<h1>{T('Chop it, <i>stretch it</i>', 'Pícalo, <i>estíralo</i>')}</h1>
<div class="two"><div><svg viewBox="0 0 300 180" class="diag">{slices}{arrows}{re}<text x="10" y="12" font-size="8" fill="#e8ecf3">{T('the break, in slices', 'el break, en cortes')}</text><text x="10" y="114" font-size="8" fill="#e8ecf3">{T('your steps play them in a new order', 'tus pasos los tocan en otro orden')}</text></svg></div>
<div><p>{T('A BREAK track holds a drum loop cut into 32 slices (two bars of 16ths). Each step plays one slice: in order it sounds like the original drummer; re-ordered it becomes jungle, big beat or drill. SLICE on a step (or GENERATE) picks which one.', 'Una pista BREAK guarda un loop de batería cortado en 32 pedazos (dos compases de dieciseisavos). Cada paso toca un pedazo: en orden suena como el baterista original; reordenado se vuelve jungle, big beat o drill. CORTE en un paso (o GENERAR) elige cuál.')}</p>
<p><b>{T('STRETCH TO TEMPO', 'AJUSTAR AL TEMPO')}</b> {T('keeps the pitch at any tempo: a 101 BPM break at 170 BPM still sounds like itself.', 'mantiene el tono a cualquier tempo: un break de 101 BPM a 170 BPM sigue sonando igual.')} <b>REPITCH</b> {T('speeds it up the way old samplers did — higher and faster, the classic jungle sound.', 'lo acelera como los samplers viejos — más agudo y rápido, el sonido clásico del jungle.')}</p></div></div>
<h2>{T('Your own loops', 'Tus propios loops')}</h2><p>{T('SOUND › LOAD YOUR SAMPLE accepts WAV, AIFF, MP3, FLAC or OGG. A loop longer than a second is measured (1, 2, 4 or 8 bars between 80 and 180 BPM) and sliced automatically; a short sound becomes a one-shot.', 'SONIDO › CARGA TU SAMPLE acepta WAV, AIFF, MP3, FLAC u OGG. Un loop de más de un segundo se mide (1, 2, 4 u 8 compases entre 80 y 180 BPM) y se corta solo; un sonido corto queda como golpe.')}</p>
<h2>{T('Sampler eras', 'Épocas del sampler')}</h2><p>{T('The boxes of the 80s and 90s gave those records their grain. Each track can go through one:', 'Las máquinas de los 80 y 90 les dieron su grano a esos discos. Cada pista puede pasar por una:')}</p>
{table([T('Era', 'Época'), T('Sound', 'Sonido')], [['CLEAN', T('as recorded, full quality', 'tal cual, calidad completa')], ['12-BIT 26K', T('gritty and punchy: the classic hip-hop and jungle box', 'granuloso y con pegada: la caja clásica del hip-hop y el jungle')], ['12-BIT 40K', T('warm, a little soft on top', 'cálido, un poco suave arriba')], ['8-BIT 28K', T('dirty and bright: home-computer trackers', 'sucio y brillante: los trackers de computadora casera')], ['16-BIT PUNCH', T('clean but squeezed, like an MPC', 'limpio pero apretado, como una MPC')]], 'tight')}''')
    # 10 MIX
    page(T('Mixer', 'Mezcla'), f'''{kick(T('Mixer', 'Mezcla'))}<h1>{T('A channel <i>for every sound</i>', 'Un canal <i>para cada sonido</i>')}</h1>
<div class="two"><div>{img('panel_mix', '')}</div><div>
{table([T('Control', 'Control'), T('What it does', 'Qué hace')], [
 [T('LEVEL · PAN', 'NIVEL · PANEO'), T('volume and left / right.', 'volumen e izquierda / derecha.')], ['REVERB · DELAY', T('sends to the room and the tempo echo (MASTER sets them).', 'envíos a la sala y al eco en tempo (MASTER los ajusta).')],
 [T('CUTOFF · RESO · FILTER', 'CORTE · RESO · FILTRO'), T('low, high or band pass with resonance.', 'pasa bajos, altos o banda, con resonancia.')],
 [T('DRIVE', 'SATURAR'), T('from warm to broken: tape saturation into distortion.', 'de cálido a roto: saturación de cinta hasta distorsión.')],
 ['DUCK', T('dips the sound every time the kick hits (sidechain pumping).', 'baja el sonido cada vez que pega el bombo (bombeo de sidechain).')],
 ['SWING', T('swing for this track only.', 'swing solo para esta pista.')],
 [T('CHOKE A–D', 'CORTE MUTUO A–D'), T('sounds in the same group cut each other (closed hat stops the open one).', 'los sonidos del mismo grupo se cortan entre sí (el hat cerrado calla al abierto).')]], 'tight')}</div></div>
{img('live', w='68%', cap=T('<b>fig. 5</b> — in the LIVE view, the faders and the COLOR and FX knobs are the mixer, always at hand.', '<b>fig. 5</b> — en la vista LIVE, los faders y las perillas COLOR y FX son la mezcla, siempre a la mano.'))}
{tip(T('Big beat trick: DRIVE on the break, DUCK at 30 % on the break and the hats, and a hard kick. Everything pumps around the kick.', 'Truco de big beat: DRIVE en el break, DUCK al 30 % en el break y los hats, y un bombo duro. Todo bombea alrededor del bombo.'))}''')
    # 11 TRACK
    poly = ''.join(f'<rect x="{10 + i * 17}" y="{10 + r * 26}" width="15" height="20" rx="3" fill="{c}" fill-opacity="{.85 if (i % n) == 0 else .2}"/>' for r, (n, c) in enumerate([(16, '#ff5a36'), (7, '#c6ff3d'), (5, '#a77bff')]) for i in range(16))
    page(T('Tracks and polymeter', 'Pistas y polirritmo'), f'''{kick(T('Tracks', 'Pistas'))}<h1>{T('Every track <i>its own clock</i>', 'Cada pista <i>su propio reloj</i>')}</h1>
<div class="two"><div>{img('panel_track', '')}</div><div>
<svg viewBox="0 0 290 90" class="diag">{poly}</svg><p class="cap">{T('16, 7 and 5 steps playing together: the pattern only repeats after 560 steps.', '16, 7 y 5 pasos sonando juntos: el patrón se repite hasta después de 560 pasos.')}</p>
{table([T('Setting', 'Ajuste'), T('What it does', 'Qué hace')], [
 [T('LENGTH', 'LARGO'), T('1–64 steps for this track.', '1–64 pasos para esta pista.')],
 [T('SPEED', 'VELOCIDAD'), T('1/8, 1/16, 1/32, 1/64 and triplets (1/16T, 1/8T).', '1/8, 1/16, 1/32, 1/64 y tresillos (1/16T, 1/8T).')],
 [T('DIRECTION', 'DIRECCIÓN'), T('forward, backward, ping-pong or random.', 'adelante, atrás, ida y vuelta o al azar.')],
 [T('EUCLID', 'EUCLIDIANO'), T('spreads HITS evenly over STEPS, ROTATE turns it.', 'reparte GOLPES parejo en PASOS, ROTAR lo gira.')],
 [T('SHIFT · RANDOM · CLEAR · COPY · PASTE', 'MOVER · AZAR · BORRAR · COPIAR · PEGAR'), T('quick tools for the whole track.', 'herramientas rápidas para toda la pista.')]], 'tight')}</div></div>
{img('braindance', w='72%', cap=T('<b>fig. 6</b> — a BRAINDANCE pattern: hats of 7 or 9 steps, percussion of 5, triplets and random direction against a 16-step kick.', '<b>fig. 6</b> — un patrón BRAINDANCE: hats de 7 o 9 pasos, percusión de 5, tresillos y dirección al azar contra un bombo de 16.'))}''')
    # 12 PERFORM
    fx = [('STUTTER', T('repeats the last 1/16 (MASTER › STUTTER sets the length)', 'repite el último 1/16 (MASTER › STUTTER fija el largo)')), ('ROLL', T('every hit becomes a ×4 roll', 'cada golpe se vuelve redoble ×4')),
          ('DRILL', T('random fast rolls with rising pitch on snares, hats and breaks', 'redobles rápidos al azar con tono que sube en cajas, hats y breaks')), ('GLITCH', T('breaks jump to random slices and double up', 'los breaks saltan a cortes al azar y se duplican')),
          ('REVERSE', T('the last beat backwards', 'el último tiempo al revés')), ('TAPE STOP', T('the whole mix slows to a stop', 'toda la mezcla se frena hasta parar')),
          ('CRUSH', T('everything through a 4-bit, 8 kHz box', 'todo por una caja de 4 bits y 8 kHz')), ('FILTER', T('a low-pass sweep down', 'barrido de pasa bajos hacia abajo')),
          ('RISE', T('a high-pass build-up', 'una subida de pasa altos')), ('HALF', T('half time', 'medio tiempo')), ('DOUBLE', T('double time', 'doble tiempo')),
          ('GATE', T('chops the mix in 1/16ths', 'corta la mezcla en dieciseisavos')), ('DUB', T('everything into a long echo', 'todo a un eco largo')),
          ('WARP', T('every hit gets a random pitch', 'cada golpe con un tono al azar')), ('DROP', T('takes out the kicks', 'quita los bombos')), ('FILL', T('a snare fill and the FILL steps', 'un remate de caja y los pasos FILL'))]
    keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Z', 'X', 'C', 'V', 'B', 'N']
    page(T('Perform', 'Tocar en vivo'), f'''{kick(T('Perform', 'Tocar en vivo'))}<h1>{T('Sixteen tricks, <i>one button each</i>', 'Dieciséis trucos, <i>un botón cada uno</i>')}</h1>
{img('perf', '')}
<p>{T('<b>Tap</b> a trick: it stays on until you tap it again. <b>Hold</b> it: it works only while you hold. Several can be on at once (DRILL + FILTER is a classic). They also live on the keyboard.', '<b>Toca</b> un truco: queda encendido hasta que lo vuelvas a tocar. <b>Mantenlo</b>: funciona solo mientras lo sostienes. Puedes encender varios a la vez (DRILL + FILTER es un clásico). También están en el teclado.')}</p>
{table([T('Key', 'Tecla'), T('Trick', 'Truco'), T('What you hear', 'Qué escuchas')], [[f'<span class="k">{keys[i]}</span>', f'<b>{n}</b>', d] for i, (n, d) in enumerate(fx)], 'tight small')}''')
    # 13 REC
    page(T('Recording movement', 'Grabar movimientos'), f'''{kick(T('Recording movement', 'Grabar movimientos'))}<h1>{T('Your hands, <i>written down</i>', 'Tus manos, <i>escritas</i>')}</h1>
<p class="lead">{T('Press ● REC while the beat plays. From then on, what you play becomes part of the pattern and comes back every loop:', 'Presiona ● REC mientras suena el ritmo. Desde ese momento, lo que tocas se vuelve parte del patrón y regresa en cada vuelta:')}</p>
<div class="grid3"><div class="card"><h3>{T('TRICKS', 'TRUCOS')}</h3><p>{T('The tricks you press are written step by step. A red line under a trick shows it is recorded.', 'Los trucos que presionas se escriben paso por paso. Una línea roja bajo un truco muestra que está grabado.')}</p></div>
<div class="card"><h3>{T('KNOBS', 'PERILLAS')}</h3><p>{T('Turn TUNE, DECAY, COLOR, a send, a fader… the movement is stored on each step (up to 12 moves per pattern).', 'Gira AFINAR, CAÍDA, COLOR, un envío, un fader… el movimiento se guarda en cada paso (hasta 12 movimientos por patrón).')}</p></div>
<div class="card"><h3>PADS</h3><p>{T('Hit the pads or a MIDI keyboard: the hits land on the nearest step.', 'Toca los pads o un teclado MIDI: los golpes caen en el paso más cercano.')}</p></div></div>
{tip(T('Record a FILTER sweep on the last bar and a DRILL on the last beat: a build-up that plays itself every time.', 'Graba un barrido FILTER en el último compás y un DRILL en el último tiempo: una subida que se toca sola cada vez.'))}
{img('grid', T('<b>fig. 7</b> — what you play with ● REC on is written on the steps of the pattern.', '<b>fig. 7</b> — lo que tocas con ● REC encendido queda escrito en los pasos del patrón.'))}
<p>{T('Press ● REC again to stop recording. MASTER › CLEAR MOTION erases the recorded movement of the pattern (the steps stay).', 'Presiona ● REC otra vez para dejar de grabar. MASTER › BORRAR MOVIMIENTOS borra el movimiento grabado del patrón (los pasos se quedan).')}</p>''')
    # 14 STYLES
    sty = [('BIG BEAT', '126–138', T('breaks with a heavy kick, distorted and loud', 'breaks con bombo pesado, distorsionados y fuertes')), ('BRAINDANCE', '118–160', T('twisted, odd lengths, drills and glitches', 'retorcido, largos impares, ráfagas y glitches')),
           ('DRILL N BASS', '165–185', T('breaks chopped at speed, pitched rolls, deep sub', 'breaks picados a toda velocidad, redobles afinados, sub grave')), ('JUNGLE', '160–172', T('rolling chopped breaks over a sub', 'breaks picados rodando sobre un sub')),
           ('BREAKBEAT', '125–134', T('funky breaks, solid kick and snare', 'breaks funky, bombo y caja sólidos')), ('ACID TECHNO', '135–145', T('four to the floor, hard and hypnotic', 'cuatro por cuatro, duro e hipnótico')),
           ('ELECTRO', '118–130', T('syncopated boom, zaps and claps', 'boom sincopado, zaps y palmas')), ('BREAKCORE', '180–210', T('mangled breaks, distorted kicks', 'breaks destrozados, bombos distorsionados')),
           ('RAVE 92', '140–150', T('early rave: breaks on a stomp', 'rave temprano: breaks sobre un pisotón')), ('TRIP HOP', '84–96', T('slow, dusty, heavy', 'lento, polvoso, pesado')),
           ('HALFTIME', '168–176', T('half-time weight at drum and bass tempo', 'peso a medio tiempo, a tempo de drum and bass')), ('IDM GLITCH', '96–124', T('micro sounds and probabilities', 'microsonidos y probabilidades')),
           ('VINTAGE BOX', '96–118', T('an old rhythm box with real breaks', 'una caja vieja con breaks reales'))]
    page(T('Styles and generators', 'Estilos y generadores'), f'''{kick(T('Styles and generators', 'Estilos y generadores'))}<h1>{T('Thirteen styles, <i>endless ideas</i>', 'Trece estilos, <i>ideas sin fin</i>')}</h1>
<div class="grid3"><div class="card"><h3>⚡ {T('GENERATE', 'GENERAR')}</h3><p>{T('loads the style’s kit, tempo and mix, and writes a new pattern on the current one.', 'carga el kit, tempo y mezcla del estilo y escribe un patrón nuevo en el actual.')}</p></div>
<div class="card"><h3>{T('VARY', 'VARIAR')}</h3><p>{T('plays your pattern again differently: slices, rolls and ghosts move, the groove stays.', 'toca tu patrón otra vez distinto: se mueven cortes, redobles y fantasmas, el groove se queda.')}</p></div>
<div class="card"><h3>{T('BUILD TRACK', 'ARMAR TEMA')}</h3><p>{T('eight patterns — intro, groove, variations, fills, a break — and a 13-part song.', 'ocho patrones — intro, groove, variaciones, remates, un break — y una canción de 13 partes.')}</p></div></div>
<p>{T('COMPLEX (next to the style) goes from a solid groove to a busy, glitchy one: more ghost notes, rolls, chances and micro timing.', 'COMPLEJO (junto al estilo) va de un groove sólido a uno lleno y glitchy: más notas fantasma, redobles, probabilidades y micro tiempo.')}</p>
{table([T('Style', 'Estilo'), 'BPM', T('Character', 'Carácter')], [[f'<b>{a}</b>', b, c] for a, b, c in sty], 'tight small')}''')
    # 15 SONG
    page(T('Patterns and song', 'Patrones y canción'), f'''{kick(T('Patterns and song', 'Patrones y canción'))}<h1>{T('From a loop <i>to a whole track</i>', 'De un loop <i>a un tema completo</i>')}</h1>
<div class="two"><div>{img('panel_song', '')}</div><div>
<p><b>{T('16 patterns', '16 patrones')}</b> — {T('the numbers at the top. While playing, a click queues the next one: it changes at the end of the current pattern (it blinks while waiting). Shift-click copies the current pattern onto another.', 'los números de arriba. Mientras suena, un clic pone el siguiente en espera: cambia al terminar el patrón actual (parpadea mientras espera). Shift+clic copia el patrón actual a otro.')}</p>
<p><b>PATTERN LENGTH · SWING</b> — {T('the length of the pattern (the longest bar) and its own swing.', 'el largo del patrón (el compás más largo) y su propio swing.')}</p>
<p><b>{T('Song', 'Canción')}</b> — {T('a list of patterns with how many times each repeats. Turn SONG on and PLAY runs it from the top. ⤓ MIDI then exports the whole song.', 'una lista de patrones con cuántas veces se repite cada uno. Enciende SONG y PLAY la toca desde el principio. ⤓ MIDI exporta entonces toda la canción.')}</p></div></div>''')
    # 16 MASTER / EXPORT / KEYS
    notes = [36, 38, 39, 42, 46, 40, 41, 37, 45, 51, 35, 56, 62, 54, 49, 75]
    page(T('Master, export, keys', 'Master, exportar, teclas'), f'''{kick(T('Master and export', 'Master y exportar'))}<h1>{T('The finish, <i>and out</i>', 'El acabado, <i>y afuera</i>')}</h1>
<div class="two"><div>{img('panel_master', '')}</div><div>
<p><b>MASTER</b> — {T('volume, DRIVE and COMP (glue), the global SWING, the reverb room and the tempo delay, HUMAN (looser timing and dynamics), DUCK time, stereo WIDTH and the STUTTER length.', 'volumen, DRIVE y COMP (pegamento), el SWING global, la sala de reverb y el delay en tempo, HUMANO (tiempo y dinámica más sueltos), tiempo del DUCK, ancho estéreo y el largo del STUTTER.')}</p>
<p><b>⤓ MIDI</b> — {T('a MIDI file of the pattern (×4) or of the song, drums on channel 10, one note per track:', 'un archivo MIDI del patrón (×4) o de la canción, batería en el canal 10, una nota por pista:')}</p>
{table([T('Track', 'Pista')] + [str(i + 1) for i in range(8)], [[T('Note', 'Nota')] + [str(n) for n in notes[:8]], [T('Track', 'Pista')] + [str(i + 9) for i in range(8)], [T('Note', 'Nota')] + [str(n) for n in notes[8:]]], 'tight small')}
<p><b>● WAV</b> — {T('records what you hear until you press it again.', 'graba lo que escuchas hasta que lo vuelvas a presionar.')} <b>{T('SAVE · OPEN', 'GUARDAR · ABRIR')}</b> — {T('a .pulsar project file. Your last session is also kept in the browser.', 'un archivo de proyecto .pulsar. Tu última sesión también se guarda en el navegador.')}</p></div></div>
<h2>{T('Keys and MIDI', 'Teclas y MIDI')}</h2>{table([T('Key', 'Tecla'), T('Does', 'Hace')], [['<span class="k">Space</span>', 'PLAY / STOP'], ['<span class="k">R</span>', '● REC'], ['<span class="k">G</span> · <span class="k">V</span>', T('GENERATE · VARY', 'GENERAR · VARIAR')], ['<span class="k">↑</span> <span class="k">↓</span>', T('choose the track', 'elegir pista')], ['<span class="k">1</span>…<span class="k">0</span> <span class="k">Z</span>…<span class="k">N</span>', T('the 16 tricks (tap or hold)', 'los 16 trucos (tocar o mantener)')], [T('MIDI notes 36–51', 'Notas MIDI 36–51'), T('play tracks 1–16 from any controller', 'tocan las pistas 1–16 desde cualquier controlador')]], 'tight')}''')
    # 17 recipes
    rec = [(T('Big beat stomp', 'Pisotón big beat'), ['BIG BEAT · COMPLEX 40 %', T('BREAK A: DRIVE 40 %, era 16-BIT PUNCH', 'BREAK A: DRIVE 40 %, época 16-BIT PUNCH'), T('DUCK 30 % on the breaks and hats', 'DUCK 30 % en breaks y hats'), T('Record FILTER on bar 4, release on the 1', 'Graba FILTER en el compás 4, suéltalo en el 1')]),
           (T('Braindance glitch', 'Glitch braindance'), ['BRAINDANCE · COMPLEX 80 %', T('HAT length 7, FM BLIP length 5, BLOCK speed 1/16T', 'HAT largo 7, FM BLIP largo 5, BLOCK velocidad 1/16T'), T('Rolls PITCH UP with ROLL CHANCE 50 %', 'Redobles PITCH UP con PROB. REDOBLE 50 %'), T('WARP + GLITCH, held for a beat', 'WARP + GLITCH, sostenidos un tiempo')]),
           (T('Drill’n’bass roll', 'Redoble drill’n’bass'), ['DRILL N BASS · 176 BPM', T('BREAK B speed 1/32, length 32', 'BREAK B velocidad 1/32, largo 32'), T('SNARE HI: ×8 ACCEL on step 16', 'SNARE HI: ×8 ACCEL en el paso 16'), T('DRILL on the last bar of every 4 (record it)', 'DRILL en el último compás de cada 4 (grábalo)')]),
           (T('Jungle chop', 'Picado jungle'), ['JUNGLE · REPITCH', T('BREAK A tune +3, era 12-BIT 26K', 'BREAK A afinar +3, época 12-BIT 26K'), T('SUB on 1 and the "and" of 3', 'SUB en el 1 y el "y" del 3'), T('VARY every 8 bars, BUILD TRACK when it grooves', 'VARIAR cada 8 compases, ARMAR TEMA cuando ya tenga groove')])]
    page(T('Recipes', 'Recetas'), f'''{kick(T('Recipes', 'Recetas'))}<h1>{T('Four starting <i>points</i>', 'Cuatro puntos <i>de partida</i>')}</h1>
<div class="grid2">{''.join(f'<div class="card recipe"><h3>{n}</h3><ol>{"".join(f"<li>{x}</li>" for x in st)}</ol></div>' for n, st in rec)}</div>
{img('dnb', T('<b>fig. 4</b> — a DRILL N BASS pattern: chopped breaks, rolls on the high snare, a deep sub.', '<b>fig. 4</b> — un patrón DRILL N BASS: breaks picados, redobles en la caja aguda, un sub grave.'))}''')
    # 18 credits + back
    page(T('Sounds and credits', 'Sonidos y créditos'), f'''{kick(T('Sounds and credits', 'Sonidos y créditos'))}<h1>{T('Made from <i>the best free drums</i>', 'Hecho con <i>las mejores baterías libres</i>')}</h1>
<p>{T('Every sound in PULSAR may be shared freely, so PULSAR can be free and open source. The commercial libraries cannot be packed inside another program; you can still load your own with LOAD YOUR SAMPLE.', 'Cada sonido de PULSAR se puede compartir libremente, por eso PULSAR puede ser gratis y de código abierto. Las librerías comerciales no se pueden empaquetar dentro de otro programa; aun así puedes cargar las tuyas con CARGA TU SAMPLE.')}</p>
{table([T('Library', 'Librería'), T('Authors', 'Autores'), T('Licence', 'Licencia')], [['SM Drums', 'Scott McLean, Tod Stillwell, Suleiman Ali', T('Public domain', 'Dominio público')], ['Big Rusty Drums · Frankensnare · Unruly Drums · Gogodze Phu Vol II', 'Karoryfer Samples', 'CC0'], [T('Rhythm machines', 'Cajas de ritmo'), 'oramics/sampled', T('Public domain', 'Dominio público')], [T('Breaks and designed sounds', 'Breaks y sonidos diseñados'), 'PULSAR', 'CC0']], 'tight')}
<div class="back"><div class="bart">{pulsar_svg(260, False)}</div><div class="btitle">PULSAR</div>
<p>Dark Funk Durcal {T('design', 'diseño')} · {T('built at', 'construido en')} <b>POLARIS SOUND LAB</b> · Mérida, Yucatán, México<br>
<a href="{IG}">Instagram @polaris.sound.lab</a> · <a href="{YT}">YouTube @PolarisSoundLab</a><br><a href="{WEB}">drophlex.github.io/PULSAR</a> · <a href="{REPO}">github.com/drophlex/PULSAR</a></p>
<a class="paypal big" href="{DON}">♥ {T('Support PULSAR · Donate with PayPal', 'Apoya PULSAR · Dona con PayPal')}</a>
<p class="small">{T('Free and open source software (AGPL-3.0), with no warranty. Names of instruments, machines and artists belong to their owners; PULSAR is not affiliated with them.', 'Software libre y de código abierto (AGPL-3.0), sin garantía. Los nombres de instrumentos, máquinas y artistas pertenecen a sus dueños; PULSAR no está afiliado a ellos.')}</p></div>''')

CSS = open(os.path.join(HERE, 'pulsar.css')).read()
def render(langs, out):
    global L
    allp = []; npl = 0
    for lang in langs:
        L = lang; build(); off = npl
        for i, (cls, body, title) in enumerate(PAGES):
            n = i + 1 + off
            foot = '' if cls == 'coverp' else f'<footer><span>PULSAR · {T("MANUAL", "MANUAL")} · {lang.upper()}</span><span>{title}</span><span class="pn">{n:02d}</span></footer>'
            allp.append(f'<section class="page {cls}">{body}{foot}</section>')
        npl += len(PAGES)
    open(out, 'w').write(f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>PULSAR · Manual</title><style>{CSS}</style></head><body>{"".join(allp)}</body></html>')
render(['en'], os.path.join(HERE, 'manual_en.html'))
render(['es'], os.path.join(HERE, 'manual_es.html'))
render(['en', 'es'], os.path.join(HERE, 'manual_en_es.html'))
print('ok', len(PAGES), 'pages per language')
