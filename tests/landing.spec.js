// @ts-check
// Suite de aceptación de odd/tasks/landing-pueyrredon.md (S1–S8).
// Cada test lleva el ID del criterio (S#.x) en su nombre.
const { test, expect } = require('@playwright/test');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['390×844', MOBILE],
];
// S2.d: viewports reales de escritorio (con barra del navegador) y de móvil.
const HEAD_VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['1920×950', { width: 1920, height: 950 }],
  ['1366×650', { width: 1366, height: 650 }],
  ['390×844', MOBILE],
  ['360×740', { width: 360, height: 740 }],
];

// S4.c: logotipo de una sola línea, también a 360 px.
const LOGO_VIEWPORTS = [
  ['1440×900', DESKTOP],
  ['390×844', MOBILE],
  ['360×740', { width: 360, height: 740 }],
];

// Retrato original (px) y caja de la cabeza con pelo, patillas y mentón (S2).
const PORTRAIT = { width: 1181, height: 1424 };
const HEAD_BOX = { x1: 270, x2: 760, y1: 150, y2: 710 };
const HEAD_MARGIN = 8;

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
  test('S2.a — único img.hero__retrato en .hero, src pueyrredon.jpg, alt no vacío y cargada (naturalWidth 1181)', async ({ page }) => {
    await expect(page.locator('img.hero__retrato')).toHaveCount(1);
    await expect(page.locator('.hero > img.hero__retrato')).toHaveCount(1);
    const info = await page.locator('img.hero__retrato').evaluate(async (img) => {
      const el = /** @type {HTMLImageElement} */ (img);
      try {
        await el.decode();
      } catch (e) {
        /* se informa vía naturalWidth */
      }
      return { src: el.src, alt: el.alt, naturalWidth: el.naturalWidth };
    });
    expect(info.src.endsWith('assets/img/pueyrredon.jpg'), `src: ${info.src}`).toBe(true);
    expect(info.alt.trim().length, 'alt vacío').toBeGreaterThan(0);
    expect(info.naturalWidth).toBe(PORTRAIT.width);
  });

  test('S2.b — GET /assets/img/pueyrredon.jpg responde 200 image/jpeg', async ({ request }) => {
    const res = await request.get('/assets/img/pueyrredon.jpg');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
  });

  test('S2.c — .hero::before: background-image pueyrredon.jpg, background-size cover y filter con blur', async ({ page }) => {
    const info = await page.locator('.hero').evaluate((el) => {
      const cs = getComputedStyle(el, '::before');
      return { backgroundImage: cs.backgroundImage, backgroundSize: cs.backgroundSize, filter: cs.filter };
    });
    expect(info.backgroundImage).toContain('pueyrredon.jpg');
    expect(info.backgroundSize).toBe('cover');
    expect(info.filter).toContain('blur');
  });

  for (const [label, viewport] of HEAD_VIEWPORTS) {
    test(`S2.d — cabeza entera con ≥ 8 px de margen y sin tocar el h1 a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await page.evaluate(({ portrait, head }) => {
        const hero = document.querySelector('.hero').getBoundingClientRect();
        const r = document.querySelector('img.hero__retrato').getBoundingClientRect();
        const h1 = document.querySelector('h1').getBoundingClientRect();
        const scale = r.width / portrait.width;
        return {
          scale,
          clientWidth: document.documentElement.clientWidth,
          heroHeight: hero.height,
          head: {
            left: r.left + head.x1 * scale,
            right: r.left + head.x2 * scale,
            top: r.top - hero.top + head.y1 * scale,
            bottom: r.top - hero.top + head.y2 * scale,
          },
          h1: { left: h1.left, right: h1.right, top: h1.top - hero.top, bottom: h1.bottom - hero.top },
        };
      }, { portrait: PORTRAIT, head: HEAD_BOX });
      const { head, h1 } = m;
      const box = `cabeza x ${head.left.toFixed(1)}–${head.right.toFixed(1)}, y ${head.top.toFixed(1)}–${head.bottom.toFixed(1)} ` +
        `(viewport ${m.clientWidth}×${m.heroHeight}, escala ${m.scale.toFixed(3)})`;
      expect.soft(head.left, `margen izquierdo: ${box}`).toBeGreaterThanOrEqual(HEAD_MARGIN);
      expect.soft(head.top, `margen superior: ${box}`).toBeGreaterThanOrEqual(HEAD_MARGIN);
      expect.soft(head.right, `margen derecho: ${box}`).toBeLessThanOrEqual(m.clientWidth - HEAD_MARGIN);
      expect.soft(head.bottom, `margen inferior: ${box}`).toBeLessThanOrEqual(m.heroHeight - HEAD_MARGIN);
      const overlaps = h1.left < head.right && h1.right > head.left && h1.top < head.bottom && h1.bottom > head.top;
      expect.soft(overlaps, `h1 (x ${h1.left.toFixed(1)}–${h1.right.toFixed(1)}, y ${h1.top.toFixed(1)}–${h1.bottom.toFixed(1)}) se superpone con la cabeza: ${box}`).toBe(false);
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
    test(`S4.c — h1 de logotipo: MAYÚSCULAS, borde superior a 12–48 px del hero, font-size 16–26 px y una línea con ≥ 16 px de margen lateral a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const m = await page.evaluate(() => {
        const hero = document.querySelector('.hero').getBoundingClientRect();
        const h1 = document.querySelector('h1');
        const r = h1.getBoundingClientRect();
        const cs = getComputedStyle(h1);
        const fontSize = parseFloat(cs.fontSize);
        const lineHeight = cs.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(cs.lineHeight);
        return {
          top: r.top - hero.top,
          left: r.left,
          right: document.documentElement.clientWidth - r.right,
          height: r.height,
          fontSize,
          lineHeight,
          textTransform: cs.textTransform,
        };
      });
      expect(m.textTransform, 'text-transform del h1').toBe('uppercase');
      expect(m.top, `borde superior del h1: ${m.top}px`).toBeGreaterThanOrEqual(12);
      expect(m.top, `borde superior del h1: ${m.top}px`).toBeLessThanOrEqual(48);
      expect(m.fontSize, `font-size del h1: ${m.fontSize}px`).toBeGreaterThanOrEqual(16);
      expect(m.fontSize, `font-size del h1: ${m.fontSize}px`).toBeLessThanOrEqual(26);
      expect(m.height, `alto ${m.height}px vs line-height ${m.lineHeight}px: más de una línea`).toBeLessThan(1.6 * m.lineHeight);
      expect(m.left, `margen izquierdo del h1: ${m.left}px`).toBeGreaterThanOrEqual(16);
      expect(m.right, `margen derecho del h1: ${m.right}px`).toBeGreaterThanOrEqual(16);
    });
  }

  test('S4.d — <title> correcto y <html lang="es">', async ({ page }) => {
    await expect(page).toHaveTitle(TITLE);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
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

test.describe('S7 — Pie mínimo', () => {
  test('S7.a — debajo del hero solo un footer con un p que empieza por "Lorem ipsum" (≤ 60 palabras)', async ({ page }) => {
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.locator('footer > *')).toHaveCount(1);
    const paragraphs = page.locator('footer p');
    await expect(paragraphs).toHaveCount(1);
    const text = ((await paragraphs.textContent()) || '').trim();
    expect(text.startsWith('Lorem ipsum')).toBe(true);
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(60);
    // Nada más debajo del hero: el footer es el único contenido tras él.
    const below = await page.evaluate(() => {
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const footer = document.querySelector('footer').getBoundingClientRect();
      const extra = [...document.body.children].filter(
        (el) => !['MAIN', 'FOOTER'].includes(el.tagName),
      );
      return { footerBelowHero: footer.top >= hero.bottom - 1, extra: extra.length };
    });
    expect(below.footerBelowHero).toBe(true);
    expect(below.extra).toBe(0);
  });

  test('S7.b — footer sin a, ul, ol, h1–h6, form, img ni svg', async ({ page }) => {
    await expect(page.locator('footer a, footer ul, footer ol, footer h1, footer h2, footer h3, footer h4, footer h5, footer h6, footer form, footer img, footer svg')).toHaveCount(0);
  });

  test('S7.c — main contiene únicamente la sección .hero', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toHaveCount(1);
    await expect(main.locator('> *')).toHaveCount(1);
    await expect(main.locator('> section.hero')).toHaveCount(1);
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
    test(`S8.d — contraste ≥ 4.5:1 del h1 a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Caja medida con el texto visible (visibility no altera el layout).
      const box = await page.locator('h1').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      });
      const x = Math.floor(box.left);
      const y = Math.floor(box.top);
      const clip = { x, y, width: Math.ceil(box.right) - x, height: Math.ceil(box.bottom) - y };
      // Fondo sin texto: se oculta el h1.
      await page.addStyleTag({ content: 'h1 { visibility: hidden !important; }' });
      const textColor = [0xff, 0xbb, 0xba]; // --rosa-100
      const png = await page.screenshot({ clip });
      const avg = await averageColor(page, png);
      const ratio = contrastRatio(textColor, avg);
      expect(
        ratio,
        `h1: contraste ${ratio.toFixed(2)}:1 de #ffbbba sobre fondo promedio rgb(${avg.map(Math.round).join(', ')})`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});
