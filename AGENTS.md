# AGENTS.md

Este proyecto se desarrolla con **ODD — Organic Driven Development** de
[gentle-ai](https://github.com/Gentleman-Programming/gentle-ai), que combina:

- **SDD** (Spec-Driven Development): el trabajo sustancial vive en un único documento de feature `odd/tasks/<feature>.md`.
- **TDD**: test-first por defecto cuando hay un test ejecutable y un resultado esperado claro (RED observado → GREEN → REFACTOR).
- **RDD** (Receipt-Driven Development): cada commit de unidad de trabajo se congela y se revisa a la profundidad que dicta su riesgo (pasiva, media con un lente, alta con 4R: Risk, Resilience, Readability, Reliability).

## Protocolo

1. **Autorizar** — ¿el pedido autoriza cambios? Si no, solo lectura.
2. **Explorar** — código y requisitos existentes, en proporción al pedido.
3. **Resolver incertidumbre** — investigación puntual o una sola pregunta por decisión de producto real.
4. **Clasificar** — chico (reanudable con el pedido + `git diff`) o sustancial.
5. **Documentar antes de escribir** — si es sustancial, crear `odd/tasks/<feature>.md` antes del primer cambio de código.
6. **Implementar tarea por tarea** — test-first, chequeos aplicables, cada tarea cierra con un commit Conventional Commit.
7. **Cerrar** — informar resultado verificado, chequeos fallidos o pendientes y próximo paso.

### Documento de feature

Orden fijo: encabezado corto → `## Specs` (`S#` que citan literalmente al usuario, con criterios de aceptación) →
`## Tasks` (ID estable, `S#` vinculados, ruta, commit) → `## Log` (`L1` = pedido original literal; luego correcciones,
evidencia y razones). Un cambio de requisito reescribe solo la spec afectada y reabre solo su tarea.

Los workers reciben **una referencia** al documento, su tarea y sus `S#` — nunca una paráfrasis del pedido —, leen hasta
`## Log` y reportan qué specs cubrieron.

## Ruteo de modelos

Distribución de gentle-ai para Claude Code (agentes en `.claude/agents/`):

| Fase | Modelo | Agente |
|---|---|---|
| propose · design · orquestación · revisión RDD · revisión de estilo e identidad visual | **opus** | `odd-design`, `odd-review`, `odd-style` |
| spec · tasks · apply · verify | **sonnet** | `odd-apply`, `odd-verify` |
| archive · tareas mecánicas (assets, docs de cierre) | **haiku** | `odd-archive` |

## Comandos

```bash
npm install     # dependencias de desarrollo (Playwright + http-server)
npm start       # sirve el sitio en http://127.0.0.1:4173
npm test        # suite Playwright (Chromium)
```
