# Juan Martín De Pueyrredón

Landing de una sola pantalla con el formato minimalista de tamburins.com (solo el patrón de layout; sin marca, textos ni código de Tamburins).

## Qué hay

- Panorama a sangre completa (`object-fit: cover`): el retrato original pegado píxel a píxel entre dos costados de nubes; sin fondo desenfocado y con la cabeza entera en los viewports probados (S2.d).
- Título pequeño arriba, centrado, en mayúsculas: "Respetable Logia" sobre el nombre, en proporción áurea (tamaño ×φ, separación ÷φ, tracking ×φ), con renglones a la altura de mayúsculas y el bloque colocado entre el borde del hero y la cabeza en 1 : φ; sin menú.
- Paleta roja con blanco hueso: 4 tokens declarados en `:root`. Todo el texto y el isologotipo van en un blanco apagado, sin tinte rosado, y el pie en un rojo lacre profundo (contraste del texto del pie 8,28:1).

| Token | Hex | Uso |
|---|---|---|
| `--blanco` | `#f0ebe3` | todo el texto, isologotipo, «P» del favicon, foco y fondo de la selección |
| `--rojo-950` | `#1b0303` | fondo del documento, `theme-color`, banda superior del velo |
| `--rojo-800` | `#8a0b12` | fondo del pie, tinte del velo inferior, favicon, texto de la selección |
| `--rojo-600` | `#b0262c` | filetes de 1 px del pie |

- Times New Roman (con respaldos), sin fuentes web.
- Pie: tres renglones, filetes finos, un párrafo y © en Lorem ipsum, más el bloque "BAJO LOS AUSPICIOS DE LA" (mayúsculas espaciadas) con el isologotipo de la Gran Logia Argentina (260 px), que enlaza a https://www.masoneria-argentina.org.ar/ en una pestaña nueva.

## Estructura

```text
.
├── index.html                       página (hero + pie)
├── css/styles.css                   tokens, layout y pie
├── assets/img/pueyrredon.jpg        retrato optimizado
├── assets/img/pueyrredon-panorama.jpg  panorama del hero (generado, ≤ 700 KB)
├── assets/img/gran-logia-argentina.png isologotipo de la Gran Logia (PNG transparente en --blanco)
├── assets/src/pueyrredon-gemini.jpg extensión lateral hecha con Gemini (fuente)
├── assets/src/gran-logia-argentina-original.png  isologotipo original, blanco sobre negro (fuente)
├── scripts/build_panorama.py        genera el panorama (Python 3 + Pillow + numpy)
├── scripts/build_logo.py            genera el isologotipo en --blanco desde el original
├── tests/landing.spec.js            tests Playwright
├── playwright.config.js             Chromium 1440×900, puerto 4173
├── odd/tasks/landing-pueyrredon.md  documento de feature (Specs, Tasks, Log)
├── AGENTS.md                        protocolo ODD y ruteo de modelos
└── .claude/agents/                  agentes odd-* (opus, sonnet, haiku)
```

## Uso

```bash
npm install   # dependencias de desarrollo (Playwright, http-server)
npm start     # sirve el sitio en http://127.0.0.1:4173
npm test      # tests Playwright (Chromium): 65 en total
python3 -I scripts/build_panorama.py   # regenera assets/img/pueyrredon-panorama.jpg y verifica S2.e y S2.f (requiere Pillow y numpy)
```

- Requiere Node 18 o superior.
- En una máquina nueva, instalar Chromium para Playwright con `npx playwright install chromium`.
- Los 65 tests cubren los criterios S1.a–S9.f salvo S2.f, que verifica `scripts/build_panorama.py` al generar el panorama; varios se repiten por viewport (S1.a, S2.c, S2.d, S4.b, S4.c, S4.e, S4.f, S7.g, S8.d, S9.a, S9.e, S9.f).

## Cómo se desarrolló

Con ODD (Organic Driven Development) de gentle-ai:

- **SDD**: el trabajo vive en `odd/tasks/landing-pueyrredon.md` (Specs, Tasks y Log con el pedido original, correcciones y evidencia).
- **TDD**: test-first con Playwright (RED → GREEN → REFACTOR).
- **RDD**: cada commit de unidad de trabajo se revisa según su riesgo.

Ruteo de modelos (detalle en `AGENTS.md`):

| Fase | Modelo | Agente |
|---|---|---|
| propose · design · orquestación · revisión RDD | opus | `odd-design`, `odd-review` |
| spec · tasks · apply · verify | sonnet | `odd-apply`, `odd-verify` |
| archive · tareas mecánicas | haiku | `odd-archive` |
