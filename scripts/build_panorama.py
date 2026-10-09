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
  4. Pega el original a resolucion nativa con un fundido horizontal (smoothstep) de
     FEATHER px en sus bordes izquierdo y derecho.
  5. Guarda el JPEG (RGB, progresivo, sin metadatos, <= MAX_BYTES) y verifica S2.e sobre
     el archivo guardado: la region central coincide con el original (error medio < 3/255).
  6. Imprime el desplazamiento del pegado y la caja de la cabeza en px del panorama.

Uso (desde la raiz del repo):  python3 -I scripts/build_panorama.py
Sale con codigo != 0 si no logra registrar, ajustar el peso o verificar S2.e.
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


def smoothstep_ramp(width, feather):
    """Alfa por columna: 0->1 en los primeros `feather` px y 1->0 en los ultimos (smoothstep)."""
    t = np.clip((np.arange(width) + 0.5) / feather, 0.0, 1.0)
    left = t * t * (3 - 2 * t)
    return np.minimum(left, left[::-1]).astype(np.float32)


def save_jpeg(array, path):
    """JPEG RGB progresivo sin metadatos; baja la calidad de 2 en 2 hasta MAX_BYTES. Devuelve (calidad, bytes)."""
    image = Image.fromarray(array, mode="RGB")
    for quality in range(QUALITY_START, QUALITY_MIN - 1, -QUALITY_STEP):
        image.save(path, format="JPEG", quality=quality, progressive=True, optimize=True)
        size = os.path.getsize(path)
        if size <= MAX_BYTES:
            return quality, size
    fail(f"el panorama pesa {size} bytes con calidad {QUALITY_MIN}; el limite es {MAX_BYTES}")


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

    # 4. Pegado con fundido horizontal
    alpha = smoothstep_ramp(ow, FEATHER)[None, :, None]
    canvas[py:py + oh, px:px + ow] = alpha * original_rgb + (1 - alpha) * canvas[py:py + oh, px:px + ow]
    panorama = np.clip(np.rint(canvas), 0, 255).astype(np.uint8)
    height, width = panorama.shape[:2]

    # 5-6. Guardado y verificacion (S2.e) sobre el archivo guardado
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
