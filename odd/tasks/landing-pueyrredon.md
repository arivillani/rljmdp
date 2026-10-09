# landing-pueyrredon

Landing page de una sola pantalla para Juan Martín De Pueyrredón, con el formato
minimalista de tamburins.com (hero a sangre completa + título pequeño arriba, como un logotipo + pie mínimo).

- **Flujo:** ODD (gentle-ai) — SDD (este documento) + TDD (Playwright, RED → GREEN → REFACTOR) + RDD (revisión por recibo de cada commit).
- **Rama:** `claude/tamburins-style-landing-page-vwou1y`
- **Runner de tests:** `npm test` → `@playwright/test@1.56.1` (Chromium) contra `http-server` en `http://127.0.0.1:4173`.
- **Entrega:** `single-pr` — pronóstico ~450 líneas autoradas, una sola rama; sin slicing.
- **Engram:** no disponible en este entorno → espejo `odd/landing-pueyrredon/tasks` pendiente; este archivo es la fuente de verdad.

## Specs

### S1 — Formato Tamburins
> "Quiero que copies el formato de la página https://www.tamburins.com/en/."

Se replica el *patrón de layout* (no marca, textos, código ni assets de Tamburins):
- Hero a sangre completa que ocupa exactamente el alto del viewport (`100svh`).
- Sin header ni microtexto de fecha o ciudad (L9: "Saca la fecha y la ciudad"); el único texto sobre el hero es el título pequeño arriba (S4), en la posición del logotipo de Tamburins.
- Mucho aire; sin bordes ni sombras pesadas; sin enlaces ni iconos.

Criterios:
- S1.a — `.hero` mide el alto del viewport (±1 px) a 1440×900 y a 390×844.
- S1.b — No hay elemento `header`, y el texto visible de la página no contiene `Buenos Aires`, `1777` ni `1850` (tampoco la `meta description`).
- S1.c — Sin scroll horizontal a 390 px (`scrollWidth <= clientWidth`).

### S2 — Imagen de fondo
> "la imagen de fondo que te adjunto."

- Asset: `assets/img/pueyrredon.jpg` (retrato adjunto, 1181×1424, JPEG optimizado, ≤ 400 KB).
- Se usa como `background-image` CSS de `.hero`, con `background-size: cover` y foco en el rostro (`background-position: center 35%`), bajo un velo en degradé de la paleta (S5) para legibilidad del título.

Criterios:
- S2.a — `getComputedStyle(.hero).backgroundImage` contiene `pueyrredon.jpg`.
- S2.b — `GET /assets/img/pueyrredon.jpg` responde 200 con `content-type` `image/jpeg`.
- S2.c — `background-size` es `cover`.

### S3 — Sin menú lateral
> "sin menú en el lateral"

Criterios:
- S3.a — No existen `aside`, `nav`, ni elementos cuyo `class`/`id`/`aria-label` contenga `menu`, `drawer`, `sidebar` u `hamburger` (sin distinguir mayúsculas).
- S3.b — La página no contiene `button` ni elementos con `role="button"`.

### S4 — Título centrado, pequeño y arriba
> "que de título diga Juan Martín De Pueyrredón centrado."
>
> "Pone el título pequeño arriba" (L9)

Criterios:
- S4.a — Existe exactamente un `h1` y su texto (trim) es exactamente `Juan Martín De Pueyrredón`.
- S4.b — El centro horizontal de la caja del `h1` está a ±2 px del centro del viewport, y `text-align` es `center` (1440×900 y 390×844).
- S4.c — El `h1` está arriba: su borde superior queda entre 12 px y 48 px del borde superior del hero, y su `font-size` computado está entre 14 px y 22 px (1440×900 y 390×844). Cabe en una sola línea a 390 px.
- S4.d — `<title>` del documento es `Juan Martín De Pueyrredón`; `<html lang="es">`.

### S5 — Paleta de la foto adjunta
> "que tenga la paleta de colores de la foto adjunta"

Tokens muestreados de la imagen "RED COLOR PALETTE" (declarados en `:root`, valores exactos):

| Token | Hex |
|---|---|
| `--rojo-950` | `#1b0303` |
| `--rojo-900` | `#400001` |
| `--rojo-800` | `#7c0000` |
| `--rojo-700` | `#a60000` |
| `--rojo-600` | `#ce0201` |
| `--carmesi-700` | `#81001f` |
| `--carmesi-500` | `#a41727` |
| `--carmesi-300` | `#ca302e` |
| `--oxido-600` | `#9b1307` |
| `--rosa-300` | `#ff7a7b` |
| `--rosa-100` | `#ffbbba` |
| `--tinta` | `#1c1c26` |

Uso: fondo del documento `--rojo-950`; título `--rosa-100`; velo del hero en degradé `--rojo-950` → `--carmesi-700` (con alfa); pie con fondo `--rosa-100` y texto `--rojo-900`.

Criterios:
- S5.a — Los 12 tokens existen en `:root` con esos valores exactos.
- S5.b — Colores computados (sin alfa) de: `body` background, `h1` color, `footer` background y color de `footer p` pertenecen al conjunto de tokens.

### S6 — Tipografía
> "letra times new Roman o similar"

- `font-family: "Times New Roman", Times, "Liberation Serif", Tinos, serif;` — sin fuentes web externas.

Criterios:
- S6.a — El `font-family` computado de `body`, `h1` y `footer p` empieza por `"Times New Roman"`.
- S6.b — La página no hace ninguna petición de red fuera de su propio origen.

### S7 — Pie mínimo
> "abajo que no tenga mucha información solo un Lorem ipsum"

Criterios:
- S7.a — Debajo del hero solo existe un `footer` con exactamente un `p` cuyo texto empieza por `Lorem ipsum` (≤ 60 palabras).
- S7.b — El `footer` no contiene `a`, `ul`, `ol`, `h1`–`h6`, `form`, `img` ni `svg`.
- S7.c — `main` contiene únicamente la sección `.hero`.

### S8 — Calidad base
Criterios:
- S8.a — `<meta name="viewport" content="width=device-width, initial-scale=1">` presente.
- S8.b — Sin JavaScript en la página (ningún `script`).
- S8.c — Sin errores de consola al cargar.
- S8.d — Legibilidad (añadido en R1, ver L7; ajustado en L9): con el texto oculto (`visibility: hidden`), el color promedio del fondo detrás de la caja del `h1` da un contraste WCAG ≥ 4.5:1 contra `--rosa-100`, a 1440×900 y a 390×844. Los ojos, nariz y boca del retrato siguen visibles y sin texto encima.

## Tasks

| ID | Specs | Ruta (modelo) | Trabajo | Estado | Commit |
|---|---|---|---|---|---|
| T0 | S1–S8 | opus — propose/design/spec/tasks | Este documento + `AGENTS.md` + agentes ODD en `.claude/agents/` | [x] | `e55be60` |
| T1 | S2 | haiku — asset | Copiar y optimizar el retrato a `assets/img/pueyrredon.jpg` | [x] | `5e0d4c3` |
| T2 | S1–S8 | sonnet — apply (TDD) | Tests Playwright en RED observado → `index.html` + `css/styles.css` en GREEN → refactor | [x] | `c96433d` |
| T3 | S1–S8 | sonnet — verify | Veredicto por spec (solo lectura) + capturas 1440×900 y 390×844 | [x] | — (solo lectura, L6) |
| T2b | S8.d | sonnet — apply (TDD) | Reabierta por R1: test de contraste en RED → ajustar velo/header en GREEN | [x] | `3d7215d` |
| T2c | S1, S4, S5, S6, S8.d | sonnet — apply (TDD) | Reabierta por L9: título pequeño arriba, sin fecha ni ciudad | [ ] | — |
| T4 | — | haiku — archive | `README.md` + cierre del Log | [ ] | — |
| R1 | — | opus — RDD | Evaluación de riesgo y revisión 4R a la profundidad que corresponda | [x] | L7, L8 |

## Log

- **L1** (pedido original, literal):
  > Adopta el enfoque odd (sdd+rdd+tdd) de gentle-ai de gentleman; Y también la distribución de tareas entre los agentes opus, sonnet y haiku de gentle-ai, para desarrollar este proyecto.
  > Quiero que copies el formato de la página https://www.tamburins.com/en/. Con:
  > - la imagen de fondo que te adjunto.
  > - sin menú en el lateral
  > - que de título diga Juan Martín De Pueyrredón centrado.
  > - que tenga la paleta de colores de la foto adjunta
  > - letra times new Roman o similar
  > - abajo que no tenga mucha información solo un Lorem ipsum
- **L2** (opus, T0): explorado — repo vacío, sin commits. tamburins.com no es accesible desde el entorno (DNS bloqueado por la política de red); S1 se basa en el patrón conocido del sitio (hero a pantalla completa, header transparente, microtipografía) y no copia marca, textos ni código. Paleta muestreada con PIL sobre la imagen adjunta (6 columnas × 5 filas); se eligieron 11 tonos representativos + el fondo `#1c1c26` de la lámina. Ruteo de modelos según gentle-ai v1.23: propose/design → opus; spec/tasks/apply/verify → sonnet; archive → haiku. Aquí opus (orquestador) redactó spec/tasks porque ya tenía todo el contexto explorado.
- **L3** (haiku, T1): `assets/img/pueyrredon.jpg` 1181×1424, 296 103 bytes, JPEG progresivo q82 sin metadatos — S2.b listo para test. Commit `5e0d4c3`.
- **L4** (opus, diseño): con `cover` a 1440×900 el rostro ocupa ~15–70 % del alto; un `h1` en el centro exacto taparía boca y mentón. Se interpreta "centrado" como centrado horizontal estricto (S4.b) y el título se apoya sobre el uniforme oscuro, al 68 % del alto (S4.c), lo que además mejora el contraste. Foco del fondo movido a `center 35%`. Revertible con una línea de CSS si se quiere centro exacto.
- **L5** (sonnet, T2): 25 tests (uno por criterio; S1.a, S4.b y S4.c en 1440×900 y 390×844). RED observado 25/25 fallando — el primer intento dio 7 verdes vacuos contra el listado de directorios de `http-server`, así que se añadió la guarda `expectLandingServed` (`main > section.hero` debe existir). GREEN 25/25 (~4 s). Desvío: el velo del hero pasó de capa de `background` a `.hero::before`, porque con dos capas el `background-size` computado es `auto, cover` y S2.c exige `cover`. `h1` medido al 0,680 del alto del hero en ambos viewports. Commit `c96433d`.
- **L6** (sonnet, T3): `npm test` 25/25 PASS; ningún test vacuo ni más débil que su criterio. Visual: a 390×844 el título queda sobre el uniforme y el rostro libre; a 1440×900 la línea 1 del título cae sobre mentón, cuello y corbatín claro. Contraste `#ffbbba` sobre fondo promedio: h1 a 1440 = 4.24 (línea 1: 3.86), header "BUENOS AIRES" a 1440 = 4.36; resto ≥ 6.4. Pie 10.73. Capturas en el scratchpad de la sesión.
- **L7** (opus, R1 — RDD): candidato `e55be60..c96433d`. Riesgo **pasivo** (HTML/CSS estático, sin JS, dependencias solo de desarrollo y fijadas) → relectura estructural, sin hallazgos de código. Corrección acotada (única permitida) a partir de L6: se añade S8.d (legibilidad) y se reabre el trabajo como T2b; L4 queda corregido: a 1440 el título no estaba del todo sobre el uniforme.
- **L8** (sonnet T2b + opus R1): RED observado 26/27 — S8.d a 1440×900: h1 4.08:1, "Buenos Aires" 4.40:1. GREEN 27/27: h1 5.46 / 8.63, "Buenos Aires" 4.82 / 7.96, "1777 — 1850" 9.35 / 7.17 (1440 / 390). Velo de `.hero::before` con banda superior más oscura (0–10 %) y banda oscura desde el 52 % detrás del título; banda del rostro (12–50 %) sin cambio apreciable (±0.02 de alfa). `text-shadow` suave en el header; filete del título en `--rosa-300`. Commit `3d7215d`. R1 revisó la corrección (CSS + test, riesgo pasivo) y la da por **reconocida**; el límite revisado avanza a `3d7215d`. Commit, push y PR quedan en manos del usuario.
- **L9** (usuario, cambio de requisito, literal):
  > Pone el título pequeño arriba
  > Saca la fecha y la ciudad

  (opus) Se reescriben S1 (sin header ni microtexto), S4 (título pequeño arriba, sigue centrado), S5.b, S6.a y S8.d (sin `header`); se reabre como T2c. El título pasa a la posición del logotipo de Tamburins, así que L4 (título sobre el uniforme) y la banda oscura del velo detrás del título quedan obsoletos. Se conserva la grafía exacta del título (sin `text-transform`).
