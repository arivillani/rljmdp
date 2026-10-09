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

  test('S1.b — header es absolute/fixed, transparente y está en top: 0', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toHaveCount(1);
    const info = await header.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        position: cs.position,
        background: cs.backgroundColor,
        top: cs.top,
        boxTop: el.getBoundingClientRect().top,
      };
    });
    expect(['absolute', 'fixed']).toContain(info.position);
    expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(info.background);
    expect(info.top).toBe('0px');
    expect(info.boxTop).toBe(0);
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

test.describe('S2 — Imagen de fondo', () => {
  test('S2.a — .hero usa pueyrredon.jpg como background-image', async ({ page }) => {
    const bg = await page.locator('.hero').evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('pueyrredon.jpg');
  });

  test('S2.b — GET /assets/img/pueyrredon.jpg responde 200 image/jpeg', async ({ request }) => {
    const res = await request.get('/assets/img/pueyrredon.jpg');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/jpeg');
  });

  test('S2.c — background-size es cover', async ({ page }) => {
    const size = await page.locator('.hero').evaluate((el) => getComputedStyle(el).backgroundSize);
    expect(size).toBe('cover');
  });
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

test.describe('S4 — Título centrado', () => {
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

    test(`S4.c — centro vertical del h1 al 68 % (±5 %) del alto del hero a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const ratio = await page.evaluate(() => {
        const hero = document.querySelector('.hero').getBoundingClientRect();
        const h1 = document.querySelector('h1').getBoundingClientRect();
        return (h1.top + h1.height / 2 - hero.top) / hero.height;
      });
      expect(ratio).toBeGreaterThanOrEqual(0.63);
      expect(ratio).toBeLessThanOrEqual(0.73);
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

  test('S5.b — colores computados de body, h1, header y footer pertenecen a los tokens', async ({ page }) => {
    const computed = await page.evaluate(() => {
      const cs = (sel) => getComputedStyle(document.querySelector(sel));
      return {
        'body background': cs('body').backgroundColor,
        'h1 color': cs('h1').color,
        'header color': cs('header').color,
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
  test('S6.a — font-family computado de body, h1, header y footer p empieza por "Times New Roman"', async ({ page }) => {
    const families = await page.evaluate(() =>
      ['body', 'h1', 'header', 'footer p'].map((sel) => [sel, getComputedStyle(document.querySelector(sel)).fontFamily]),
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
        (el) => !['HEADER', 'MAIN', 'FOOTER'].includes(el.tagName),
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
    test(`S8.d — contraste ≥ 4.5:1 de h1 y header a ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const targets = [
        ['h1', page.locator('h1')],
        ['header span:nth-child(1)', page.locator('header span').nth(0)],
        ['header span:nth-child(2)', page.locator('header span').nth(1)],
      ];
      // Cajas medidas con el texto visible (visibility no altera el layout).
      const boxes = [];
      for (const [name, locator] of targets) {
        const box = await locator.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        });
        const x = Math.floor(box.left);
        const y = Math.floor(box.top);
        boxes.push([name, { x, y, width: Math.ceil(box.right) - x, height: Math.ceil(box.bottom) - y }]);
      }
      // Fondo sin texto: se oculta el h1 y los spans del header.
      await page.addStyleTag({ content: 'h1, header span { visibility: hidden !important; }' });
      const textColor = [0xff, 0xbb, 0xba]; // --rosa-100
      for (const [name, clip] of boxes) {
        const png = await page.screenshot({ clip });
        const avg = await averageColor(page, png);
        const ratio = contrastRatio(textColor, avg);
        expect.soft(
          ratio,
          `${name}: contraste ${ratio.toFixed(2)}:1 de #ffbbba sobre fondo promedio rgb(${avg.map(Math.round).join(', ')})`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
