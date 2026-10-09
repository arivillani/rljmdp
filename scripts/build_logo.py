#!/usr/bin/env python3
"""Arma el isologotipo de la Gran Logia Argentina: assets/img/gran-logia-argentina.png (S7.g).

Entrada
  assets/src/gran-logia-argentina-original.png   blanco sobre negro, 903x492

Pasos
  1. Carga el original como RGB e imprime la luminancia (Rec. 601, 0-255) de las 4 esquinas.
     Deben quedar en ALPHA_LOW o por debajo (el fondo es negro casi puro).
  2. Alfa a partir de la luminancia con rampa suave: 0 en L <= 40, 255 en L >= 215.
  3. RGB fijo en el token --blanco (#f0ebe3, blanco hueso); solo se conserva el alfa del paso 2.
  4. Recorta a la caja de alfa > 0 con un margen transparente de 4 px.
  5. Guarda RGBA optimizado y sin metadatos en un temporal, lo verifica y luego lo reemplaza.
  6. Verifica: el pixel superior izquierdo tiene alfa 0 y hay al menos un pixel con alfa 255.

Uso (desde la raiz del repo):  python3 -I scripts/build_logo.py
Sale con codigo != 0 si el fondo no queda transparente o si falla alguna verificacion.
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGINAL = os.path.join(ROOT, "assets", "src", "gran-logia-argentina-original.png")
OUTPUT = os.path.join(ROOT, "assets", "img", "gran-logia-argentina.png")

BLANCO = (240, 235, 227)  # --blanco: #f0ebe3
ALPHA_LOW, ALPHA_HIGH = 40, 215  # L <= 40 -> alfa 0; L >= 215 -> alfa 255
MARGIN = 4  # px transparentes alrededor de la caja de alfa > 0


def fail(message):
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def luminance(rgb):
    """Luminancia (Rec. 601) en float32, 0-255, a partir de un arreglo HxWx3."""
    return (rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114).astype(np.float32)


def alpha_from_luminance(lum):
    """Rampa lineal de ALPHA_LOW a ALPHA_HIGH, recortada a [0, 255] y cuantizada a uint8."""
    ramp = np.clip((lum - ALPHA_LOW) / (ALPHA_HIGH - ALPHA_LOW), 0.0, 1.0)
    return np.rint(ramp * 255).astype(np.uint8)


def main():
    rgb = np.asarray(Image.open(ORIGINAL).convert("RGB"), dtype=np.float32)
    lum = luminance(rgb)
    h, w = lum.shape
    print(f"original {w}x{h}")

    # 1. Luminancia de las esquinas (fondo)
    corners = {
        "arriba-izq": lum[0, 0],
        "arriba-der": lum[0, w - 1],
        "abajo-izq": lum[h - 1, 0],
        "abajo-der": lum[h - 1, w - 1],
    }
    for name, value in corners.items():
        print(f"luminancia esquina {name}: {value:.1f}")
    background = max(corners.values())
    if background > ALPHA_LOW:
        fail(f"una esquina tiene luminancia {background:.1f} > {ALPHA_LOW}; el fondo no queda transparente")

    # 2-3. Alfa desde luminancia; RGB fijo en --blanco
    alpha = alpha_from_luminance(lum)
    rgba = np.empty((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = BLANCO
    rgba[..., 3] = alpha
    image = Image.fromarray(rgba)

    # 4. Recorte a alfa > 0 con margen transparente
    ys, xs = np.nonzero(alpha)
    if xs.size == 0:
        fail("ningun pixel con alfa > 0")
    box = (
        int(xs.min()) - MARGIN,
        int(ys.min()) - MARGIN,
        int(xs.max()) + 1 + MARGIN,
        int(ys.max()) + 1 + MARGIN,
    )
    cropped = image.crop(box)  # fuera del original PIL rellena con ceros (transparente)
    print(f"caja de alfa > 0: x {xs.min()}-{xs.max()}, y {ys.min()}-{ys.max()}; "
          f"recorte con margen de {MARGIN} px: {box}")

    # 5-6. Guardado en temporal, verificacion sobre el archivo guardado y reemplazo
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    tmp = OUTPUT + ".tmp"
    try:
        cropped.save(tmp, format="PNG", optimize=True)
        with Image.open(tmp) as saved:
            if saved.mode != "RGBA":
                fail(f"modo {saved.mode}, se esperaba RGBA")
            saved_alpha = np.asarray(saved.getchannel("A"))
            width, height = saved.size
        if saved_alpha[0, 0] != 0:
            fail(f"pixel superior izquierdo con alfa {saved_alpha[0, 0]} (se esperaba 0)")
        opaque = int((saved_alpha == 255).sum())
        if opaque == 0:
            fail("ningun pixel con alfa 255")
        os.replace(tmp, OUTPUT)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)

    size = os.path.getsize(OUTPUT)
    print(f"verificacion OK: alfa del pixel superior izquierdo = 0; pixeles con alfa 255 = {opaque}")
    print(f"guardado {os.path.relpath(OUTPUT, ROOT)}: {width}x{height}, {size} bytes ({size / 1024:.1f} KiB)")


if __name__ == "__main__":
    main()
