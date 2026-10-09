# Juan Martín De Pueyrredón

Landing de una sola pantalla con el formato minimalista de tamburins.com (solo el patrón de layout; sin marca, textos ni código de Tamburins).

## Qué hay

- Retrato completo a alto de pantalla, sobre el mismo cuadro desenfocado de fondo; la cabeza queda entera en los viewports probados (S2.d).
- Título pequeño arriba, centrado, en mayúsculas; sin menú.
- Paleta roja de la foto adjunta: 12 tokens declarados en `:root`.

| Token | Hex | Token | Hex |
|---|---|---|---|
| `--rojo-950` | `#1b0303` | `--carmesi-500` | `#a41727` |
| `--rojo-900` | `#400001` | `--carmesi-300` | `#ca302e` |
| `--rojo-800` | `#7c0000` | `--oxido-600` | `#9b1307` |
| `--rojo-700` | `#a60000` | `--rosa-300` | `#ff7a7b` |
| `--rojo-600` | `#ce0201` | `--rosa-100` | `#ffbbba` |
| `--carmesi-700` | `#81001f` | `--tinta` | `#1c1c26` |

- Times New Roman (con respaldos), sin fuentes web.
- Pie: tres renglones, filetes finos, dos párrafos y © (todo en Lorem ipsum).

## Estructura

```text
.
├── index.html                       página (hero + pie)
├── css/styles.css                   tokens, layout y pie
├── assets/img/pueyrredon.jpg        retrato optimizado
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
npm test      # tests Playwright (Chromium): 35 en total
```

- Requiere Node 18 o superior.
- En una máquina nueva, instalar Chromium para Playwright con `npx playwright install chromium`.
- Los 35 tests cubren los criterios S1.a–S8.d (26 criterios); S1.a, S2.d, S4.b, S4.c y S8.d se repiten por viewport.

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
