// @ts-check
// Suite de aceptación de odd/tasks/landing-pueyrredon.md (S1–S10).
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
  '--blanco': '#f0ebe3',
  '--rojo-950': '#1b0303',
  '--rojo-800': '#8a0b12',
  '--rojo-600': '#b0262c',
};
const FOOTER_MIN_CONTRAST = 7; // S7.f (L29): texto del pie ≥ 7:1 (AAA)

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
const LOGO_WIDTH = 260; // S7 punto 3 (L27): ≈ medida de los párrafos ÷ φ; S7.g exacto a ±1 px
const AUSPICIO_MIN_TRACKING = 0.15; // S7.g (L27): leyenda en mayúsculas espaciadas, letter-spacing ≥ 0,15 em
const CAP_LINE_HEIGHT = 0.66; // S4.e/S4.f (L27): cada renglón del título mide su altura de mayúsculas, ±0,02 em
const CAP_LINE_HEIGHT_TOLERANCE = 0.02;
const GOLDEN_TOLERANCE = 0.02; // S4.f: 1 : φ a ±2 %

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
/**
 * Geometría de object-fit: cover + object-position (en %) aplicada a la caja de la cabeza (S2.d, S4.f) y caja del
 * hgroup.titulo, ambas en px relativos al borde superior del hero.
 * @param {import('@playwright/test').Page} page
 */
async function measureHeadAndTitle(page) {
  return page.evaluate(async ({ headBox }) => {
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
}

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
 * Scrollea la página a `y` px y espera dos cuadros para que el layout (sticky) se asiente.
 * @param {import('@playwright/test').Page} page
 * @param {number} y
 */
async function scrollPageTo(page, y) {
  await page.evaluate(
    (top) =>
      new Promise((resolve) => {
        window.scrollTo(0, top);
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
    y,
  );
}

/**
 * Contraste (método de S8.d) de --blanco contra el color promedio del fondo detrás del h1 y del antetítulo, en sus
 * posiciones actuales del viewport: con el texto oculto (visibility no altera el layout) captura la caja de cada uno.
 * `ratio` es null si la caja no cabe en el viewport (no se puede capturar). Devuelve null si falta el bloque (L24).
 * @param {import('@playwright/test').Page} page
 */
async function measureTitleContrast(page) {
  const boxes = await page.evaluate((kickerSelector) => {
    const kicker = document.querySelector(kickerSelector);
    if (!kicker) return null;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    return {
      viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
      named: { h1: box(document.querySelector('h1')), antetítulo: box(kicker) },
    };
  }, KICKER_SELECTOR);
  if (!boxes) return null;
  // El retrato usa decoding="async": se espera su decodificación y un cuadro, o la primera captura podría salir sin imagen.
  await page.evaluate(async () => {
    try {
      await /** @type {HTMLImageElement} */ (document.querySelector('img.hero__retrato')).decode();
    } catch (e) {
      /* si no cargó, el contraste lo delata */
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  // Fondo sin texto: se ocultan el h1 y el antetítulo (la sombra suave del bloque, si existe, queda a la vista).
  await page.addStyleTag({ content: 'h1, .titulo__antetitulo { visibility: hidden !important; }' });
  const textColor = [0xf0, 0xeb, 0xe3]; // --blanco
  const results = [];
  for (const [name, b] of Object.entries(boxes.named)) {
    const x = Math.floor(b.left);
    const y = Math.floor(b.top);
    const width = Math.ceil(b.right) - x;
    const height = Math.ceil(b.bottom) - y;
    const inside = x >= 0 && y >= 0 && x + width <= boxes.viewport.width && y + height <= boxes.viewport.height;
    if (!inside) {
      results.push({ name, box: b, avg: null, ratio: null });
      continue;
    }
    const avg = await averageColor(page, await page.screenshot({ clip: { x, y, width, height } }));
    results.push({ name, box: b, avg, ratio: contrastRatio(textColor, avg) });
  }
  return results;
}

/**
 * Guarda de "la landing se sirve": evita que los criterios negativos (sin menú,
 * sin script, sin errores…) pasen en vacío contra un listado de directorio o un 404.
 * @param {import('@playwright/test').Page} page
 */
async function expectLandingServed(page) {
  await expect(page.locator('main > section.hero'), 'la landing no está servida').toHaveCount(1);
}

/**
 * S4.h (L38): la tinta real del título (con descendentes, p. ej. la J de JUAN en Noto Serif o Times) nunca queda por debajo
 * del borde inferior del hero, que la recorta (overflow: clip). Mide la línea base con un inline-block de alto 0 y el
 * descendente con canvas.measureText sobre la fuente computada; recorre el tramo en que el título se va con el hero.
 * @param {import('@playwright/test').Page} page @param {{width:number,height:number}} viewport
 */
async function expectTitleInkInsideHero(page, viewport) {
  await page.addStyleTag({ content: '.pie { min-height: 200vh; }' });
  const heroHeight = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().height);
  for (const heroBottomAt of [0.4, 0.2, 0.12, 0.08, 0.05, 0.02]) {
    await page.evaluate((y) => window.scrollTo(0, y), heroHeight - heroBottomAt * viewport.height);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(() => {
      const heroBottom = document.querySelector('.hero').getBoundingClientRect().bottom;
      const lines = [...document.querySelectorAll('hgroup.titulo > *')].map((el) => {
        const cs = getComputedStyle(el);
        const probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        el.appendChild(probe);
        const baseline = probe.getBoundingClientRect().bottom;
        probe.remove();
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const descent = ctx.measureText((el.textContent || '').toUpperCase()).actualBoundingBoxDescent;
        return { tag: el.tagName.toLowerCase(), inkBottom: baseline + descent };
      });
      return { heroBottom, lines };
    });
    for (const l of m.lines) {
      expect.soft(
        l.inkBottom,
        `hero abajo al ${heroBottomAt * 100} %: tinta del ${l.tag} hasta ${l.inkBottom.toFixed(2)}px vs borde del hero ${m.heroBottom.toFixed(2)}px`,
      ).toBeLessThanOrEqual(m.heroBottom + 0.5);
    }
  }
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
      const m = await measureHeadAndTitle(page);
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

  for (const [label, viewport] of HERO_VIEWPORTS) {
    test(`S4.f — colocación áurea: margen superior del hgroup : aire hasta la cabeza = 1 : φ (±${GOLDEN_TOLERANCE * 100} %) a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await measureHeadAndTitle(page);
      // Guardas: la proyección solo significa algo con el panorama y con object-fit: cover (igual que S2.d).
      expect(m.src.endsWith('assets/img/pueyrredon-panorama.jpg'), `src: ${m.src}`).toBe(true);
      expect(m.objectFit, 'object-fit del img').toBe('cover');
      expect(m.naturalWidth, 'la imagen no cargó').toBeGreaterThan(0);
      expect(Number.isFinite(m.scale), `object-position "${m.position}" no está en %`).toBe(true);
      expect(m.titulo, 'falta hgroup.titulo (L24)').not.toBeNull();
      const { head, titulo } = /** @type {{ head: any, titulo: any }} */ (m);
      const above = titulo.top; // margen superior del hgroup (el hero empieza en y = 0)
      const air = head.top - titulo.bottom; // aire entre el hgroup y la cabeza
      expect(above, `margen superior del hgroup: ${above.toFixed(2)}px`).toBeGreaterThan(0);
      const ratio = air / above;
      test.info().annotations.push({ type: 'razón aire / margen', description: `${label}: ${ratio.toFixed(4)} (φ = ${PHI.toFixed(4)})` });
      expect(
        Math.abs(ratio - PHI) / PHI,
        `aire ${air.toFixed(2)}px (cabeza y ${head.top.toFixed(2)} − hgroup abajo ${titulo.bottom.toFixed(2)}) / margen ${above.toFixed(2)}px = ${ratio.toFixed(4)} (φ = ${PHI.toFixed(4)}, ±${GOLDEN_TOLERANCE * 100} %)`,
      ).toBeLessThanOrEqual(GOLDEN_TOLERANCE);
    });
  }

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
          kickerLineHeight: getComputedStyle(kicker).lineHeight,
          h1LineHeight: getComputedStyle(h1).lineHeight,
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

      // L27: cada renglón mide su altura de mayúsculas, así la separación áurea es la que se ve entre la tinta.
      for (const [name, lineHeight, fontSize] of /** @type {const} */ ([
        ['antetítulo', r.kickerLineHeight, r.kickerFontSize],
        ['h1', r.h1LineHeight, r.h1FontSize],
      ])) {
        const em = parseFloat(lineHeight) / fontSize; // "normal" -> NaN
        expect.soft(
          Math.abs(em - CAP_LINE_HEIGHT),
          `line-height del ${name}: ${lineHeight} / ${fontSize}px = ${em.toFixed(3)} em (altura de mayúsculas ${CAP_LINE_HEIGHT} em, ±${CAP_LINE_HEIGHT_TOLERANCE})`,
        ).toBeLessThanOrEqual(CAP_LINE_HEIGHT_TOLERANCE);
      }

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

  // S4.g (L34): el título acompaña la imagen mientras se scrollea (sticky dentro del hero) y se va con su borde inferior.
  const SCROLL_LEVELS = [0.25, 0.5, 0.75]; // fracción del alto del hero
  const TITLE_TOP_TOLERANCE = 1; // px
  const titleTop = (/** @type {import('@playwright/test').Page} */ page) =>
    page.locator('hgroup.titulo').evaluate((el) => el.getBoundingClientRect().top);

  for (const [label, viewport] of VIEWPORTS) {
    test(`S4.g — el hgroup.titulo conserva su top (±${TITLE_TOP_TOLERANCE} px) con el hero scrolleado 25, 50 y 75 % a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const heroHeight = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().height);
      const top0 = await titleTop(page);
      for (const level of SCROLL_LEVELS) {
        await scrollPageTo(page, heroHeight * level);
        const top = await titleTop(page);
        expect.soft(
          Math.abs(top - top0),
          `con el hero scrolleado ${level * 100} %: top ${top.toFixed(2)}px vs ${top0.toFixed(2)}px en scroll 0 (±${TITLE_TOP_TOLERANCE} px)`,
        ).toBeLessThanOrEqual(TITLE_TOP_TOLERANCE);
      }
    });

    test(`S4.g — el hgroup.titulo se va con el borde inferior del hero y nunca pisa el footer a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const heroHeight = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().height);
      const top0 = await titleTop(page);
      const measure = () =>
        page.evaluate(() => {
          const rect = (el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
          };
          return {
            hero: rect(document.querySelector('.hero')),
            title: rect(document.querySelector('hgroup.titulo')),
            footer: rect(document.querySelector('footer')),
          };
        });
      /** @param {Awaited<ReturnType<typeof measure>>} m @param {string} when */
      const expectClearOfFooter = (m, when) => {
        const { hero, title, footer } = m;
        expect.soft(
          title.bottom,
          `${when}: borde inferior del hgroup ${title.bottom.toFixed(2)}px vs borde inferior del hero ${hero.bottom.toFixed(2)}px (≤ +0,5)`,
        ).toBeLessThanOrEqual(hero.bottom + 0.5);
        const overlaps =
          title.left < footer.right && title.right > footer.left && title.top < footer.bottom && title.bottom > footer.top;
        expect.soft(overlaps, `${when}: el hgroup no debe intersectar el footer (arriba ${footer.top.toFixed(2)}px)`).toBe(false);
      };

      // Al final del documento tal cual está.
      await scrollPageTo(page, 1e6);
      expectClearOfFooter(await measure(), 'al final de la página');

      // El documento natural puede no alcanzar para sacar el hero de pantalla: se alarga el footer para recorrer el final del hero.
      await page.addStyleTag({ content: '.pie { min-height: 200vh; }' });
      for (const heroBottomAt of [0.4, 0.02]) {
        // fracción del alto del viewport donde queda el borde inferior del hero
        await scrollPageTo(page, heroHeight - heroBottomAt * viewport.height);
        const m = await measure();
        const when = `con el borde inferior del hero al ${heroBottomAt * 100} % del viewport`;
        expect(Math.abs(m.hero.bottom - heroBottomAt * viewport.height), `${when}: el scroll no llegó (hero abajo ${m.hero.bottom.toFixed(2)}px)`).toBeLessThanOrEqual(1);
        expectClearOfFooter(m, when);
        if (m.hero.bottom >= top0 + (m.title.bottom - m.title.top) + 1) {
          // todavía a la vista: el título sigue en su top
          expect.soft(Math.abs(m.title.top - top0), `${when}: top ${m.title.top.toFixed(2)}px vs ${top0.toFixed(2)}px`).toBeLessThanOrEqual(TITLE_TOP_TOLERANCE);
        } else {
          // ya no cabe: viaja pegado al borde inferior del hero, a su margin-bottom de distancia (L38: aire para los descendentes)
          const mb = await page.locator('hgroup.titulo').evaluate((el) => parseFloat(getComputedStyle(el).marginBottom));
          expect.soft(
            Math.abs(m.title.bottom + mb - m.hero.bottom),
            `${when}: el hgroup debe irse con el borde inferior del hero (abajo ${m.title.bottom.toFixed(2)}px vs ${m.hero.bottom.toFixed(2)}px)`,
          ).toBeLessThanOrEqual(0.5);
        }
      }
    });

    test(`S4.h — ninguna letra del título se recorta abajo al irse con el hero (L38) a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await expectTitleInkInsideHero(page, viewport);
    });

    test(`S4.g — contraste ≥ 4.5:1 del h1 y del antetítulo con el hero scrolleado 0, 25, 50 y 75 % a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const heroHeight = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().height);
      for (const level of [0, ...SCROLL_LEVELS]) {
        await scrollPageTo(page, heroHeight * level);
        const results = await measureTitleContrast(page);
        expect(results, 'falta hgroup.titulo con p.titulo__antetitulo (L24)').not.toBeNull();
        for (const { name, box, ratio, avg } of /** @type {NonNullable<typeof results>} */ (results)) {
          const when = `scroll ${level * 100} %`;
          expect.soft(ratio, `${when}, ${name}: la caja (arriba ${box.top.toFixed(1)}px) no cabe en el viewport`).not.toBeNull();
          if (ratio === null || avg === null) continue;
          test.info().annotations.push({ type: `contraste ${name}`, description: `${label}, ${when}: ${ratio.toFixed(2)}:1 sobre rgb(${avg.map(Math.round).join(', ')})` });
          expect.soft(
            ratio,
            `${when}, ${name}: contraste ${ratio.toFixed(2)}:1 de #f0ebe3 sobre fondo promedio rgb(${avg.map(Math.round).join(', ')})`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});

test.describe('S5 — Paleta de la foto adjunta', () => {
  test('S5.a — los 4 tokens existen en :root con valores exactos', async ({ page }) => {
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
  test('S7.a — los hijos de body son solo div.intro, main y footer; main contiene únicamente la sección .hero', async ({ page }) => {
    const tags = await page.evaluate(() => [...document.body.children].map((el) => el.tagName.toLowerCase()));
    expect(tags).toEqual(['div', 'main', 'footer']);
    await expect(page.locator('body > div:first-child')).toHaveClass('intro');
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
      // L29: color de los píxeles opacos (alfa 255) del PNG; deben ser --blanco (240, 235, 227) ±1.
      let opaquePixels = 0;
      let offPaletteOpaque = 0;
      let firstOpaque = null;
      if (el.naturalWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = el.naturalWidth;
        canvas.height = el.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(el, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        cornerAlpha = data[3];
        const target = [240, 235, 227];
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] !== 255) continue;
          opaquePixels += 1;
          if (!firstOpaque) firstOpaque = [data[i], data[i + 1], data[i + 2]];
          if (target.some((v, c) => Math.abs(data[i + c] - v) > 1)) offPaletteOpaque += 1;
        }
      }
      const p = /** @type {HTMLElement} */ (el.closest('p.pie__auspicio'));
      const textNode = [...p.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim());
      const range = document.createRange();
      range.selectNodeContents(/** @type {Node} */ (textNode));
      const pStyle = getComputedStyle(p);
      const r = el.getBoundingClientRect();
      return {
        paragraphText: (p.textContent || '').trim(),
        textTransform: pStyle.textTransform,
        letterSpacing: pStyle.letterSpacing,
        fontSize: parseFloat(pStyle.fontSize),
        src: el.src,
        alt: el.alt,
        naturalWidth: el.naturalWidth,
        cornerAlpha,
        opaquePixels,
        offPaletteOpaque,
        firstOpaque,
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
    // L29: el isologotipo es blanco hueso (--blanco, rgb(240, 235, 227) ±1) en todos sus píxeles opacos.
    expect(m.opaquePixels, 'el isologotipo no tiene píxeles con alfa 255').toBeGreaterThan(0);
    expect(m.firstOpaque, 'primer píxel con alfa 255 del isologotipo').toEqual(expect.any(Array));
    ['R', 'G', 'B'].forEach((channel, c) => {
      expect(
        Math.abs(/** @type {number[]} */ (m.firstOpaque)[c] - [240, 235, 227][c]),
        `canal ${channel} del primer píxel opaco = ${/** @type {number[]} */ (m.firstOpaque)[c]} (esperado ${[240, 235, 227][c]} ±1)`,
      ).toBeLessThanOrEqual(1);
    });
    expect(m.offPaletteOpaque, `${m.offPaletteOpaque} de ${m.opaquePixels} píxeles opacos del isologotipo no son rgb(240, 235, 227) ±1`).toBe(0);
    expect(m.imgTop, `img top ${m.imgTop.toFixed(1)} vs fondo del texto ${m.textBottom.toFixed(1)}: el logo va debajo del texto`).toBeGreaterThanOrEqual(m.textBottom);
    expect(m.width, `ancho del logo: ${m.width.toFixed(1)}px`).toBeGreaterThanOrEqual(LOGO_MIN_WIDTH);
    expect(m.width, `ancho del logo: ${m.width.toFixed(1)}px`).toBeLessThanOrEqual(LOGO_MAX_WIDTH);
    // L27: leyenda en mayúsculas espaciadas y logo de 260 px exactos.
    expect.soft(m.textTransform, 'text-transform de la leyenda').toBe('uppercase');
    const tracking = parseFloat(m.letterSpacing) / m.fontSize; // "normal" -> NaN
    expect.soft(
      tracking >= AUSPICIO_MIN_TRACKING,
      `letter-spacing de la leyenda: ${m.letterSpacing} / ${m.fontSize}px = ${tracking.toFixed(3)} em (mínimo ${AUSPICIO_MIN_TRACKING})`,
    ).toBe(true);
    expect.soft(Math.abs(m.width - LOGO_WIDTH), `ancho del logo ${m.width.toFixed(1)}px vs ${LOGO_WIDTH}px (±1)`).toBeLessThanOrEqual(1);
  });

  test('S7.g — el isologotipo cabe en el ancho disponible del bloque a 360×740', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const m = await measureAuspicioLogo(page);
    expect(m.naturalWidth, 'el isologotipo no cargó').toBeGreaterThan(0);
    expect(m.width, `ancho del logo ${m.width.toFixed(1)}px vs ancho disponible ${m.availableWidth.toFixed(1)}px`).toBeLessThanOrEqual(m.availableWidth + 0.5);
    expect(m.imgRight, `borde derecho del logo ${m.imgRight.toFixed(1)}px vs viewport ${m.clientWidth}px`).toBeLessThanOrEqual(m.clientWidth);
    expect.soft(Math.abs(m.width - LOGO_WIDTH), `ancho del logo ${m.width.toFixed(1)}px vs ${LOGO_WIDTH}px (±1)`).toBeLessThanOrEqual(1);
  });

  test('S7.h — el isologotipo está dentro de un único enlace a la Gran Logia (nueva pestaña, noopener, nombre accesible) con foco de teclado visible en --blanco', async ({ page }) => {
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
    expect(outline.color, 'outline-color').toBe('rgb(240, 235, 227)');
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

  test('S7.f — fondo del pie lacre (--rojo-800), filetes --rojo-600 y contraste ≥ 7:1', async ({ page }) => {
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
    expect(info.footerBackground, 'fondo del footer').toBe('rgb(138, 11, 18)');
    expect(info.blocks).toHaveLength(4);
    info.blocks.slice(1).forEach((b, i) => {
      expect(b.borderTopColor, `bloque ${i + 2}: filete`).toBe('rgb(176, 38, 44)');
    });
    const toRgb = (css) => rgbKey(css).split(',').map(Number);
    const background = toRgb(info.footerBackground);
    info.blocks.forEach((b, i) => {
      const ratio = contrastRatio(toRgb(b.color), background);
      expect(ratio, `bloque ${i + 1}: contraste ${b.color} sobre ${info.footerBackground} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(FOOTER_MIN_CONTRAST);
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
      const results = await measureTitleContrast(page);
      expect(results, 'falta hgroup.titulo con p.titulo__antetitulo (L24)').not.toBeNull();
      for (const { name, ratio, avg } of /** @type {NonNullable<typeof results>} */ (results)) {
        expect(ratio, `${name}: la caja no cabe en el viewport`).not.toBeNull();
        expect.soft(
          ratio,
          `${name}: contraste ${ratio?.toFixed(2)}:1 de #f0ebe3 sobre fondo promedio rgb(${avg?.map(Math.round).join(', ')})`,
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

  test('S9.b — ::selection usa --blanco de fondo y --rojo-800 de texto', async ({ page }) => {
    const selections = await page.evaluate(() =>
      ['body', 'h1', 'footer p'].map((sel) => {
        const cs = getComputedStyle(document.querySelector(sel), '::selection');
        return { sel, background: cs.backgroundColor, color: cs.color };
      }),
    );
    for (const s of selections) {
      expect(rgbKey(s.background), `${s.sel}::selection background: ${s.background}`).toBe(hexToRgbKey(TOKENS['--blanco']));
      expect(rgbKey(s.color), `${s.sel}::selection color: ${s.color}`).toBe(hexToRgbKey(TOKENS['--rojo-800']));
    }
  });

  test('S9.c — meta theme-color #1b0303 y meta color-scheme dark presentes', async ({ page }) => {
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1b0303');
    await expect(page.locator('meta[name="color-scheme"]')).toHaveCount(1);
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
  });

  test('S9.d — link rel="icon" apunta a assets/favicon.svg, que responde 200 image/svg+xml, con fondo --rojo-800 y «P» --blanco', async ({ page, request }) => {
    const link = page.locator('link[rel="icon"]');
    await expect(link, 'falta <link rel="icon">').toHaveCount(1);
    const href = await link.getAttribute('href');
    expect(href, 'href del icono').toBe('assets/favicon.svg');
    const resolved = await link.evaluate((el) => /** @type {HTMLLinkElement} */ (el).href);
    expect(new URL(resolved).pathname, 'ruta resuelta del icono').toBe('/assets/favicon.svg');
    const res = await request.get('/assets/favicon.svg');
    expect(res.status(), 'GET /assets/favicon.svg').toBe(200);
    expect(res.headers()['content-type']).toContain('image/svg+xml');
    const svg = await res.text();
    expect(svg, 'el favicon no es un SVG').toContain('<svg');
    // L29: fondo --rojo-800 y letra --blanco.
    expect(svg, 'fondo del favicon (--rojo-800)').toContain(TOKENS['--rojo-800']);
    expect(svg, 'letra del favicon (--blanco)').toContain(TOKENS['--blanco']);
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

// S10 (L31): intro animada. Colores y tiempos de la spec.
const INTRO_BG = 'rgb(138, 11, 18)'; // --rojo-800
const INTRO_INK = 'rgb(240, 235, 227)'; // --blanco
const INTRO_TOTAL_MS = 3000; // L37: todo revelado a los 3 s
const INTRO_SPIN_MS = INTRO_TOTAL_MS / PHI; // ≈ 1854 ms: un solo gesto de 2 vueltas, el tramo mayor de T
const INTRO_TIME_TOLERANCE_MS = 10;
const INTRO_ITERATIONS = 1;
const INTRO_SPIN_DEG = 720; // 2 vueltas
const INTRO_GONE_AT_MS = 3200; // S10.c: 0,2 s después del final, medido desde que arranca la intro (L37)

/** ¿El transform de un keyframe gira en Y? `rotateY(...)` o una matrix3d que no sea 2D. */
function isYRotation(transform) {
  if (typeof transform !== 'string') return false;
  if (/rotateY\(/i.test(transform)) return true;
  const m = /^matrix3d\(([^)]*)\)$/i.exec(transform.trim());
  if (!m) return false;
  const v = m[1].split(',').map(Number);
  // En 2D, matrix3d tiene ceros en m13, m23, m31, m32 (índices 2, 6, 8, 9).
  return v.length === 16 && [2, 6, 8, 9].some((i) => Math.abs(v[i]) > 1e-9);
}

test.describe('S10 — Intro animada (L31)', () => {
  test.describe('sin reducción de movimiento', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    for (const [label, viewport] of VIEWPORTS) {
      test(`S10.a — div.intro fija a sangre completa, en --rojo-800, aria-hidden, y al centro hay intro a ${label}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const m = await page.evaluate(() => {
          const intro = document.querySelector('.intro');
          if (!intro) return null;
          const r = intro.getBoundingClientRect();
          const cs = getComputedStyle(intro);
          const center = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
          return {
            firstChildIsIntroDiv: document.body.firstElementChild === intro && intro.tagName === 'DIV',
            position: cs.position,
            box: { left: r.left, top: r.top, width: r.width, height: r.height },
            background: cs.backgroundColor,
            ariaHidden: intro.getAttribute('aria-hidden'),
            centerInsideIntro: !!center && !!center.closest('.intro'),
            centerTag: center ? center.tagName.toLowerCase() + (center.getAttribute('class') ? `.${center.getAttribute('class')}` : '') : null,
          };
        });
        expect(m, 'falta div.intro (S10)').not.toBeNull();
        const a = /** @type {NonNullable<typeof m>} */ (m);
        expect.soft(a.firstChildIsIntroDiv, 'div.intro es el primer hijo de body').toBe(true);
        expect.soft(a.position, 'position de .intro').toBe('fixed');
        expect.soft(Math.abs(a.box.left) <= 1 && Math.abs(a.box.top) <= 1, `esquina de .intro (${a.box.left}, ${a.box.top})`).toBe(true);
        expect.soft(Math.abs(a.box.width - viewport.width) <= 1, `ancho de .intro ${a.box.width} vs ${viewport.width}`).toBe(true);
        expect.soft(Math.abs(a.box.height - viewport.height) <= 1, `alto de .intro ${a.box.height} vs ${viewport.height}`).toBe(true);
        expect.soft(a.background, 'background-color de .intro').toBe(INTRO_BG);
        expect.soft(a.ariaHidden, 'aria-hidden de .intro').toBe('true');
        expect.soft(a.centerInsideIntro, `elemento en el centro: ${a.centerTag}`).toBe(true);
      });
    }

    test('S10.b — un único svg en línea con rellenos y trazos en #f0ebe3, girando en Y: 2 vueltas en un giro de 3/φ s; duraciones 3/φⁿ, fin a los 3 s', async ({ page }) => {
      const m = await page.evaluate(() => {
        const intro = document.querySelector('.intro');
        if (!intro) return null;
        // Las formas dentro de defs/mask solo recortan (máscara); no se pintan, así que no cuentan (S10.b).
        const visible = [...intro.querySelectorAll('polygon, path, circle, rect, line')].filter((el) => !el.closest('defs, mask'));
        const shapes = visible.map((el) => {
          const cs = getComputedStyle(el);
          return { tag: el.tagName.toLowerCase(), fill: cs.fill, stroke: cs.stroke };
        });
        const animations = [intro, ...intro.querySelectorAll('*')].flatMap((el) =>
          el.getAnimations().map((a) => {
            const effect = /** @type {KeyframeEffect} */ (a.effect);
            const timing = effect.getTiming();
            return {
              target: el.tagName.toLowerCase() + (el.getAttribute('class') ? `.${el.getAttribute('class')}` : ''),
              transforms: effect.getKeyframes().map((k) => /** @type {any} */ (k).transform),
              iterations: timing.iterations,
              duration: timing.duration,
              delay: timing.delay,
            };
          }),
        );
        return {
          svgCount: intro.querySelectorAll('svg').length,
          imgCount: intro.querySelectorAll('img').length,
          shapes,
          animations,
        };
      });
      expect(m, 'falta div.intro (S10)').not.toBeNull();
      const b = /** @type {NonNullable<typeof m>} */ (m);
      expect.soft(b.svgCount, 'svg en .intro').toBe(1);
      expect.soft(b.imgCount, 'img en .intro (el emblema es un svg en línea)').toBe(0);
      expect.soft(b.shapes.length, 'formas del svg').toBeGreaterThan(0);
      for (const s of b.shapes) {
        const painted = [s.fill, s.stroke].filter((v) => v !== 'none');
        expect.soft(painted.length, `${s.tag}: sin relleno ni trazo (fill ${s.fill}, stroke ${s.stroke})`).toBeGreaterThan(0);
        for (const color of painted) expect.soft(color, `${s.tag}: color de relleno/trazo`).toBe(INTRO_INK);
      }
      const spins = b.animations.filter((a) => a.transforms.some(isYRotation));
      expect(spins.length, `animación con rotateY entre: ${JSON.stringify(b.animations)}`).toBeGreaterThan(0);
      for (const a of spins) {
        expect.soft(a.iterations, `iteraciones de la animación de ${a.target}`).toBe(INTRO_ITERATIONS);
        expect.soft(a.transforms.at(-1), `último keyframe de ${a.target}`).toBe(`rotateY(${INTRO_SPIN_DEG}deg)`);
        expect.soft(
          Math.abs(Number(a.duration) - INTRO_SPIN_MS) <= INTRO_TIME_TOLERANCE_MS,
          `duración ${a.duration} ms de la animación de ${a.target}`,
        ).toBe(true);
      }
      // L37: cada duración es 3 s / φⁿ (n ≥ 1) y la última animación termina a los 3 s.
      for (const a of b.animations) {
        const n = Math.max(1, Math.round(Math.log(INTRO_TOTAL_MS / Number(a.duration)) / Math.log(PHI)));
        expect.soft(
          Math.abs(Number(a.duration) - INTRO_TOTAL_MS / PHI ** n) <= INTRO_TIME_TOLERANCE_MS,
          `duración ${a.duration} ms de ${a.target}: no es 3000/φ^n`,
        ).toBe(true);
      }
      const end = Math.max(...b.animations.map((a) => Number(a.delay) + Number(a.duration) * Number(a.iterations)));
      expect.soft(Math.abs(end - INTRO_TOTAL_MS) <= INTRO_TIME_TOLERANCE_MS, `la intro termina a los ${end} ms`).toBe(true);
    });

    test('S10.c — a los 3,2 s de arrancar la intro, .intro tiene opacity 0 y visibility hidden, y el centro ya no es .intro', async ({ page }) => {
      // L37: la intro termina a los 3 s, así que se mide desde que arranca y no desde la navegación (bajo carga arranca
      // 0,1–0,4 s después). startTime y performance.now() comparten el origen (timeOrigin). Sin animaciones: desde 0.
      const { start, elapsed } = await page.evaluate(async () => {
        const anims = document.querySelector('.intro')?.getAnimations({ subtree: true }) ?? [];
        await Promise.all(anims.map((a) => a.ready));
        const starts = anims.map((a) => Number(a.startTime)).filter(Number.isFinite);
        return { start: starts.length ? Math.min(...starts) : 0, elapsed: performance.now() };
      });
      await page.waitForTimeout(Math.max(0, start + INTRO_GONE_AT_MS - elapsed));
      const m = await page.evaluate(() => {
        const intro = document.querySelector('.intro');
        if (!intro) return null;
        const cs = getComputedStyle(intro);
        const center = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        return {
          now: performance.now(),
          opacity: cs.opacity,
          visibility: cs.visibility,
          centerInsideIntro: !!center && !!center.closest('.intro'),
          centerTag: center ? center.tagName.toLowerCase() + (center.getAttribute('class') ? `.${center.getAttribute('class')}` : '') : null,
        };
      });
      expect(m, 'falta div.intro (S10)').not.toBeNull();
      const c = /** @type {NonNullable<typeof m>} */ (m);
      expect(c.now - start, 'la medición debe ser posterior a los 3,2 s de la intro').toBeGreaterThanOrEqual(INTRO_GONE_AT_MS);
      expect.soft(c.opacity, 'opacity de .intro').toBe('0');
      expect.soft(c.visibility, 'visibility de .intro').toBe('hidden');
      expect.soft(c.centerInsideIntro, `elemento en el centro: ${c.centerTag}`).toBe(false);
    });
  });

  // Sin test.use: corre con el reducedMotion 'reduce' por defecto de playwright.config.js.
  test('S10.d — con reducedMotion reduce, el display computado de .intro es none desde el inicio', async ({ page }) => {
    const m = await page.evaluate(() => {
      const intro = document.querySelector('.intro');
      return {
        reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
        display: intro ? getComputedStyle(intro).display : null,
        now: performance.now(),
      };
    });
    expect(m.reduce, 'el contexto de prueba debe pedir reducción de movimiento').toBe(true);
    expect(m.display, 'falta div.intro (S10)').not.toBeNull();
    expect(m.display, `display de .intro a los ${Math.round(m.now)} ms`).toBe('none');
  });
});


// S4.h (L38) con una serif cuya J desciende, como Noto Serif en Android (en este contenedor: DejaVu Serif, J ≈ 0,21 em
// bajo la línea base), y en un celular apaisado como el de la captura del usuario.
test.describe('S4.h — título sin recorte con J descendente (Android)', () => {
  for (const [label, viewport] of [['1440×900', { width: 1440, height: 900 }], ['390×844', { width: 390, height: 844 }], ['844×390', { width: 844, height: 390 }]]) {
    test(`S4.h — con serif de J descendente, ninguna letra se recorta a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addStyleTag({ content: 'hgroup.titulo, hgroup.titulo * { font-family: "DejaVu Serif", serif !important; }' });
      await expectTitleInkInsideHero(page, viewport);
    });
  }
});

