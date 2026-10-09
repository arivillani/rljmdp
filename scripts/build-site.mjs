// Arma `_site/`, la carpeta que publica GitHub Pages (S11, S12.b, L40).
//
// Recrea `_site/` desde cero con solo los archivos públicos:
//   - index.html       minificado (espacios colapsados, sin comentarios, script en línea minificado);
//   - css/styles.css   minificado por Lightning CSS, conservando el aviso `/*! … */` de derechos (S12.a);
//   - los mismos assets (favicon e imágenes) y `.nojekyll`.
// Tests, scripts, fuentes de los assets y documentos de trabajo no se publican.
//
// Lightning CSS se usa SIN `targets`: no transpila la sintaxis moderna (svh, translate, overflow: clip,
// mix-blend-mode, :is()…), solo la minifica. Uso: `npm run build`.
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as minifyHtml } from 'html-minifier-terser';
import { transform as minifyCss } from 'lightningcss';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');

/** Assets que usa la página y que se copian tal cual. */
const ASSETS = ['assets/favicon.svg', 'assets/img/pueyrredon-panorama.jpg', 'assets/img/gran-logia-argentina.png'];

const HTML_OPTIONS = {
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  // Terser sobre el <script> en línea: quita sus comentarios y acorta los nombres locales.
  minifyJS: true,
};

const kb = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`;

/** Escribe `contents` en `_site/<rel>` y devuelve el reporte de tamaños contra el fuente. */
async function publish(rel, source, contents) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
  const before = Buffer.byteLength(source);
  const after = Buffer.byteLength(contents);
  console.log(`  ${rel.padEnd(16)} ${kb(before)} -> ${kb(after)} (-${(100 - (after / before) * 100).toFixed(1)} %)`);
}

// El aviso de derechos (comentario preservable «/*! … */») que abre el CSS fuente (S12.a).
function leadingNotice(css) {
  const match = /^\/\*![\s\S]*?\*\//.exec(css);
  if (!match) throw new Error('css/styles.css debe empezar con el aviso /*! … */ (S12.a)');
  return match[0];
}

console.log('Armando _site/');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const html = await readFile(path.join(ROOT, 'index.html'), 'utf8');
const minHtml = await minifyHtml(html, HTML_OPTIONS);
if (!minHtml.includes('<script>') && !minHtml.includes('<script ')) {
  throw new Error('el HTML minificado perdió el <script> de la guarda (S12.c)');
}
await publish('index.html', html, minHtml);

const css = await readFile(path.join(ROOT, 'css/styles.css'), 'utf8');
const notice = leadingNotice(css);
const { code, warnings } = minifyCss({ filename: 'styles.css', code: Buffer.from(css), minify: true });
if (warnings.length) throw new Error(`Lightning CSS: ${warnings.map((w) => w.message).join('; ')}`);
const minCss = code.toString('utf8');
if (!minCss.startsWith(notice)) throw new Error('el CSS minificado perdió el aviso /*! … */ (S12.a)');
await publish('css/styles.css', css, minCss);

for (const asset of ASSETS) {
  await mkdir(path.dirname(path.join(OUT, asset)), { recursive: true });
  await cp(path.join(ROOT, asset), path.join(OUT, asset));
  console.log(`  ${asset} (${kb((await stat(path.join(OUT, asset))).size)})`);
}

// Sin Jekyll: Pages sirve los archivos tal cual.
await writeFile(path.join(OUT, '.nojekyll'), '');
console.log('Listo: _site/');
