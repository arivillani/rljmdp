// @ts-check
// Suite de aceptación de odd/tasks/landing-pueyrredon.md (S1–S9).
// Cada test lleva el ID del criterio (S#.x) en su nombre.
const { test, expect } = require('@playwright/test');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['390×844', MOBILE],
];
// S2.c y S2.d: viewports reales de escritorio (con barra del navegador, también ultraancho) y de móvil.
const HERO_VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['1920×950', { width: 1920, height: 950 }],
  ['1366×650', { width: 1366, height: 650 }],
  ['2560×1080', { width: 2560, height: 1080 }],
  ['390×844', MOBILE],
  ['360×740', { width: 360, height: 740 }],
];

// S9.a: medida del pie en escritorio (con barra del navegador y sin ella).
const MEASURE_VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['1920×950', { width: 1920, height: 950 }],
];
const MAX_CHARS_PER_LINE = 75;
const PIE_MIN_GUTTER = 24;
// S9.f: franja inferior del hero y luminancia máxima de su color promedio (antes del velo multiply: ≈ 0,025, lila).
const BASE_STRIP = 22;
const BASE_MAX_LUMINANCE = 0.012;

// S4.c: logotipo de una sola línea, también a 360 px.
const LOGO_VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['390×844', MOBILE],
  ['360×740', { width: 360, height: 740 }],
];

// S4.e (L24): proporción áurea del bloque de título, en estos tres viewports.
const PHI = (1 + Math.sqrt(5)) / 2;
const PHI_VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['1366×650', { width: 1366, height: 650 }],
  ['390×844', MOBILE],
];

// Caja de la cabeza con pelo, patillas y mentón (S2), en px del panorama: la del original
// (x 270–760, y 150–710) más el desplazamiento del pegado (845, 0) que imprime scripts/build_panorama.py.
const HEAD_BOX = { x1: 1115, x2: 1605, y1: 150, y2: 710 };
const HEAD_MARGIN = 8;
const HEAD_TITLE_GAP = 4; // S2.d: la cabeza empieza ≥ 4 px debajo de todo el hgroup.titulo (L24)
const PANORAMA_PATH = '/assets/img/pueyrredon-panorama.jpg';
const PANORAMA_MAX_BYTES = 700 * 1000; // S2.b: ≤ 700 KB (lectura estricta, igual que el script)

const TOKENS = {
  '--rojo-950': '#1b0303',
  '--rojo-900': '#400001',
  '--rojo-800': '#7c0000',
  '--rojo-700': '#a60000',
  '--rojo-600': '#ce0201',
  '--carmesi-700': '#81001f',
  '--carmesi-500': '#a41727',
  '--carmesi-300': '#ca302e',
  '--oxido-600': '#9b1307',
  '--rosa-300': '#ff7a7b',
  '--rosa-100': '#ffbbba',
  '--tinta': '#1c1c26',
};

const TITLE = 'Juan Martín De Pueyrredón';
const KICKER = 'Respetable Logia';
const DOCUMENT_TITLE = `${KICKER} ${TITLE}`; // S4.d (L24)
const KICKER_SELECTOR = 'hgroup.titulo p.titulo__antetitulo';

// S7.g y S7.h (L24, L25): auspicio con el isologotipo enlazado.
const AUSPICIO_TEXT = 'Bajo los auspicios de la';
const LOGO_SRC_END = 'assets/img/gran-logia-argentina.png';
const LOGO_ALT = 'Gran Logia Argentina de Libres y Aceptados Masones';
const LOGO_LINK_HREF = 'https://www.masoneria-argentina.org.ar/';
const LOGO_LINK_NAME = `${LOGO_ALT} (se abre en una pestaña nueva)`;
const LOGO_MIN_WIDTH = 200;
const LOGO_MAX_WIDTH = 320;

/** '#rrggbb' -> 'r,g,b' */
function hexToRgbKey(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
}

/** 'rgb(r, g, b)' | 'rgba(r, g, b, a)' -> 'r,g,b' (ignora alfa). null si no parsea. */
function rgbKey(css) {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(css.trim());
  return m ? `${m[1]},${m[2]},${m[3]}` : null;
}

const TOKEN_KEYS = new Set(Object.values(TOKENS).map(hexToRgbKey));

/** Luminancia relativa WCAG de un color sRGB [r, g, b] (0–255). */
function relativeLuminance([r, g, b]) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contraste WCAG entre dos colores sRGB [r, g, b]. */
function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Color sRGB promedio de una captura PNG (decodificada en el navegador con canvas).
 * @param {import('@playwright/test').Page} page
 * @param {Buffer} png
 * @returns {Promise<[number, number, number]>}
 */
function averageColor(page, png) {
  return page.evaluate(async (base64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sum = [0, 0, 0];
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
    }
    return /** @type {[number, number, number]} */ (sum.map((v) => v / pixels));
  }, png.toString('base64'));
}

/**
 * Guarda de "la landing se sirve": evita que los criterios negativos (sin menú,
 * sin script, sin errores…) pasen en vacío contra un listado de directorio o un 404.
 * @param {import('@playwright/test').Page} page
 */
async function expectLandingServed(page) {
  await expect(page.locator('main > section.hero'), 'la landing no está servida').toHaveCount(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expectLandingServed(page);
});

test.describe('S1 — Formato Tamburins', () => {
  for (const [label, viewport] of VIEWPORTS) {
    test(`S1.a — .hero mide el alto del viewport (±1 px) a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const heroHeight = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().height);
      expect(Math.abs(heroHeight - viewport.height)).toBeLessThanOrEqual(1);
    });
  }

  test('S1.b — sin elemento header; ni el texto visible ni la meta description contienen Buenos Aires, 1777 ni 1850', async ({ page }) => {
    await expect(page.locator('header')).toHaveCount(0);
    const { text, description } = await page.evaluate(() => ({
      text: document.body.innerText,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    }));
    for (const banned of ['Buenos Aires', '1777', '1850']) {
      expect(text, `texto visible contiene "${banned}"`).not.toContain(banned);
      expect(description, `meta description contiene "${banned}"`).not.toContain(banned);
    }
  });

  test('S1.c — sin scroll horizontal a 390 px', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

test.describe('S2 — Imagen de fondo, con la cabeza entera', () => {
  test('S2.a — único img.hero__retrato en .hero, src del panorama, alt no vacío, cargada (naturalWidth ≥ 2400, proporción 1,9–2,1)', async ({ page }) => {
    await expect(page.locator('img.hero__retrato')).toHaveCount(1);
    await expect(page.locator('.hero > img.hero__retrato')).toHaveCount(1);
    const info = await page.locator('img.hero__retrato').evaluate(async (img) => {
      const el = /** @type {HTMLImageElement} */ (img);
      try {
        await el.decode();
      } catch (e) {
        /* se informa vía naturalWidth */
      }
      return { src: el.src, alt: el.alt, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight };
    });
    expect(info.src.endsWith('assets/img/pueyrredon-panorama.jpg'), `src: ${info.src}`).toBe(true);
    expect(info.alt.trim().length, 'alt vacío').toBeGreaterThan(0);
    expect(info.naturalWidth, 'naturalWidth').toBeGreaterThanOrEqual(2400);
    const ratio = info.naturalWidth / info.naturalHeight;
    expect(ratio, `proporción ${info.naturalWidth}×${info.naturalHeight} = ${ratio.toFixed(3)}`).toBeGreaterThanOrEqual(1.9);
    expect(ratio, `proporción ${info.naturalWidth}×${info.naturalHeight} = ${ratio.toFixed(3)}`).toBeLessThanOrEqual(2.1);
  });

  test('S2.b — GET /assets/img/pueyrredon-panorama.jpg responde 200 image/jpeg y pesa ≤ 700 KB', async ({ request }) => {
    const res = await request.get(PANORAMA_PATH);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
    const bytes = (await res.body()).length;
    expect(bytes, `peso ${bytes} bytes`).toBeGreaterThan(0);
    expect(bytes, `peso ${bytes} bytes`).toBeLessThanOrEqual(PANORAMA_MAX_BYTES);
  });

  for (const [label, viewport] of HERO_VIEWPORTS) {
    test(`S2.c — sangre completa sin desenfoque: object-fit cover, img = hero (±1 px) y sin blur en .hero ni sus pseudo-elementos a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        const img = document.querySelector('img.hero__retrato');
        const h = hero.getBoundingClientRect();
        const r = img.getBoundingClientRect();
        return {
          objectFit: getComputedStyle(img).objectFit,
          hero: { left: h.left, top: h.top, width: h.width, height: h.height },
          img: { left: r.left, top: r.top, width: r.width, height: r.height },
          filters: {
            '.hero': getComputedStyle(hero).filter,
            '.hero::before': getComputedStyle(hero, '::before').filter,
            '.hero::after': getComputedStyle(hero, '::after').filter,
          },
        };
      });
      expect(m.objectFit, 'object-fit del img').toBe('cover');
      for (const key of ['left', 'top', 'width', 'height']) {
        expect(
          Math.abs(m.img[key] - m.hero[key]),
          `${key}: img ${m.img[key]} vs hero ${m.hero[key]}`,
        ).toBeLessThanOrEqual(1);
      }
      for (const [what, filter] of Object.entries(m.filters)) {
        expect(filter, `filter de ${what}`).not.toContain('blur');
      }
    });
  }

  for (const [label, viewport] of HERO_VIEWPORTS) {
    test(`S2.d — cabeza entera con ≥ 8 px de margen y ≥ ${HEAD_TITLE_GAP} px por debajo de todo el hgroup.titulo a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Geometría de object-fit: cover + object-position (en %) aplicada a la caja de la cabeza.
      const m = await page.evaluate(async ({ headBox }) => {
        const hero = document.querySelector('.hero').getBoundingClientRect();
        const img = /** @type {HTMLImageElement} */ (document.querySelector('img.hero__retrato'));
        try {
          await img.decode();
        } catch (e) {
          /* se informa vía naturalWidth */
        }
        const r = img.getBoundingClientRect();
        const block = document.querySelector('hgroup.titulo');
        const t = block ? block.getBoundingClientRect() : null;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const position = getComputedStyle(img).objectPosition;
        const objectFit = getComputedStyle(img).objectFit;
        const [px, py] = position.split(/\s+/).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : NaN));
        const scale = Math.max(r.width / iw, r.height / ih);
        const dx = (r.width - iw * scale) * px;
        const dy = (r.height - ih * scale) * py;
        return {
          position,
          objectFit,
          src: img.src,
          naturalWidth: iw,
          scale,
          clientWidth: document.documentElement.clientWidth,
          heroHeight: hero.height,
          head: {
            left: r.left + dx + headBox.x1 * scale,
            right: r.left + dx + headBox.x2 * scale,
            top: r.top - hero.top + dy + headBox.y1 * scale,
            bottom: r.top - hero.top + dy + headBox.y2 * scale,
          },
          titulo: t && { left: t.left, right: t.right, top: t.top - hero.top, bottom: t.bottom - hero.top },
        };
      }, { headBox: HEAD_BOX });
      // Guarda: la proyección solo significa algo con el panorama (la caja está en sus px) y con object-fit: cover.
      expect(m.src.endsWith('assets/img/pueyrredon-panorama.jpg'), `src: ${m.src}`).toBe(true);
      expect(m.objectFit, 'object-fit del img').toBe('cover');
      expect(m.naturalWidth, 'la imagen no cargó').toBeGreaterThan(0);
      expect(Number.isFinite(m.scale), `object-position "${m.position}" no está en %`).toBe(true);
      expect(m.titulo, 'falta hgroup.titulo (L24)').not.toBeNull();
      const { head, titulo } = /** @type {{ head: any, titulo: any }} */ (m);
      const box = `cabeza x ${head.left.toFixed(1)}–${head.right.toFixed(1)}, y ${head.top.toFixed(1)}–${head.bottom.toFixed(1)} ` +
        `(viewport ${m.clientWidth}×${m.heroHeight}, escala ${m.scale.toFixed(3)}, object-position ${m.position})`;
      expect.soft(head.left, `margen izquierdo: ${box}`).toBeGreaterThanOrEqual(HEAD_MARGIN);
      expect.soft(head.top, `margen superior: ${box}`).toBeGreaterThanOrEqual(HEAD_MARGIN);
      expect.soft(head.right, `margen derecho: ${box}`).toBeLessThanOrEqual(m.clientWidth - HEAD_MARGIN);
      expect.soft(head.bottom, `margen inferior: ${box}`).toBeLessThanOrEqual(m.heroHeight - HEAD_MARGIN);
      expect.soft(
        head.top,
        `la cabeza empieza en y ${head.top.toFixed(1)} y el hgroup.titulo termina en y ${titulo.bottom.toFixed(1)} ` +
          `(holgura ${(head.top - titulo.bottom).toFixed(1)} px, mínimo ${HEAD_TITLE_GAP}): ${box}`,
      ).toBeGreaterThanOrEqual(titulo.bottom + HEAD_TITLE_GAP);
    });
  }
});

test.describe('S3 — Sin menú lateral', () => {
  test('S3.a — sin aside, nav ni elementos menu/drawer/sidebar/hamburger', async ({ page }) => {
    await expect(page.locator('aside, nav')).toHaveCount(0);
    const offenders = await page.evaluate(() => {
      const re = /menu|drawer|sidebar|hamburger/i;
      return [...document.querySelectorAll('body, body *')]
        .filter((el) =>
          re.test(el.getAttribute('class') || '') ||
          re.test(el.id || '') ||
          re.test(el.getAttribute('aria-label') || ''),
        )
        .map((el) => el.outerHTML.slice(0, 80));
    });
    expect(offenders).toEqual([]);
  });

  test('S3.b — sin button ni role="button"', async ({ page }) => {
    await expect(page.locator('button, [role="button"]')).toHaveCount(0);
  });
});

test.describe('S4 — Título centrado, pequeño y arriba', () => {
  test('S4.a — exactamente un h1 con el texto exacto', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    expect((await h1.textContent())?.trim()).toBe(TITLE);
  });

  for (const [label, viewport] of VIEWPORTS) {
    test(`S4.b — h1 centrado horizontalmente (±2 px) con text-align center a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const info = await page.locator('h1').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          centerX: r.left + r.width / 2,
          viewportCenterX: document.documentElement.clientWidth / 2,
          textAlign: getComputedStyle(el).textAlign,
        };
      });
      expect(Math.abs(info.centerX - info.viewportCenterX)).toBeLessThanOrEqual(2);
      expect(info.textAlign).toBe('center');
    });
  }

  for (const [label, viewport] of LOGO_VIEWPORTS) {
    test(`S4.c — bloque de título tipo logotipo: MAYÚSCULAS, hgroup a 12–48 px del borde superior del hero, h1 de 16–26 px, cada línea en un renglón con ≥ 16 px de margen lateral y antetítulo centrado a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await page.evaluate((kickerSelector) => {
        const hero = document.querySelector('.hero').getBoundingClientRect();
        const block = document.querySelector('hgroup.titulo');
        const kicker = document.querySelector(kickerSelector);
        const h1 = document.querySelector('h1');
        if (!block || !kicker) return null;
        const clientWidth = document.documentElement.clientWidth;
        const line = (el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const fontSize = parseFloat(cs.fontSize);
          const lineHeight = cs.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(cs.lineHeight);
          return {
            left: r.left,
            right: clientWidth - r.right,
            centerX: r.left + r.width / 2,
            height: r.height,
            fontSize,
            lineHeight,
            textTransform: cs.textTransform,
          };
        };
        return {
          blockTop: block.getBoundingClientRect().top - hero.top,
          viewportCenterX: clientWidth / 2,
          h1: line(h1),
          kicker: line(kicker),
        };
      }, KICKER_SELECTOR);
      expect(m, 'falta hgroup.titulo con p.titulo__antetitulo (L24)').not.toBeNull();
      const { blockTop, viewportCenterX, h1, kicker } = /** @type {NonNullable<typeof m>} */ (m);
      expect(blockTop, `borde superior del hgroup: ${blockTop}px`).toBeGreaterThanOrEqual(12);
      expect(blockTop, `borde superior del hgroup: ${blockTop}px`).toBeLessThanOrEqual(48);
      expect(h1.fontSize, `font-size del h1: ${h1.fontSize}px`).toBeGreaterThanOrEqual(16);
      expect(h1.fontSize, `font-size del h1: ${h1.fontSize}px`).toBeLessThanOrEqual(26);
      for (const [name, l] of /** @type {const} */ ([['h1', h1], ['antetítulo', kicker]])) {
        expect(l.textTransform, `text-transform del ${name}`).toBe('uppercase');
        expect(l.height, `${name}: alto ${l.height}px vs line-height ${l.lineHeight}px: más de una línea`).toBeLessThan(1.6 * l.lineHeight);
        expect(l.left, `margen izquierdo del ${name}: ${l.left}px`).toBeGreaterThanOrEqual(16);
        expect(l.right, `margen derecho del ${name}: ${l.right}px`).toBeGreaterThanOrEqual(16);
      }
      expect(
        Math.abs(kicker.centerX - viewportCenterX),
        `centro del antetítulo ${kicker.centerX} vs centro del viewport ${viewportCenterX}`,
      ).toBeLessThanOrEqual(2);
    });
  }

  test('S4.d — <title> del documento con el nombre de la logia y <html lang="es">', async ({ page }) => {
    await expect(page).toHaveTitle(DOCUMENT_TITLE);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  for (const [label, viewport] of PHI_VIEWPORTS) {
    test(`S4.e — proporción áurea: tamaño ×φ, separación ÷φ y tracking ×φ; antetítulo "${KICKER}" sobre el h1 en hgroup.titulo a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await page.evaluate(() => {
        const block = document.querySelector('hgroup.titulo');
        const kicker = block && block.querySelector(':scope > p.titulo__antetitulo');
        const h1 = block && block.querySelector(':scope > h1');
        if (!kicker || !h1) return null;
        const k = kicker.getBoundingClientRect();
        const n = h1.getBoundingClientRect();
        return {
          kickerText: kicker.textContent,
          kickerFirst: !!(kicker.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING),
          kickerBottom: k.bottom,
          h1Top: n.top,
          kickerFontSize: parseFloat(getComputedStyle(kicker).fontSize),
          h1FontSize: parseFloat(getComputedStyle(h1).fontSize),
          kickerTracking: getComputedStyle(kicker).letterSpacing,
          h1Tracking: getComputedStyle(h1).letterSpacing,
        };
      });
      expect(m, 'falta hgroup.titulo > p.titulo__antetitulo + h1 (L24)').not.toBeNull();
      const r = /** @type {NonNullable<typeof m>} */ (m);
      expect.soft(r.kickerText, 'texto del antetítulo').toBe(KICKER);
      expect.soft(r.kickerFirst, 'el antetítulo debe preceder al h1').toBe(true);
      expect.soft(r.kickerBottom, 'el antetítulo debe quedar arriba del h1').toBeLessThanOrEqual(r.h1Top);

      const sizeRatio = r.h1FontSize / r.kickerFontSize;
      expect.soft(
        Math.abs(sizeRatio - PHI) / PHI,
        `tamaño: h1 ${r.h1FontSize}px / antetítulo ${r.kickerFontSize}px = ${sizeRatio.toFixed(4)} (φ = ${PHI.toFixed(4)}, ±0,5 %)`,
      ).toBeLessThanOrEqual(0.005);

      const gap = r.h1Top - r.kickerBottom;
      const wanted = r.kickerFontSize / PHI;
      expect.soft(
        Math.abs(gap - wanted),
        `separación: ${gap.toFixed(2)}px entre las cajas vs antetítulo/φ = ${wanted.toFixed(2)}px (±1 px)`,
      ).toBeLessThanOrEqual(1);

      const kickerPx = parseFloat(r.kickerTracking); // "normal" -> NaN
      const h1Px = parseFloat(r.h1Tracking);
      expect(Number.isFinite(kickerPx) && Number.isFinite(h1Px) && h1Px > 0, `letter-spacing computado: antetítulo ${r.kickerTracking}, h1 ${r.h1Tracking}`).toBe(true);
      const trackingRatio = kickerPx / h1Px;
      expect.soft(
        Math.abs(trackingRatio - PHI) / PHI,
        `tracking: antetítulo ${r.kickerTracking} / h1 ${r.h1Tracking} = ${trackingRatio.toFixed(4)} (φ = ${PHI.toFixed(4)}, ±1 %)`,
      ).toBeLessThanOrEqual(0.01);
    });
  }
});

test.describe('S5 — Paleta de la foto adjunta', () => {
  test('S5.a — los 12 tokens existen en :root con valores exactos', async ({ page }) => {
    const values = await page.evaluate((names) => {
      const cs = getComputedStyle(document.documentElement);
      return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]));
    }, Object.keys(TOKENS));
    for (const [name, hex] of Object.entries(TOKENS)) {
      expect(values[name].toLowerCase(), name).toBe(hex.toLowerCase());
    }
  });

  test('S5.b — colores computados de body, h1 y footer pertenecen a los tokens', async ({ page }) => {
    const computed = await page.evaluate(() => {
      const cs = (sel) => getComputedStyle(document.querySelector(sel));
      return {
        'body background': cs('body').backgroundColor,
        'h1 color': cs('h1').color,
        'footer background': cs('footer').backgroundColor,
        'footer p color': cs('footer p').color,
      };
    });
    for (const [what, css] of Object.entries(computed)) {
      const key = rgbKey(css);
      expect(key, `${what}: no se pudo parsear "${css}"`).not.toBeNull();
      expect(TOKEN_KEYS.has(/** @type {string} */ (key)), `${what}: ${css} no es un token`).toBe(true);
    }
  });
});

test.describe('S6 — Tipografía', () => {
  test('S6.a — font-family computado de body, h1 y footer p empieza por "Times New Roman"', async ({ page }) => {
    const families = await page.evaluate(() =>
      ['body', 'h1', 'footer p'].map((sel) => [sel, getComputedStyle(document.querySelector(sel)).fontFamily]),
    );
    for (const [sel, family] of families) {
      expect(family.startsWith('"Times New Roman"'), `${sel}: ${family}`).toBe(true);
    }
  });

  test('S6.b — ninguna petición de red fuera del propio origen', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const urls = [];
    page.on('request', (req) => urls.push(req.url()));
    await page.goto(baseURL + '/', { waitUntil: 'networkidle' });
    await expectLandingServed(page);
    await context.close();
    const origin = new URL(/** @type {string} */ (baseURL)).origin;
    expect(urls.length).toBeGreaterThan(0);
    const foreign = urls.filter((u) => !u.startsWith(origin));
    expect(foreign).toEqual([]);
  });
});

test.describe('S7 — Pie con el formato de Tamburins, en la paleta, solo Lorem ipsum', () => {
  test('S7.a — los hijos de body son solo main y footer; main contiene únicamente la sección .hero', async ({ page }) => {
    const tags = await page.evaluate(() => [...document.body.children].map((el) => el.tagName.toLowerCase()));
    expect(tags).toEqual(['main', 'footer']);
    const main = page.locator('main');
    await expect(main.locator('> *')).toHaveCount(1);
    await expect(main.locator('> section.hero')).toHaveCount(1);
    // El footer queda debajo del hero.
    const footerBelowHero = await page.evaluate(
      () => document.querySelector('footer').getBoundingClientRect().top >= document.querySelector('.hero').getBoundingClientRect().bottom - 1,
    );
    expect(footerBelowHero).toBe(true);
  });

  test('S7.b — footer con 4 bloques .pie__bloque en orden: ul.pie__secciones (3 li), p, p.pie__auspicio, p.pie__copy que empieza por ©', async ({ page }) => {
    const blocks = await page.evaluate(() =>
      [...document.querySelector('footer').children].map((el) => ({
        tag: el.tagName.toLowerCase(),
        classes: [...el.classList],
        items: el.tagName === 'UL' ? [...el.children].map((c) => c.tagName.toLowerCase()) : [],
        text: (el.textContent || '').trim(),
      })),
    );
    expect(blocks.map((b) => b.tag)).toEqual(['ul', 'p', 'p', 'p']);
    for (const b of blocks) expect(b.classes, `${b.tag} sin .pie__bloque`).toContain('pie__bloque');
    expect(blocks[0].classes).toContain('pie__secciones');
    expect(blocks[0].items).toEqual(['li', 'li', 'li']);
    expect(blocks[2].classes, 'el bloque 3 debe ser p.pie__auspicio (L24)').toContain('pie__auspicio');
    expect(blocks[3].classes).toContain('pie__copy');
    expect(blocks[3].text.startsWith('©')).toBe(true);
  });

  test('S7.c — Lorem ipsum salvo el auspicio: primer p empieza por "Lorem ipsum"; bloques 1, 2 y 4 sin ©, solo letras, espacios, comas y puntos (≤ 120 palabras)', async ({ page }) => {
    const firstParagraph = ((await page.locator('footer p').first().textContent()) || '').trim();
    expect(firstParagraph.startsWith('Lorem ipsum'), `primer p: ${firstParagraph.slice(0, 30)}`).toBe(true);
    // Los bloques 1, 2 y 4 son los que no son el auspicio (que lleva texto real y un logo, S7.g).
    const lorem = page.locator('footer > .pie__bloque:not(.pie__auspicio)');
    await expect(lorem, 'bloques 1, 2 y 4 (todos menos p.pie__auspicio)').toHaveCount(3);
    const text = (await lorem.evaluateAll((els) => els.map((el) => /** @type {HTMLElement} */ (el).innerText).join('\n')))
      .replace('©', '')
      .trim();
    expect(text, 'el texto de los bloques 1, 2 y 4 tiene caracteres que no son letras, espacios, comas ni puntos').toMatch(/^[A-Za-zÀ-ÿ\s,.]+$/);
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(120);
  });

  test('S7.d — footer sin button, form, svg ni h1–h6; su único img es el isologotipo (S7.g) y su único a es el enlace (S7.h)', async ({ page }) => {
    await expect(page.locator('footer button, footer form, footer svg, footer h1, footer h2, footer h3, footer h4, footer h5, footer h6')).toHaveCount(0);
    const imgs = page.locator('footer img');
    await expect(imgs, 'el footer debe tener exactamente un img (el isologotipo)').toHaveCount(1);
    expect(await imgs.getAttribute('src'), 'src del único img').toMatch(/assets\/img\/gran-logia-argentina\.png$/);
    const links = page.locator('footer a');
    await expect(links, 'el footer debe tener exactamente un a (el enlace del isologotipo)').toHaveCount(1);
    expect(await links.getAttribute('href'), 'href del único a').toBe(LOGO_LINK_HREF);
    await expect(links.locator('img'), 'el único a envuelve al isologotipo').toHaveCount(1);
  });

  /**
   * Isologotipo de la Gran Logia: lo carga (es `loading="lazy"` y está bajo el pliegue) y lo mide en la página.
   * @param {import('@playwright/test').Page} page
   */
  async function measureAuspicioLogo(page) {
    const img = page.locator('footer .pie__auspicio img');
    await expect(img, 'p.pie__auspicio debe contener exactamente un img').toHaveCount(1);
    await img.scrollIntoViewIfNeeded();
    return img.evaluate(async (node) => {
      const el = /** @type {HTMLImageElement} */ (node);
      try {
        await el.decode();
      } catch (e) {
        /* se informa vía naturalWidth */
      }
      let cornerAlpha = -1;
      if (el.naturalWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = el.naturalWidth;
        canvas.height = el.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(el, 0, 0);
        cornerAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
      }
      const p = /** @type {HTMLElement} */ (el.closest('p.pie__auspicio'));
      const textNode = [...p.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim());
      const range = document.createRange();
      range.selectNodeContents(/** @type {Node} */ (textNode));
      const pStyle = getComputedStyle(p);
      const r = el.getBoundingClientRect();
      return {
        paragraphText: (p.textContent || '').trim(),
        src: el.src,
        alt: el.alt,
        naturalWidth: el.naturalWidth,
        cornerAlpha,
        imgTop: r.top,
        imgLeft: r.left,
        imgRight: r.right,
        width: r.width,
        textBottom: range.getBoundingClientRect().bottom,
        availableWidth: p.clientWidth - parseFloat(pStyle.paddingLeft) - parseFloat(pStyle.paddingRight),
        clientWidth: document.documentElement.clientWidth,
      };
    });
  }

  test(`S7.g — auspicio: texto exacto, único img cargado con alt exacto, esquina transparente, debajo del texto y ancho ${LOGO_MIN_WIDTH}–${LOGO_MAX_WIDTH} px a 1440×900`, async ({ page }) => {
    const m = await measureAuspicioLogo(page);
    expect(m.paragraphText, 'texto de p.pie__auspicio').toBe(AUSPICIO_TEXT);
    expect(m.src.endsWith(LOGO_SRC_END), `src: ${m.src}`).toBe(true);
    expect(m.alt, 'alt del isologotipo').toBe(LOGO_ALT);
    expect(m.naturalWidth, 'el isologotipo no cargó').toBeGreaterThan(0);
    expect(m.cornerAlpha, `alfa del píxel (0,0) = ${m.cornerAlpha}`).toBe(0);
    expect(m.imgTop, `img top ${m.imgTop.toFixed(1)} vs fondo del texto ${m.textBottom.toFixed(1)}: el logo va debajo del texto`).toBeGreaterThanOrEqual(m.textBottom);
    expect(m.width, `ancho del logo: ${m.width.toFixed(1)}px`).toBeGreaterThanOrEqual(LOGO_MIN_WIDTH);
    expect(m.width, `ancho del logo: ${m.width.toFixed(1)}px`).toBeLessThanOrEqual(LOGO_MAX_WIDTH);
  });

  test('S7.g — el isologotipo cabe en el ancho disponible del bloque a 360×740', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const m = await measureAuspicioLogo(page);
    expect(m.naturalWidth, 'el isologotipo no cargó').toBeGreaterThan(0);
    expect(m.width, `ancho del logo ${m.width.toFixed(1)}px vs ancho disponible ${m.availableWidth.toFixed(1)}px`).toBeLessThanOrEqual(m.availableWidth + 0.5);
    expect(m.imgRight, `borde derecho del logo ${m.imgRight.toFixed(1)}px vs viewport ${m.clientWidth}px`).toBeLessThanOrEqual(m.clientWidth);
  });

  test('S7.h — el isologotipo está dentro de un único enlace a la Gran Logia (nueva pestaña, noopener, nombre accesible) con foco de teclado visible en --rosa-100', async ({ page }) => {
    const links = page.locator('footer a');
    await expect(links, 'el footer debe tener exactamente un a').toHaveCount(1);
    await expect(links.locator('img.pie__logo'), 'el a debe envolver al isologotipo').toHaveCount(1);
    await expect(links).toHaveAttribute('href', LOGO_LINK_HREF);
    await expect(links).toHaveAttribute('target', '_blank');
    const rel = ((await links.getAttribute('rel')) || '').split(/\s+/);
    expect(rel, `rel: ${rel.join(' ')}`).toContain('noopener');
    await expect(page.getByRole('link', { name: LOGO_LINK_NAME, exact: true }), 'enlace con ese nombre accesible').toHaveCount(1);

    // Foco de teclado: Tab hasta llegar al enlace (es el único elemento enfocable de la página).
    let focused = false;
    for (let i = 0; i < 5 && !focused; i++) {
      await page.keyboard.press('Tab');
      focused = await links.evaluate((el) => el === document.activeElement);
    }
    expect(focused, 'el enlace no recibió el foco con Tab').toBe(true);
    const outline = await links.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { visible: el.matches(':focus-visible'), style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
    });
    expect(outline.visible, 'el enlace debe coincidir con :focus-visible').toBe(true);
    expect(outline.style, `outline-style: ${outline.style}`).not.toBe('none');
    expect(parseFloat(outline.width), `outline-width: ${outline.width}`).toBeGreaterThan(0);
    expect(outline.color, 'outline-color').toBe('rgb(255, 187, 186)');
  });

  test('S7.e — formato: alineado a la izquierda, filete de 1 px en los bloques 2–4 (no en el 1), colores de la paleta', async ({ page }) => {
    const info = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return {
        footerBackground: getComputedStyle(footer).backgroundColor,
        blocks: [...footer.children].map((el) => {
          const cs = getComputedStyle(el);
          return {
            textAlign: cs.textAlign,
            borderTopWidth: cs.borderTopWidth,
            borderTopStyle: cs.borderTopStyle,
            borderTopColor: cs.borderTopColor,
            color: cs.color,
          };
        }),
      };
    });
    const isToken = (css) => {
      const key = rgbKey(css);
      return key !== null && TOKEN_KEYS.has(key);
    };
    expect(isToken(info.footerBackground), `fondo del footer ${info.footerBackground} no es un token`).toBe(true);
    expect(info.blocks).toHaveLength(4);
    info.blocks.forEach((b, i) => {
      const n = i + 1;
      expect(['left', 'start'], `bloque ${n}: text-align ${b.textAlign}`).toContain(b.textAlign);
      expect(isToken(b.color), `bloque ${n}: color ${b.color} no es un token`).toBe(true);
      if (n === 1) {
        expect(b.borderTopWidth, 'bloque 1 no lleva filete').toBe('0px');
      } else {
        expect(b.borderTopWidth, `bloque ${n}: border-top-width`).toBe('1px');
        expect(b.borderTopStyle, `bloque ${n}: border-top-style`).toBe('solid');
        expect(isToken(b.borderTopColor), `bloque ${n}: filete ${b.borderTopColor} no es un token`).toBe(true);
      }
    });
  });

  test('S7.f — fondo del pie rojo (--rojo-700), filetes --carmesi-300 y contraste ≥ 4.5:1', async ({ page }) => {
    const info = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return {
        footerBackground: getComputedStyle(footer).backgroundColor,
        blocks: [...footer.querySelectorAll('.pie__bloque')].map((el) => {
          const cs = getComputedStyle(el);
          return { color: cs.color, borderTopColor: cs.borderTopColor };
        }),
      };
    });
    expect(info.footerBackground, 'fondo del footer').toBe('rgb(166, 0, 0)');
    expect(info.blocks).toHaveLength(4);
    info.blocks.slice(1).forEach((b, i) => {
      expect(b.borderTopColor, `bloque ${i + 2}: filete`).toBe('rgb(202, 48, 46)');
    });
    const toRgb = (css) => rgbKey(css).split(',').map(Number);
    const background = toRgb(info.footerBackground);
    info.blocks.forEach((b, i) => {
      const ratio = contrastRatio(toRgb(b.color), background);
      expect(ratio, `bloque ${i + 1}: contraste ${b.color} sobre ${info.footerBackground} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });
  });
});

test.describe('S8 — Calidad base', () => {
  test('S8.a — meta viewport presente', async ({ page }) => {
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).toBe('width=device-width, initial-scale=1');
  });

  test('S8.b — sin JavaScript (ningún script)', async ({ page }) => {
    await expect(page.locator('script')).toHaveCount(0);
  });

  test('S8.c — sin errores de consola al cargar', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    await page.goto(baseURL + '/', { waitUntil: 'networkidle' });
    await expectLandingServed(page);
    await context.close();
    expect(errors).toEqual([]);
  });

  for (const [label, viewport] of VIEWPORTS) {
    test(`S8.d — contraste ≥ 4.5:1 del h1 y del antetítulo a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Cajas medidas con el texto visible (visibility no altera el layout).
      const boxes = await page.evaluate((kickerSelector) => {
        const kicker = document.querySelector(kickerSelector);
        if (!kicker) return null;
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        };
        return { h1: box(document.querySelector('h1')), antetítulo: box(kicker) };
      }, KICKER_SELECTOR);
      expect(boxes, 'falta hgroup.titulo con p.titulo__antetitulo (L24)').not.toBeNull();
      // Fondo sin texto: se ocultan el h1 y el antetítulo.
      await page.addStyleTag({ content: 'h1, .titulo__antetitulo { visibility: hidden !important; }' });
      const textColor = [0xff, 0xbb, 0xba]; // --rosa-100
      for (const [name, b] of Object.entries(/** @type {NonNullable<typeof boxes>} */ (boxes))) {
        const x = Math.floor(b.left);
        const y = Math.floor(b.top);
        const clip = { x, y, width: Math.ceil(b.right) - x, height: Math.ceil(b.bottom) - y };
        const avg = await averageColor(page, await page.screenshot({ clip }));
        const ratio = contrastRatio(textColor, avg);
        expect.soft(
          ratio,
          `${name}: contraste ${ratio.toFixed(2)}:1 de #ffbbba sobre fondo promedio rgb(${avg.map(Math.round).join(', ')})`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('S9 — Refinamiento visual (revisión de estilo, L21)', () => {
  for (const [label, viewport] of MEASURE_VIEWPORTS) {
    test(`S9.a — ningún renglón de los párrafos del pie supera ${MAX_CHARS_PER_LINE} caracteres a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Renglones renderizados: se mide cada carácter con un Range sobre el nodo de texto y se agrupa por `top`.
      const paragraphs = await page.evaluate(() =>
        [...document.querySelectorAll('footer p')].map((p) => {
          const node = p.firstChild;
          const text = node.textContent;
          const range = document.createRange();
          /** @type {{ top: number, chars: string[] }[]} */
          const lines = [];
          for (let i = 0; i < text.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = range.getClientRects()[0];
            if (!rect) continue; // espacio colapsado en un salto de renglón
            let line = lines.find((l) => Math.abs(l.top - rect.top) < 2);
            if (!line) {
              line = { top: rect.top, chars: [] };
              lines.push(line);
            }
            line.chars.push(text[i]);
          }
          return { text: text.replace(/\s+/g, ' ').trim(), lines: lines.map((l) => l.chars.join('').trim()) };
        }),
      );
      expect(paragraphs.length, 'párrafos en el pie').toBe(3);
      let max = 0;
      for (const para of paragraphs) {
        // Guarda: los renglones medidos reconstruyen el párrafo entero (el método mide algo real).
        expect(para.lines.join(' '), 'los renglones medidos no reconstruyen el párrafo').toBe(para.text);
        for (const line of para.lines) max = Math.max(max, line.length);
      }
      const detail = paragraphs.map((q) => q.lines.map((l) => l.length).join('/')).join(' | ');
      expect(max, `máximo ${max} caracteres por renglón (${detail}) a ${label}`).toBeLessThanOrEqual(MAX_CHARS_PER_LINE);
    });
  }

  test(`S9.a — a 390×844 los bloques del pie empiezan a ≥ ${PIE_MIN_GUTTER} px del borde izquierdo y comparten el mismo borde de texto (±1 px)`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const edges = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('footer .pie__bloque').forEach((block, i) => {
        const leaves = block.tagName === 'UL' ? [...block.children] : [block];
        for (const leaf of leaves) {
          const walker = document.createTreeWalker(leaf, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
          });
          const node = walker.nextNode();
          const range = document.createRange();
          range.selectNodeContents(node);
          out.push({ block: i + 1, text: node.textContent.trim().slice(0, 18), left: range.getClientRects()[0].left });
        }
      });
      return out;
    });
    expect(edges, 'textos medidos: 3 li + 3 p').toHaveLength(6);
    const lefts = edges.map((e) => e.left);
    const detail = edges.map((e) => `[${e.block}] "${e.text}" ${e.left.toFixed(2)}`).join('; ');
    expect(Math.min(...lefts), `borde izquierdo mínimo: ${detail}`).toBeGreaterThanOrEqual(PIE_MIN_GUTTER);
    expect(Math.max(...lefts) - Math.min(...lefts), `bordes izquierdos no alineados (±1 px): ${detail}`).toBeLessThanOrEqual(1);
  });

  test('S9.b — ::selection usa --rosa-100 de fondo y --rojo-700 de texto', async ({ page }) => {
    const selections = await page.evaluate(() =>
      ['body', 'h1', 'footer p'].map((sel) => {
        const cs = getComputedStyle(document.querySelector(sel), '::selection');
        return { sel, background: cs.backgroundColor, color: cs.color };
      }),
    );
    for (const s of selections) {
      expect(rgbKey(s.background), `${s.sel}::selection background: ${s.background}`).toBe(hexToRgbKey(TOKENS['--rosa-100']));
      expect(rgbKey(s.color), `${s.sel}::selection color: ${s.color}`).toBe(hexToRgbKey(TOKENS['--rojo-700']));
    }
  });

  test('S9.c — meta theme-color #1b0303 y meta color-scheme dark presentes', async ({ page }) => {
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1b0303');
    await expect(page.locator('meta[name="color-scheme"]')).toHaveCount(1);
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  });

  test('S9.d — link rel="icon" apunta a assets/favicon.svg, que responde 200 image/svg+xml', async ({ page, request }) => {
    const link = page.locator('link[rel="icon"]');
    await expect(link, 'falta <link rel="icon">').toHaveCount(1);
    const href = await link.getAttribute('href');
    expect(href, 'href del icono').toBe('assets/favicon.svg');
    const resolved = await link.evaluate((el) => /** @type {HTMLLinkElement} */ (el).href);
    expect(new URL(resolved).pathname, 'ruta resuelta del icono').toBe('/assets/favicon.svg');
    const res = await request.get('/assets/favicon.svg');
    expect(res.status(), 'GET /assets/favicon.svg').toBe(200);
    expect(res.headers()['content-type']).toContain('image/svg+xml');
    expect(await res.text(), 'el favicon no es un SVG').toContain('<svg');
  });

  test('S9.d — ninguna petición al cargar la página (contexto limpio) termina en 404', async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const responses = [];
    page.on('response', (res) => responses.push({ url: res.url(), status: res.status() }));
    await page.goto(baseURL + '/', { waitUntil: 'networkidle' });
    await expectLandingServed(page);
    await context.close();
    expect(responses.length, 'respuestas registradas').toBeGreaterThan(0);
    expect(responses.filter((r) => r.status === 404), 'peticiones con 404').toEqual([]);
  });

  for (const [label, viewport] of VIEWPORTS) {
    test(`S9.e — h1: letter-spacing ≥ 0,12 em y padding-left igual al letter-spacing (±0,5 px) a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await page.locator('h1').evaluate((el) => {
        const cs = getComputedStyle(el);
        return { fontSize: parseFloat(cs.fontSize), letterSpacing: cs.letterSpacing, paddingLeft: cs.paddingLeft };
      });
      const spacingPx = parseFloat(m.letterSpacing); // "normal" -> NaN
      const paddingPx = parseFloat(m.paddingLeft);
      expect(Number.isFinite(spacingPx), `letter-spacing computado: ${m.letterSpacing}`).toBe(true);
      const em = spacingPx / m.fontSize;
      expect(em, `letter-spacing ${m.letterSpacing} / font-size ${m.fontSize}px = ${em.toFixed(3)} em`).toBeGreaterThanOrEqual(0.12);
      expect(
        Math.abs(paddingPx - spacingPx),
        `padding-left ${m.paddingLeft} vs letter-spacing ${m.letterSpacing}`,
      ).toBeLessThanOrEqual(0.5);
    });
  }

  for (const [label, viewport] of VIEWPORTS) {
    test(`S9.f — sombra + corte: velo multiply y base del hero oscura a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await page.evaluate(async () => {
        const img = /** @type {HTMLImageElement} */ (document.querySelector('img.hero__retrato'));
        try {
          await img.decode();
        } catch (e) {
          /* se informa vía naturalWidth */
        }
        const hero = document.querySelector('.hero').getBoundingClientRect();
        return {
          blend: getComputedStyle(document.querySelector('.hero'), '::after').mixBlendMode,
          naturalWidth: img.naturalWidth,
          heroBottom: hero.bottom,
          clientWidth: document.documentElement.clientWidth,
        };
      });
      expect(m.naturalWidth, 'la imagen no cargó').toBeGreaterThan(0);
      expect.soft(m.blend, 'mix-blend-mode de .hero::after').toBe('multiply');
      // Últimos 22 px del hero (el h1 está arriba y no entra en la franja).
      const clip = { x: 0, y: m.heroBottom - BASE_STRIP, width: m.clientWidth, height: BASE_STRIP };
      const avg = await averageColor(page, await page.screenshot({ clip }));
      const luminance = relativeLuminance(avg);
      expect(
        luminance,
        `luminancia ${luminance.toFixed(4)} de la base del hero (promedio rgb(${avg.map(Math.round).join(', ')}))`,
      ).toBeLessThanOrEqual(BASE_MAX_LUMINANCE);
    });
  }
});
