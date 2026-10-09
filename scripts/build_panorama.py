#!/usr/bin/env python3
"""Arma el panorama del hero: assets/img/pueyrredon-panorama.jpg (S2.b, S2.e).

Entradas
  assets/img/pueyrredon.jpg          retrato original, 1181x1424
  assets/src/pueyrredon-gemini.jpg   extension lateral hecha con Gemini, 1456x720

Pasos
  1. Registra el original dentro de la imagen de Gemini (escala s y desplazamiento
     entero ox, oy) minimizando la diferencia absoluta media en grises.
  2. Amplia la imagen de Gemini por 1/s (LANCZOS) y ajusta el alto del lienzo al del
     original (recorta o rellena reflejando el borde).
  3. Ajusta el color de Gemini al del original: mapa lineal por canal (ganancia, sesgo)
     a partir de media y desvio sobre la region de solapamiento, sin las franjas de fundido.
  4. Correccion de color local (S2.f), por fila y en cada union: el color de baja frecuencia (gaussiano de
     LOCAL_BLUR px) del lado de Gemini pasa a ser una rampa suave (smoothstep) entre el color del original justo
     dentro de la franja de fundido y el que Gemini ya tiene a LOCAL_REACH px de la union; el detalle fino de
     Gemini se conserva y los colores de referencia se suavizan entre filas (LOCAL_SIGMA). Elimina la franja
     rojiza que dejaban el ajuste global y el valle oscuro que Gemini pinta junto al borde del original.
  5. Pega el original a resolucion nativa con un fundido horizontal (smoothstep) de
     FEATHER px en sus bordes izquierdo y derecho.
  6. Guarda el JPEG (RGB, progresivo, sin metadatos, <= MAX_BYTES) y verifica sobre el
     archivo guardado S2.e (la region central coincide con el original, error medio < 3/255)
     y S2.f (uniones invisibles: ver seam_report).
  7. Imprime el desplazamiento del pegado y la caja de la cabeza en px del panorama.

Uso (desde la raiz del repo):  python3 -I scripts/build_panorama.py
  --sin-correccion-local   omite el paso 4 (reproduce la version anterior; debe fallar S2.f)
Sale con codigo != 0 si no logra registrar, ajustar el peso o verificar S2.e o S2.f.
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGINAL = os.path.join(ROOT, "assets", "img", "pueyrredon.jpg")
GEMINI = os.path.join(ROOT, "assets", "src", "pueyrredon-gemini.jpg")
OUTPUT = os.path.join(ROOT, "assets", "img", "pueyrredon-panorama.jpg")

FEATHER = 48  # px de fundido en cada borde lateral del original
HEAD_BOX = (270, 150, 760, 710)  # x1, y1, x2, y2 en px del original (S2)
MAX_BYTES = 700 * 1000  # S2.b: <= 700 KB
QUALITY_START, QUALITY_MIN, QUALITY_STEP = 82, 72, 2
MAE_LIMIT = 3.0  # S2.e: error absoluto medio < 3 sobre 255
LOCAL_BLUR = 24.0  # px, desvio del gaussiano que separa el color de baja frecuencia del detalle de Gemini
LOCAL_SIGMA = 40.0  # px, desvio del gaussiano vertical que suaviza los colores de referencia entre filas
LOCAL_GAP_FROM, LOCAL_GAP_FULL = 16.0, 32.0  # distancia RGB en la union: sin correccion / correccion plena
LOCAL_REACH = 300  # px hacia afuera del borde hasta que la correccion cae a 0
SEAM_STRIP = 24  # S2.f: ancho de cada franja que se compara a los lados de una union
SEAM_BLOCK = 32  # S2.f: filas por bloque
SEAM_LIMIT = 45.0  # S2.f: distancia RGB maxima (0-441) entre franjas, por bloque y union (antes 55.2 / 78.7; ahora 37.3 / 27.5)

COARSE_SCALES = np.arange(0.47, 0.54 + 1e-9, 0.005)
COARSE_RADIUS, COARSE_STEP = 16, 2  # px de busqueda alrededor del centro
FINE_SPAN, FINE_STEP, FINE_RADIUS = 0.005, 0.0005, 4


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def gray(rgb):
    """Gris (Rec. 601) en float32 a partir de un arreglo HxWx3."""
    return (rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114).astype(np.float32)


def downscale(gray_img, scale):
    """Reduce un gris float32 por `scale` con LANCZOS (modo F, sin cuantizar)."""
    h, w = gray_img.shape
    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    return np.asarray(Image.fromarray(gray_img, mode="F").resize(size, Image.LANCZOS), dtype=np.float32)


def mean_abs_diff(small, target, ox, oy):
    """Diferencia absoluta media entre `small` colocada en (ox, oy) de `target`, sobre el solapamiento."""
    h, w = small.shape
    th, tw = target.shape
    x0, y0 = max(ox, 0), max(oy, 0)
    x1, y1 = min(ox + w, tw), min(oy + h, th)
    if x1 - x0 < w // 2 or y1 - y0 < h // 2:
        return float("inf")
    a = small[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    b = target[y0:y1, x0:x1]
    return float(np.abs(a - b).mean())


def search_offsets(small, target, cx, cy, radius, step):
    best = (float("inf"), cx, cy)
    for oy in range(cy - radius, cy + radius + 1, step):
        for ox in range(cx - radius, cx + radius + 1, step):
            score = mean_abs_diff(small, target, ox, oy)
            if score < best[0]:
                best = (score, ox, oy)
    return best


def register(original_gray, gemini_gray):
    """Escala s y desplazamiento entero (ox, oy) del original dentro de Gemini, de grueso a fino."""
    gh, gw = gemini_gray.shape
    oh, ow = original_gray.shape

    best = (float("inf"), 0.0, 0, 0)  # residuo, s, ox, oy
    for s in COARSE_SCALES:
        small = downscale(original_gray, float(s))
        h, w = small.shape
        score, ox, oy = search_offsets(small, gemini_gray, (gw - w) // 2, (gh - h) // 2, COARSE_RADIUS, COARSE_STEP)
        if score < best[0]:
            best = (score, float(s), ox, oy)
    if not np.isfinite(best[0]):
        fail("no se pudo registrar el original en la imagen de Gemini")
    print(f"registro grueso: s={best[1]:.4f} ox={best[2]} oy={best[3]} residuo={best[0]:.3f}")

    _, s0, ox0, oy0 = best
    for s in np.arange(s0 - FINE_SPAN, s0 + FINE_SPAN + 1e-9, FINE_STEP):
        small = downscale(original_gray, float(s))
        score, ox, oy = search_offsets(small, gemini_gray, ox0, oy0, FINE_RADIUS, 1)
        if score < best[0] or (score == best[0] and abs(s - s0) < abs(best[1] - s0)):
            best = (score, float(s), ox, oy)
    return best[1], best[2], best[3], best[0]


def fit_canvas(canvas, px, py, height, width):
    """Recorta o rellena (reflejando el borde) el lienzo para que el rectangulo del original
    (px, py, width x height) quede entero y, en vertical, coincida con el lienzo.
    Devuelve (lienzo, px, py, informe)."""
    h, w = canvas.shape[:2]
    top, bottom = max(0, -py), max(0, py + height - h)
    left, right = max(0, -px), max(0, px + width - w)
    if top or bottom or left or right:
        canvas = np.pad(canvas, ((top, bottom), (left, right), (0, 0)), mode="reflect")
    px, py = px + left, py + top
    cropped_top, cropped_bottom = py, canvas.shape[0] - (py + height)
    canvas = canvas[py:py + height]
    report = (
        f"lienzo de {w}x{h} -> alto {height}: relleno arriba {top}px / abajo {bottom}px, "
        f"recorte arriba {cropped_top}px / abajo {cropped_bottom}px; relleno lateral {left}/{right}px"
    )
    return canvas, px, 0, report


def color_match(canvas, original, px, band):
    """Mapa lineal por canal (ganancia, sesgo) del lienzo hacia el original sobre el solapamiento sin franjas."""
    width = original.shape[1]
    src = canvas[:, px + band:px + width - band].reshape(-1, 3)
    dst = original[:, band:width - band].reshape(-1, 3)
    mean_s, std_s = src.mean(axis=0), src.std(axis=0)
    mean_d, std_d = dst.mean(axis=0), dst.std(axis=0)
    gain = np.where(std_s > 0, std_d / np.maximum(std_s, 1e-6), 1.0)
    bias = mean_d - gain * mean_s
    return np.clip(canvas * gain + bias, 0, 255), gain, bias


def gaussian_blur(values, sigma, axis):
    """Gaussiano 1D a lo largo de `axis` (borde reflejado, convolucion por FFT) de un arreglo float."""
    radius = int(np.ceil(4 * sigma))
    kernel = np.exp(-0.5 * (np.arange(-radius, radius + 1) / sigma) ** 2)
    kernel /= kernel.sum()
    moved = np.moveaxis(values, axis, 0)
    padded = np.pad(moved, [(radius, radius)] + [(0, 0)] * (moved.ndim - 1), mode="reflect")
    size = padded.shape[0] + kernel.size - 1
    shape = (kernel.size,) + (1,) * (moved.ndim - 1)
    blurred = np.fft.irfft(np.fft.rfft(padded, size, axis=0) * np.fft.rfft(kernel.reshape(shape), size, axis=0), size, axis=0)
    return np.moveaxis(blurred[2 * radius:2 * radius + moved.shape[0]], 0, axis)


def smoothstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def match_right_seam(canvas, original, edge):
    """Corrige el color de Gemini a la derecha del borde derecho del original (columna `edge` = primera de Gemini).
    Por fila y, el color de baja frecuencia a lo largo de la distancia d al borde pasa a ser una rampa suave (smoothstep)
    entre el color del original justo dentro de la franja de fundido (mapa O) y el color de baja frecuencia que Gemini
    ya tiene a LOCAL_REACH px (mapa L lejos); el detalle de Gemini por debajo de LOCAL_BLUR px se conserva. Se aplica
    desde el inicio de la franja de fundido hasta LOCAL_REACH px fuera y vale 0 mas alla. Modifica `canvas` in situ."""
    ow = original.shape[1]
    x0, x1 = edge - FEATHER, edge + LOCAL_REACH + 1
    pad = int(np.ceil(4 * LOCAL_BLUR))
    window = canvas[:, x0 - pad:x1 + pad]
    low = gaussian_blur(gaussian_blur(window, LOCAL_BLUR, 1), LOCAL_BLUR, 0)[:, pad:pad + (x1 - x0)]  # H x (x1-x0) x 3
    inner = original[:, ow - FEATHER - SEAM_STRIP:ow - FEATHER].mean(axis=1)  # H x 3, franja interior (la de S2.f)
    inner = gaussian_blur(inner, LOCAL_SIGMA, 0)
    far = gaussian_blur(low[:, -1], LOCAL_SIGMA, 0)
    s = smoothstep((np.arange(x1 - x0) + 0.5) / (x1 - x0))[None, :, None]
    target = inner[:, None, :] * (1 - s) + far[:, None, :] * s
    # Solo se corrige donde hace falta: segun la discontinuidad de la fila (distancia RGB entre el color del original y el
    # de Gemini junto al borde), la correccion pasa de 0 (<= LOCAL_GAP_FROM) a plena (>= LOCAL_GAP_FULL) con smoothstep.
    # Asi las filas donde la union ya era buena conservan los colores de Gemini (bosque, cielo anaranjado).
    gap = np.linalg.norm(inner - low[:, FEATHER + SEAM_STRIP // 2], axis=1)
    strength = smoothstep((gap - LOCAL_GAP_FROM) / (LOCAL_GAP_FULL - LOCAL_GAP_FROM))
    correction = (target - low) * strength[:, None, None]
    correction[:, -1:] = 0.0
    canvas[:, x0:x1] = np.clip(canvas[:, x0:x1] + correction, 0, 255)
    return float(np.abs(correction).max()), correction[:, FEATHER].mean(axis=0)


def local_color_match(canvas, original, px):
    """Aplica match_right_seam a las dos uniones (la izquierda se trabaja espejada). Devuelve (lienzo, resumen)."""
    ow = original.shape[1]
    width = canvas.shape[1]
    out = canvas.copy()
    summary = {}
    summary["derecha"] = match_right_seam(out, original, px + ow)
    mirrored = out[:, ::-1].copy()
    summary["izquierda"] = match_right_seam(mirrored, original[:, ::-1], width - px)
    return mirrored[:, ::-1].copy(), summary


def smoothstep_ramp(width, feather):
    """Alfa por columna: 0->1 en los primeros `feather` px y 1->0 en los ultimos (smoothstep)."""
    t = np.clip((np.arange(width) + 0.5) / feather, 0.0, 1.0)
    left = t * t * (3 - 2 * t)
    return np.minimum(left, left[::-1]).astype(np.float32)


def seam_report(rgb, px, width):
    """S2.f: para cada union (borde izquierdo y derecho del original pegado en px, de ancho `width`) y cada bloque
    de SEAM_BLOCK filas, distancia euclidea RGB entre el color medio de la franja de SEAM_STRIP px del lado de
    Gemini (justo fuera del original) y el de la franja de SEAM_STRIP px del lado del original justo despues de la
    franja de fundido. Devuelve {nombre: (maximo, fila inicial del peor bloque)}."""
    strips = {
        "izquierda": ((px - SEAM_STRIP, px), (px + FEATHER, px + FEATHER + SEAM_STRIP)),
        "derecha": ((px + width, px + width + SEAM_STRIP), (px + width - FEATHER - SEAM_STRIP, px + width - FEATHER)),
    }
    report = {}
    for name, (gemini, original) in strips.items():
        worst, worst_row = 0.0, 0
        for row in range(0, rgb.shape[0] - SEAM_BLOCK + 1, SEAM_BLOCK):
            a = rgb[row:row + SEAM_BLOCK, gemini[0]:gemini[1]].reshape(-1, 3).mean(axis=0)
            b = rgb[row:row + SEAM_BLOCK, original[0]:original[1]].reshape(-1, 3).mean(axis=0)
            distance = float(np.linalg.norm(a - b))
            if distance > worst:
                worst, worst_row = distance, row
        report[name] = (worst, worst_row)
    return report


def save_jpeg(array, path):
    """JPEG RGB progresivo sin metadatos; baja la calidad de 2 en 2 hasta MAX_BYTES. Devuelve (calidad, bytes)."""
    image = Image.fromarray(array, mode="RGB")
    for quality in range(QUALITY_START, QUALITY_MIN - 1, -QUALITY_STEP):
        image.save(path, format="JPEG", quality=quality, progressive=True, optimize=True)
        size = os.path.getsize(path)
        if size <= MAX_BYTES:
            return quality, size
    fail(f"el panorama pesa {size} bytes con calidad {QUALITY_MIN}; el limite es {MAX_BYTES}")


LOCAL_MATCH = "--sin-correccion-local" not in sys.argv[1:]  # esa opcion reproduce el panorama anterior (evidencia RED de S2.f)


def main():
    original_rgb = np.asarray(Image.open(ORIGINAL).convert("RGB"), dtype=np.float32)
    gemini_img = Image.open(GEMINI).convert("RGB")
    gemini_rgb = np.asarray(gemini_img, dtype=np.float32)
    oh, ow = original_rgb.shape[:2]
    gh, gw = gemini_rgb.shape[:2]
    print(f"original {ow}x{oh}, gemini {gw}x{gh}")

    # 1. Registro
    s, ox, oy, residual = register(gray(original_rgb), gray(gemini_rgb))
    print(f"registro fino: s={s:.4f} ox={ox} oy={oy} residuo={residual:.3f} (diferencia absoluta media en gris, 0-255)")

    # 2. Ampliacion y ajuste del lienzo
    canvas_w, canvas_h = round(gw / s), round(gh / s)
    canvas = np.asarray(gemini_img.resize((canvas_w, canvas_h), Image.LANCZOS), dtype=np.float32)
    px, py = round(ox / s), round(oy / s)
    print(f"gemini ampliado x{1 / s:.4f}: {canvas_w}x{canvas_h}; pegado previsto en ({px}, {py})")
    canvas, px, py, report = fit_canvas(canvas, px, py, oh, ow)
    print(report)

    # 3. Color
    canvas, gain, bias = color_match(canvas, original_rgb, px, FEATHER)
    print("mapa de color (R, G, B) ganancia:", " ".join(f"{g:.4f}" for g in gain), "| sesgo:", " ".join(f"{b:+.2f}" for b in bias))

    # 4. Correccion de color local en las uniones (S2.f)
    if LOCAL_MATCH:
        canvas, summary = local_color_match(canvas, original_rgb, px)
        for name, (peak, mean) in summary.items():
            print(f"correccion local {name}: maximo {peak:.1f}, en el borde (R, G, B) {' '.join(f'{m:+.1f}' for m in mean)}")

    # 5. Pegado con fundido horizontal
    alpha = smoothstep_ramp(ow, FEATHER)[None, :, None]
    canvas[py:py + oh, px:px + ow] = alpha * original_rgb + (1 - alpha) * canvas[py:py + oh, px:px + ow]
    panorama = np.clip(np.rint(canvas), 0, 255).astype(np.uint8)
    height, width = panorama.shape[:2]

    # 6. Guardado y verificacion (S2.e, S2.f) sobre el archivo guardado
    tmp = OUTPUT + ".tmp"
    try:
        quality, size = save_jpeg(panorama, tmp)
        with Image.open(tmp) as saved:
            saved_rgb = np.asarray(saved.convert("RGB"), dtype=np.float32)
        centre = saved_rgb[py:py + oh, px + FEATHER:px + ow - FEATHER]
        reference = original_rgb[:, FEATHER:ow - FEATHER]
        mae = float(np.abs(centre - reference).mean())
        if not mae < MAE_LIMIT:
            fail(f"S2.e: el error absoluto medio de la region central es {mae:.3f} (limite {MAE_LIMIT})")
        seams = seam_report(saved_rgb, px, ow)
        for name, (worst, row) in seams.items():
            print(f"S2.f union {name}: maximo {worst:.2f} (limite {SEAM_LIMIT}), peor bloque filas {row}-{row + SEAM_BLOCK - 1}")
        failed = [name for name, (worst, _) in seams.items() if not worst < SEAM_LIMIT]
        if failed:
            fail(f"S2.f: union {' y '.join(failed)} supera {SEAM_LIMIT} (distancia RGB entre franjas de {SEAM_STRIP} px)")
        os.replace(tmp, OUTPUT)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

    print(f"S2.e OK: error absoluto medio de la region central = {mae:.3f}/255 (< {MAE_LIMIT}); franjas excluidas: {FEATHER}px a cada lado")
    print(f"guardado {os.path.relpath(OUTPUT, ROOT)}: {width}x{height}, calidad {quality}, {size} bytes ({size / 1024:.1f} KiB)")

    # 7. Caja de la cabeza en px del panorama
    hx1, hy1, hx2, hy2 = HEAD_BOX
    print(f"desplazamiento del pegado: x={px} y={py}")
    print(f"caja de la cabeza (px del panorama): x {hx1 + px}-{hx2 + px}, y {hy1 + py}-{hy2 + py}")


if __name__ == "__main__":
    main()
