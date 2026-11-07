"""Tema musical original para el video de presentación (libre de derechos, generado por código).

Pop corporativo a 118 BPM en La menor: Am - F - C - G. Batería, bajo, colchón de acordes,
arpegio y una melodía en los coros. Uso: python3 musica.py SEGUNDOS salida.wav
"""
import sys, wave
import numpy as np

SR = 44100
BPM = 118
BEAT = 60 / BPM
BAR = BEAT * 4
dur = float(sys.argv[1]) if len(sys.argv) > 1 else 180
out = sys.argv[2] if len(sys.argv) > 2 else 'musica.wav'
N = int(SR * (dur + 3))
rng = np.random.default_rng(7)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(buf, x, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N: return
    x = x[: N - i].copy()
    # Rampa corta al inicio y al final de cada sonido para evitar chasquidos.
    a, z = min(len(x), int(.003 * SR)), min(len(x), int(.012 * SR))
    x[:a] *= np.linspace(0, 1, a); x[len(x) - z:] *= np.linspace(1, 0, z)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(x)] += x * gain * l
    buf[1, i:i + len(x)] += x * gain * r

def env(n, a, d, s, r, hold):
    """Envolvente ADSR en muestras: ataque, decaimiento, sostenido, liberación y duración de nota."""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-4), e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    e = np.where(t >= hold, s * np.exp(-(t - hold) / max(r, 1e-4)), e)
    return e

def additive(freq, n, harm, tilt=1.0, detune=0.0, decay_hi=0.0):
    t = np.arange(n) / SR
    x = np.zeros(n)
    for h in range(1, harm + 1):
        amp = 1 / h ** tilt
        if decay_hi: amp = amp * np.exp(-t * decay_hi * (h - 1))
        x += amp * np.sin(2 * np.pi * freq * (1 + detune) * h * t + h)
    return x / harm ** 0.5

def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** 4)
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))

# Sonidos de batería
def kick():
    n = int(.42 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) * 1.0 + 0.3 * np.sin(ph * 2) * np.exp(-t * 30)
def clap():
    n = int(.32 * SR); t = np.arange(n) / SR
    z = fft_filter(rng.standard_normal(n), lo=900, hi=5200)
    e = np.exp(-t * 16) + 0.6 * np.exp(-np.maximum(t - .012, 0) * 40) * (t > .012) + 0.5 * np.exp(-np.maximum(t - .024, 0) * 40) * (t > .024)
    return z * e * 0.45 + 0.25 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)
def hat(open_=False):
    n = int((.22 if open_ else .06) * SR); t = np.arange(n) / SR
    z = fft_filter(rng.standard_normal(n), lo=7000)
    return z * np.exp(-t * (14 if open_ else 70)) * 0.35
K, CL, HC, HO = kick(), clap(), hat(), hat(True)

# Armonía: Am F C G (dos tiempos de compás por acorde -> un compás cada uno)
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [45, 41, 36, 43]
# Melodía de coro (semicorcheas = 0.25 tiempos): (tiempo dentro de 4 compases, nota MIDI, duración en tiempos)
HOOK = [(0, 76, 1), (1, 74, .5), (1.5, 72, .5), (2, 74, 1.5), (4, 72, 1), (5, 69, .5), (5.5, 72, .5), (6, 77, 1.5),
        (8, 76, 1), (9, 79, .5), (9.5, 76, .5), (10, 74, 1.5), (12, 72, .75), (12.75, 74, .75), (13.5, 71, .5), (14, 74, 2)]

bars = int(np.ceil(dur / BAR)) + 1
# Secciones en compases: intro 8, verso 16, coro 16, puente 8, coro 16, final; se repite si el video es largo.
def section(b):
    plan = ['intro'] * 8 + ['verso'] * 16 + ['coro'] * 16 + ['puente'] * 8 + ['coro'] * 16 + ['verso'] * 8 + ['coro'] * 16
    if b < len(plan): return plan[b]
    return ['verso', 'coro'][((b - len(plan)) // 16) % 2]
last_bar = int(dur / BAR)

drums = np.zeros((2, N)); bass = np.zeros((2, N)); pad = np.zeros((2, N)); arp = np.zeros((2, N)); lead = np.zeros((2, N))
side = np.ones(N)
for b in range(bars):
    sec = 'final' if b >= last_bar - 1 else section(b)
    t0 = b * BAR; ch = CHORDS[b % 4]; root = ROOTS[b % 4]
    full = sec in ('verso', 'coro')
    # Batería
    for q in range(4):
        tb = t0 + q * BEAT
        if full or (sec == 'intro' and b >= 4) or (sec == 'final' and q == 0):
            add(drums, K, tb, 0.78)
            i = int(tb * SR); m = min(N, i + int(.28 * SR))
            side[i:m] = np.minimum(side[i:m], 0.45 + 0.55 * (np.arange(m - i) / (m - i)) ** .6)
        if full and q in (1, 3): add(drums, CL, tb, 0.7 if sec == 'coro' else 0.55)
        if full or sec == 'intro':
            add(drums, HC, tb, 0.35, -0.3)
            add(drums, HO if sec == 'coro' else HC, tb + BEAT / 2, 0.42, 0.3)
            if sec == 'coro': add(drums, HC, tb + BEAT * .75, 0.22, 0.2)
    # Bajo en corcheas
    if full or sec == 'puente':
        pat = [0, 0, 12, 0, 0, 7, 12, 0] if sec == 'coro' else [0, 0, 0, 12, 0, 0, 7, 0]
        for k, off in enumerate(pat):
            n = int(BEAT / 2 * SR * .9)
            x = additive(mtof(root + off), n, 6, tilt=1.3) * env(n, .004, .08, .7, .05, BEAT / 2 * .75)
            add(bass, x, t0 + k * BEAT / 2, 0.55 if sec != 'puente' else 0.35)
    # Colchón de acordes
    n = int(BAR * SR * 1.05)
    for m in ch:
        for det, pan in ((-0.004, -0.5), (0.004, 0.5)):
            x = additive(mtof(m), n, 8, tilt=1.1, detune=det) * env(n, .35 if sec in ('intro', 'puente') else .08, .3, .8, .4, BAR)
            add(pad, x, t0, 0.13 if sec != 'coro' else 0.16, pan)
    # Arpegio en semicorcheas
    if sec in ('verso', 'coro', 'intro', 'puente'):
        notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24]
        for k in range(16):
            n = int(BEAT / 4 * SR * 1.8)
            x = additive(mtof(notes[k % 4]), n, 5, tilt=1.0, decay_hi=9) * env(n, .002, .12, .0, .05, .14)
            g = 0.16 if sec != 'intro' else 0.11
            add(arp, x, t0 + k * BEAT / 4, g, -0.4 if k % 2 else 0.4)
            add(arp, x, t0 + k * BEAT / 4 + BEAT * .75, g * .35, 0.6 if k % 2 else -0.6)
    # Melodía del coro
    if sec == 'coro':
        cb = b % 4
        for (pos, note, ln) in HOOK:
            if int(pos // 4) != cb: continue
            n = int((ln * BEAT + .3) * SR); t = np.arange(n) / SR
            vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * (t > .15)
            ph = 2 * np.pi * mtof(note) * np.cumsum(vib) / SR
            x = (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph)) * env(n, .01, .1, .75, .18, ln * BEAT * .92)
            add(lead, x, t0 + (pos % 4) * BEAT, 0.22, 0.1)

# Reverberación por convolución con una respuesta de impulso sintética
def reverb(x, secs=2.4, mix=.25):
    n = int(secs * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((2, n)) * np.exp(-t * 3.2)
    ir = np.stack([fft_filter(ir[0], hi=6000), fft_filter(ir[1], hi=6000)])
    L = x.shape[1] + n
    y = np.stack([np.fft.irfft(np.fft.rfft(x[c], L) * np.fft.rfft(ir[c], L), L)[: x.shape[1]] for c in range(2)])
    y /= np.max(np.abs(y)) + 1e-9
    return x + y * mix * np.max(np.abs(x))

pad = reverb(pad * side, mix=.35)
lead = reverb(lead, mix=.3)
arp = reverb(arp, mix=.22)
mix = drums * 0.85 + bass * side + pad * 1.25 + arp * 1.2 + lead * 1.1
mix = np.stack([fft_filter(mix[0], lo=28), fft_filter(mix[1], lo=28)])
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) / 0.89
T = np.arange(N) / SR
fade = np.clip(T / 1.5, 0, 1) * np.clip((dur + .5 - T) / 4.0, 0, 1)
mix *= fade
mix = mix[:, : int(SR * (dur + .5))]
pcm = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('música', out, round(dur, 1), 's')
