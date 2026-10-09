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

### S2 — Imagen de fondo, con la cabeza entera
> "la imagen de fondo que te adjunto."
>
> "Que la cabeza no aparezca cortada" (L10)
>
> "Ahí va la foto de gemini" (L18)

- Fuente: `assets/img/pueyrredon.jpg` (retrato original, 1181×1424) y `assets/src/pueyrredon-gemini.jpg` (extensión lateral con nubes hecha por el usuario con Gemini, 1456×720, 2,02:1).
- **Panorama:** `assets/img/pueyrredon-panorama.jpg`, generado por `scripts/build_panorama.py` (reproducible): la extensión de Gemini ampliada a la escala del original, con el color ajustado al original, y el **original pegado píxel a píxel en el centro** con un fundido horizontal de ≤ 48 px en sus bordes. La cara y la figura son las del original, no las de Gemini.
- El hero muestra el panorama con `<img class="hero__retrato">` a sangre completa (`object-fit: cover`). Hasta 2:1 se ve el alto completo y solo se recortan nubes a los lados; en pantallas más anchas se recorta un poco abajo, nunca la cabeza. Desaparecen el fondo desenfocado y el fundido lateral de L10.
- Caja de la cabeza: x 270–760, y 150–710 en px del original, trasladada al panorama con el desplazamiento del pegado que reporta el script.

Criterios:
- S2.a — Existe un único `img.hero__retrato` dentro de `.hero`, cuyo `src` termina en `assets/img/pueyrredon-panorama.jpg`, con `alt` no vacío; la imagen cargó, con `naturalWidth` ≥ 2400 y proporción entre 1,9 y 2,1.
- S2.b — `GET /assets/img/pueyrredon-panorama.jpg` responde 200 con `content-type` `image/jpeg` y pesa ≤ 700 KB.
- S2.c — Sangre completa sin desenfoque: `object-fit` del `img` es `cover`, su caja coincide con la del hero (±1 px) en los 6 viewports de S2.d, y ni `.hero` ni sus pseudo-elementos tienen `filter` con `blur`.
- S2.d — Cabeza sin cortar: la caja de la cabeza, proyectada con la geometría de `object-fit: cover` + `object-position`, queda entera dentro del viewport con ≥ 8 px de margen y empieza ≥ 4 px por debajo del borde inferior del `hgroup.titulo` completo (L24), a 1440×900, 1920×950, 1366×650, 2560×1080, 390×844 y 360×740.
- S2.e — Autenticidad: el script verifica que la región central del panorama coincide con el original (error absoluto medio < 3 sobre 255 fuera de la franja de fundido) e imprime el desplazamiento y la caja de la cabeza.

### S3 — Sin menú lateral
> "sin menú en el lateral"
>
> "Mira una foto de la página de tamburnis, el botón de menú no va" (L11)

Criterios:
- S3.a — No existen `aside`, `nav`, ni elementos cuyo `class`/`id`/`aria-label` contenga `menu`, `drawer`, `sidebar` u `hamburger` (sin distinguir mayúsculas).
- S3.b — La página no contiene `button` ni elementos con `role="button"`.

### S4 — Título centrado, pequeño y arriba
> "que de título diga Juan Martín De Pueyrredón centrado."
>
> "Pone el título pequeño arriba" (L9)
>
> "Arriba, en el título poné "Respetable Logia" más chico centrado sobre "Juan Martin De Pueyrredón" más grande, en una relación que comprenda matemáticamente la proporción aurea." (L24)

Bloque de título (L24): `hgroup.titulo` con `p.titulo__antetitulo` (`Respetable Logia`) arriba y el `h1` (`Juan Martín De Pueyrredón`, se mantiene el acento de S4.a) debajo, ambos en mayúsculas por CSS y centrados. Relaciones áureas (φ = 1,6180339…):
- tamaño: `font-size(h1) = φ × font-size(antetítulo)`;
- separación: el espacio entre la caja del antetítulo y la del `h1` = `font-size(antetítulo) / φ`;
- tracking: `letter-spacing(antetítulo) = φ × letter-spacing(h1)` (en em).

Criterios:
- S4.a — Existe exactamente un `h1` y su texto (trim) es exactamente `Juan Martín De Pueyrredón`.
- S4.b — El centro horizontal de la caja del `h1` está a ±2 px del centro del viewport, y `text-align` es `center` (1440×900 y 390×844).
- S4.c — El bloque de título está arriba, con el estilo de logotipo de la referencia (L11): antetítulo y `h1` con `text-transform: uppercase` (el texto del DOM no cambia, S4.a), el borde superior del `hgroup` entre 12 y 48 px del borde superior del hero, y el `font-size` del `h1` entre 16 y 26 px (1440×900 y 390×844). Cada línea cabe en un solo renglón con ≥ 16 px de margen lateral a 390 y a 360 px, y el antetítulo está centrado (±2 px) como el `h1`.
- S4.d — `<title>` del documento es `Respetable Logia Juan Martín De Pueyrredón` (L24); `<html lang="es">`.
- S4.e — Proporción áurea (L24), a 1440×900, 1366×650 y 390×844: `font-size(h1) / font-size(antetítulo)` = φ (±0,5 %); la separación vertical entre las cajas = `font-size(antetítulo) / φ` (±1 px); `letter-spacing(antetítulo) / letter-spacing(h1)` = φ (±1 %); el antetítulo está arriba del `h1`, dentro del mismo `hgroup.titulo`, y su texto es exactamente `Respetable Logia`.

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

Uso: fondo del documento `--rojo-950`; título `--rosa-100`; velo del hero en degradé `--rojo-950` → `--carmesi-700` (con alfa); pie con fondo `--rojo-700`, texto `--rosa-100` y filetes `--carmesi-300` (L15).

Criterios:
- S5.a — Los 12 tokens existen en `:root` con esos valores exactos.
- S5.b — Colores computados (sin alfa) de: `body` background, `h1` color, `footer` background y color de `footer p` pertenecen al conjunto de tokens.

### S6 — Tipografía
> "letra times new Roman o similar"

- `font-family: "Times New Roman", Times, "Liberation Serif", Tinos, serif;` — sin fuentes web externas.

Criterios:
- S6.a — El `font-family` computado de `body`, `h1` y `footer p` empieza por `"Times New Roman"`.
- S6.b — La página no hace ninguna petición de red fuera de su propio origen.

### S7 — Pie con el formato de Tamburins, en la paleta, solo Lorem ipsum
> "abajo que no tenga mucha información solo un Lorem ipsum"
>
> "Y está es la parte de abajo que va en la paleta de colores que te pedi" (L12)
>
> "Elegí un tono más rojo para el fondo de la parte de abajo." (L15)
>
> "Y en la sección donde está el "Ut enmi ad minim" pone "Bajo los auspicios de la" Y este isologotipo de la gran logia argentina." (L24)
>
> "Que sea un link a la página https://www.masoneria-argentina.org.ar/" (L25)

Se replica la *estructura* del pie de la referencia (L12) con texto de relleno: fondo claro y texto oscuro,
bloques de ancho completo separados por filetes finos, todo alineado a la izquierda:
1. `ul.pie__secciones` con tres renglones cortos (≈ 18–20 px), con mucho aire vertical: `Lorem ipsum`, `Dolor sit amet`, `Consectetur adipiscing`.
2. `p` chico (≈ 13–14 px, interlineado ≈ 1,7) de Lorem ipsum (≈ 35 palabras).
3. `p.pie__auspicio` (L24): el texto `Bajo los auspicios de la` y, debajo, el isologotipo de la Gran Logia Argentina como `img` en línea (`alt="Gran Logia Argentina de Libres y Aceptados Masones"`), de modo que la oración se lee completa con lector de pantalla. El logo es un PNG con transparencia en `--rosa-100` (`assets/img/gran-logia-argentina.png`), generado desde el original blanco sobre negro (`assets/src/gran-logia-argentina-original.png`).
4. `p.pie__copy` chico: `© Lorem ipsum`.

Colores (L15): fondo `--rojo-700` (`#a60000`); todo el texto `--rosa-100` (contraste 4.99:1); filetes 1 px `--carmesi-300`.
Sin botones; el único contenido real es el bloque de auspicio (L24), y el único enlace es el isologotipo hacia `https://www.masoneria-argentina.org.ar/` (L25).

Criterios:
- S7.a — Los hijos de `body` son solo `main` y `footer`; `main` contiene únicamente la sección `.hero`.
- S7.b — Estructura: el `footer` tiene exactamente 4 hijos directos con clase `pie__bloque`, en este orden: un `ul.pie__secciones` con exactamente 3 `li`; un `p`; un `p.pie__auspicio`; un `p.pie__copy` cuyo texto empieza por `©`.
- S7.c — Lorem ipsum salvo el auspicio: el primer `p` empieza por `Lorem ipsum`; el texto de los bloques 1, 2 y 4 sin el `©` contiene solo letras, espacios, comas y puntos (ni dígitos ni `@`), y suma ≤ 120 palabras.
- S7.h — Enlace (L25): el isologotipo está envuelto en un único `a` con `href` exactamente `https://www.masoneria-argentina.org.ar/`, `target="_blank"` y `rel` con `noopener`; su nombre accesible es `Gran Logia Argentina de Libres y Aceptados Masones (se abre en una pestaña nueva)`; con foco de teclado muestra un contorno visible en `--rosa-100`. La carga de la página sigue sin pedir nada fuera del propio origen (S6.b).
- S7.g — Auspicio (L24): el texto de `p.pie__auspicio` (trim) es exactamente `Bajo los auspicios de la`; contiene un único `img` con `src` terminado en `assets/img/gran-logia-argentina.png`, `alt` `Gran Logia Argentina de Libres y Aceptados Masones`, que cargó (`naturalWidth` > 0), con píxel de esquina transparente (alfa 0) y renderizado debajo del texto, con ancho entre 200 y 320 px a 1440×900 y ≤ el ancho disponible a 360 px.
- S7.d — El `footer` no contiene `button`, `form`, `svg` ni `h1`–`h6`; su único `img` es el isologotipo de S7.g y su único `a` es el enlace de S7.h.
- S7.e — Formato: `text-align` de los bloques es `left` o `start`; los bloques 2, 3 y 4 tienen `border-top` de 1 px y el bloque 1 no; el color de esos filetes, el fondo del `footer` y el color del texto de cada bloque pertenecen a los tokens de S5.
- S7.f — Fondo rojo (L15): el `background-color` del `footer` es `--rojo-700` (`#a60000`), los filetes son `--carmesi-300`, y el color de texto de cada bloque da contraste WCAG ≥ 4.5:1 contra ese fondo.

### S8 — Calidad base
Criterios:
- S8.a — `<meta name="viewport" content="width=device-width, initial-scale=1">` presente.
- S8.b — Sin JavaScript en la página (ningún `script`).
- S8.c — Sin errores de consola al cargar.
- S8.d — Legibilidad (añadido en R1, ver L7; ajustado en L9): con el texto oculto (`visibility: hidden`), el color promedio del fondo detrás de la caja del `h1` y de la del antetítulo (L24) da un contraste WCAG ≥ 4.5:1 contra `--rosa-100`, a 1440×900 y a 390×844. Los ojos, nariz y boca del retrato siguen visibles y sin texto encima.

### S9 — Refinamiento visual (revisión de estilo, L21)
> "Hace que el front lo revise algún agente de estilo e identidad visual así queda lindo y elegante" (L17)

Propuestas de `odd-style` aceptadas (ver L21). Velo inferior: el usuario eligió "Sombra + corte" (L22).
- Pie: columna de texto de 60ch en los párrafos (L22) (los filetes siguen a ancho completo), `text-wrap: pretty`, margen lateral `clamp(24px, 4.5vw, 64px)` común a todos los bloques y escala de espaciado de 8 px.
- Título como logotipo: `letter-spacing: .14em` con compensación óptica (`padding-left` igual al tracking), `font-size: clamp(16px, 4.2vw, 22px)`.
- Suavizado tipográfico, selección de texto con la paleta, `theme-color` y `color-scheme`, favicon SVG propio.
- Velo inferior (L22): `.hero::after` en `mix-blend-mode: multiply` con degradé `rgb(27 3 3 / .55) 0` → `rgb(27 3 3 / 0) 14%` → `rgb(129 0 31 / 0) 68%` → `rgb(129 0 31 / .7) 100%`. La base del cuadro se hunde en una sombra borravino casi negra y pasa al rojo del pie con un corte limpio, sin el tono lila.

Criterios:
- S9.a — Ningún renglón de los párrafos del pie supera 75 caracteres, a 1440×900 y a 1920×950; a 390×844 los bloques empiezan a ≥ 24 px del borde izquierdo y todos comparten el mismo borde izquierdo de texto (±1 px).
- S9.b — `::selection` usa `--rosa-100` de fondo y `--rojo-700` de texto.
- S9.c — `<meta name="theme-color" content="#1b0303">` y `<meta name="color-scheme" content="dark">` presentes.
- S9.d — `<link rel="icon">` apunta a `assets/favicon.svg`, que responde 200 con `image/svg+xml`; ninguna petición al cargar la página termina en 404.
- S9.e — El `letter-spacing` computado del `h1` es ≥ 0,12 em y su `padding-left` es igual a su `letter-spacing` (±0,5 px).
- S9.f — Sombra + corte (L22): el `mix-blend-mode` de `.hero::after` es `multiply`, y el color promedio de los últimos 22 px del hero tiene luminancia relativa ≤ 0,012 a 1440×900 y a 390×844 (antes: ≈ 0,025, lila).

## Tasks

| ID | Specs | Ruta (modelo) | Trabajo | Estado | Commit |
|---|---|---|---|---|---|
| T0 | S1–S8 | opus — propose/design/spec/tasks | Este documento + `AGENTS.md` + agentes ODD en `.claude/agents/` | [x] | `e55be60` |
| T1 | S2 | haiku — asset | Copiar y optimizar el retrato a `assets/img/pueyrredon.jpg` | [x] | `5e0d4c3` |
| T2 | S1–S8 | sonnet — apply (TDD) | Tests Playwright en RED observado → `index.html` + `css/styles.css` en GREEN → refactor | [x] | `c96433d` |
| T3 | S1–S8 | sonnet — verify | Veredicto por spec (solo lectura) + capturas 1440×900 y 390×844 | [x] | — (solo lectura, L6) |
| T2b | S8.d | sonnet — apply (TDD) | Reabierta por R1: test de contraste en RED → ajustar velo/header en GREEN | [x] | `3d7215d` |
| T2c | S1, S2, S4, S5, S6, S8.d | sonnet — apply (TDD) | Reabierta por L9, L10 y L11: título pequeño arriba en mayúsculas, sin fecha ni ciudad, cabeza sin cortar | [x] | `fd3b70a` |
| T2d | S7 | sonnet — apply (TDD) | Reabierta por L12: pie con el formato de la referencia, en la paleta, solo Lorem ipsum | [x] | `35a9d05` |
| T2e | S7 | sonnet — apply (TDD) | Reabierta por L15: fondo del pie más rojo | [x] | `43f74a2` |
| T1b | S2 | sonnet — asset | `scripts/build_panorama.py` → `assets/img/pueyrredon-panorama.jpg` (S2.b, S2.e) | [x] | `bc8c98e` |
| T2f | S2 | sonnet — apply (TDD) | Hero con el panorama a sangre completa (S2.a, S2.c, S2.d) | [x] | `969a32b` |
| S1 | S1–S8 | opus — style (`odd-style`) | Revisión de estilo e identidad visual (L17), solo lectura | [x] | — (L21) |
| T2g | S9 | sonnet — apply (TDD) | Aplicar las propuestas de estilo aceptadas, menos el velo | [x] | `3c478c7` |
| T2h | S9.f | sonnet — apply (TDD) | Velo inferior "Sombra + corte" (L22) | [x] | `fb04701` |
| T1c | S7.g | haiku — asset | Isologotipo a PNG transparente en `--rosa-100`, recortado | [x] | `a69e1a3` |
| T2i | S2.d, S4, S7, S8.d | sonnet — apply (TDD) | Antetítulo áureo + bloque de auspicio con el isologotipo enlazado (L25) | [ ] | — |
| S2-style | S4, S7 | opus — style (`odd-style`) | Revisión de estilo del bloque de título y del auspicio (L24) | [ ] | — |
| T4 | — | haiku — archive | `README.md` + cierre del Log | [x] | ver L14 |
| R1 | — | opus — RDD | Evaluación de riesgo y revisión 4R a la profundidad que corresponda | [x] | L7, L8, L13 |

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
- **L10** (usuario, cambio de requisito, literal):
  > Que la cabeza no aparezca cortada

  (opus) Con `cover` y foco al 35 %, a 1440×900 el pelo ya quedaba cortado arriba. Además, en viewports de escritorio reales (≈ 2:1 por la barra del navegador), `cover` solo deja ver ~560 px del alto original, y la cabeza mide ~560, así que ningún `background-position` la salva. Se reescribe S2: retrato nítido entero a alto completo + el mismo retrato desenfocado a sangre completa detrás (el hero sigue cubriendo toda la pantalla). Caja de la cabeza medida sobre el original con grilla: x 270–760, y 150–710. Se suma a T2c.
- **L11** (usuario, referencia visual, literal):
  > Mira una foto de la página de tamburnis, el botón de menú no va

  (opus) La captura móvil de tamburins.com/en/ muestra: logotipo serif en mayúsculas arriba a la izquierda, botón de menú (hamburguesa) arriba a la derecha, retrato a sangre completa con la cabeza entera y aire arriba, nombre de producto y dos enlaces abajo al centro, e indicadores de carrusel. Se aplica: sin botón de menú (ya cubierto por S3.a/S3.b) y título con estilo de logotipo (mayúsculas por CSS, 16–26 px, S4.c). Se mantiene "centrado" (S4.b) por el pedido original; producto, enlaces y carrusel quedan fuera porque el pedido dice "solo un Lorem ipsum" abajo (S7). Se suma a T2c.
- **L12** (usuario, referencia visual, literal):
  > Y está es la parte de abajo que va en la paleta de colores que te pedi

  (opus) La captura muestra el pie de la referencia: fondo blanco, tres renglones grandes alineados a la izquierda, filetes finos de ancho completo, dos párrafos chicos de datos legales y una línea de ©. Se reescribe S7: misma estructura en la paleta (fondo `--rosa-100`, texto `--rojo-900` y `--rojo-800`, filetes `--rosa-300`), con todo el texto en Lorem ipsum, sin enlaces ni datos reales, para respetar el pedido original ("solo un Lorem ipsum"). Nueva tarea T2d.
- **L13** (sonnet T2c/T2d + opus R1): T2c — RED 11 fallos (S1.b, S2.a, S2.c, S2.d ×5, S4.c ×2, S7.a); la parte L11 también en RED (S4.c a 1440/390/360) → GREEN. T2d — RED S7.b y S7.e → GREEN. Suite final **35/35**. Cabeza (px de pantalla, x / y): 1440×900 517–827 / 95–449; 1920×950 746–1073 / 100–474; 1366×650 537–760 / 69–324; 390×844 47–338 / 89–421; 360×740 50–305 / 78–369. `h1` a ≥ 20 px por encima de la cabeza; contraste del `h1` 6.15–6.35. Desvíos: `translateX(-44%)` bajo 600 px para centrar la cabeza (no la imagen); selector `.pie .pie__copy` por especificidad. R1 sobre `3d7215d..35a9d05`: riesgo **pasivo** (HTML/CSS estático + tests), relectura estructural y revisión visual de capturas a 1920×950, 390×844 y pie completo, sin hallazgos → **reconocido**; el límite revisado avanza a `35a9d05`.
- **L14** (haiku, T4): README.md creado; documento de feature cerrado. Pendiente: espejo Engram (no disponible en el entorno).
- **L15** (usuario, cambio de requisito, literal):
  > Elegí un tono más rojo para el fondo de la parte de abajo.

  (opus) De los rojos de la paleta, `--rojo-600` (`#ce0201`) da solo 3.59:1 con `--rosa-100` y no sirve para el texto chico del pie; `--rojo-700` (`#a60000`) es un rojo pleno y da 4.99:1 → elegido. `--rosa-300` sobre ese rojo da 3.18:1, así que todo el texto pasa a `--rosa-100`; filetes en `--carmesi-300` (rojo más claro, sutil, como el gris claro de la referencia). Se reescribe S7 (colores) y se añade S7.f; nueva tarea T2e.
- **L16** (sonnet, T2e): RED solo S7.f (pie rosa `rgb(255, 187, 186)` en vez de `rgb(166, 0, 0)`) → GREEN 36/36. Contraste del texto en los 4 bloques: 4.986:1. Commit `43f74a2`.
- **L17** (usuario, literal):
  > Hace que el front lo revise algún agente de estilo e identidad visual así queda lindo y elegante

  (opus) Nuevo agente `odd-style` (opus, solo lectura) en `.claude/agents/`, commit `3321eeb`. Sus propuestas no pueden romper ninguna spec; lo que choque con una spec vuelve como pregunta al usuario. Las propuestas aceptadas se aplican como tarea de sonnet con TDD.
- **L18** (usuario, literal):
  > Ahí va la foto de gemini

  (opus) Recibida: 1456×720 (2,02:1), un solo par de firmas en su lugar (la original), sin texto añadido. Está a la mitad de resolución del original (la cabeza quedaría con ~50 % del detalle), así que no se usa tal cual: se arma un panorama de ~2880×1424 con los costados de Gemini ampliados y el original pegado en el centro píxel a píxel. Así la figura no depende de lo que Gemini haya redibujado. Se reescribe S2 y se crean T1b (asset) y T2f (integración). La revisión de estilo (S1-style) va después, sobre la versión con el panorama.
- **L19** (usuario, literal, sobre los colores del pie):
  > Está bien el coloro

  (opus) Queda: fondo `#a60000` y letra `#ffbbba` (misma columna de la lámina), filetes `#ca302e`. Sin cambios.
- **L20** (sonnet T1b/T2f + opus R1): registro del original en la imagen de Gemini con s = 0.5075, (429, 0), residuo 12.76/255; Gemini ampliado ×1.9704 → 2869×1419 + 5 px reflejados abajo → **2869×1424**; ajuste de color (ganancia/sesgo) R 1.039/−2.3, G 1.059/−4.4, B 1.070/−4.2; original pegado en x = 845 con fundido smoothstep de 48 px. **S2.e: 1.80/255** sobre el JPEG guardado. Panorama: 566 879 bytes, q82, determinista. Gemini escaló el original de forma levemente anisótropa (≈ 1,5 % más en vertical); el desfase local en las uniones es de 3–5 px y queda oculto por el fundido. T2f — RED 13 fallos (S2.a, S2.c ×6, S2.d ×6; S2.d con guarda para que no pase en vacío) → GREEN **42/42**. `object-position: 47% 15%`. Cabeza dentro del viewport en los 6 tamaños (margen mínimo 44.9 px a 390), `h1` ≥ 19 px por encima. R1 sobre `f8296f5..969a32b`: riesgo **pasivo** (asset + script offline + CSS/HTML estático); revisión visual de uniones, rostro y capturas a 1920×950 y 390×844, sin hallazgos → **reconocido**.
- **L21** (opus, revisión de estilo `odd-style` sobre `1edc908`, solo lectura; el agente aún no estaba cargado en la sesión, así que corrió con sus mismas instrucciones): 8 propuestas, todas probadas en una copia con la suite en 42/42. Aceptadas → S9 (T2g): columna de ≤ 64ch en el pie (antes un renglón de 211 caracteres a 1440), márgenes y espaciado de 8 px, título con tracking .14em y centrado óptico, suavizado tipográfico, `::selection`, `theme-color`/`color-scheme` y favicon. Pendiente de decisión del usuario: el velo inferior. Según el agente, el carmesí con alfa sobre el uniforme azul se ve lila (tono ≈ 340°) y compite con el rojo del pie; propone `mix-blend-mode: multiply` con una sombra más larga, para que el paso al pie sea un corte limpio de oscuro a rojo.
- **L22** (usuario, respuesta a la pregunta sobre el difuminado; opción elegida, literal):
  > Sombra + corte (Recomendado)

  (opus) T2g (sonnet): RED 8 fallos (S9.a ×3, S9.b, S9.c, S9.d, S9.e ×2) → GREEN **51/51**. Desvío aceptado: la columna del pie queda en 60ch y no en 64ch, porque con 64ch salía un renglón de 78 caracteres y S9.a exige ≤ 75 (máximo medido con 60ch: 73). Título: 22 px a 1440, 16,4 px a 390, centrado exacto, contraste 6,26–6,36. El suavizado tipográfico no tiene un test útil en Chromium para Linux, así que se aplica sin test. Commit `3c478c7`. Nueva tarea T2h para el velo (S9.f).
- **L23** (sonnet T2h + opus R1): RED S9.f en los dos viewports (`mix-blend-mode` `normal`; luminancia de la base 0.0257 / 0.0264, rgb(79, 26, 43)) → GREEN **53/53**. Luminancia final 0.0065 / 0.0068 (rgb(28, 15, 21)); contraste del `h1` 6.43 / 6.54. Commit `fb04701`. R1 sobre `f8250f0..fb04701`: riesgo **pasivo** (CSS/HTML estático, favicon SVG del mismo origen, tests); relectura estructural y revisión visual a 1440 (página completa), sin hallazgos → **reconocido**. README actualizado a 53 tests. Pendiente: espejo Engram (no disponible).
- **L24** (usuario, literal; adjunta el isologotipo de la Gran Logia Argentina, blanco sobre negro, 903×492):
  > Arriba, en el título poné "Respetable Logia" más chico centrado sobre "Juan Martin De Pueyrredón" más grande, en una relación que comprenda matemáticamente la proporción aurea.
  > Y en la sección donde está el "Ut enmi ad minim" pone "Bajo los auspicios de la"
  > Y este isologotipo de la gran logia argentina. Después pásalo por el agente de imagen a ver el estilo que le da

  (opus) Se reescriben S4 (bloque `hgroup` + S4.e con tres relaciones áureas: tamaño ×φ, separación ÷φ y tracking ×φ), S4.d (título del documento con el nombre de la logia), S2.d (la cabeza empieza debajo de todo el bloque de título), S8.d (contraste del antetítulo) y S7 (el bloque 3 pasa a ser el auspicio con el isologotipo, S7.g). Se mantiene el acento de "Martín" (S4.a). El bloque de título suma altura y a 1366×650 la cabeza empieza a ~67 px del borde superior, así que el tamaño del `h1` también tiene que depender del alto del viewport. Nuevas tareas: T1c (haiku), T2i (sonnet) y S2-style (opus, "agente de imagen").
- **L25** (usuario, literal):
  > Que sea un link a la página https://www.masoneria-argentina.org.ar/

  (opus) T1c (haiku) listo: `assets/img/gran-logia-argentina.png` RGBA de 719×274, 28 269 bytes, todo `#ffbbba` sobre alfa, fondo transparente, sin halo; commit `a69e1a3`. Para el enlace se reescribe S7 (S7.d permite solo este `a`) y se añade S7.h: el logo enlaza al sitio en una pestaña nueva, con `rel="noopener"`, un nombre accesible que avisa la pestaña nueva y foco visible. Se suma a T2i, que estaba en curso.
