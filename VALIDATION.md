# Validación de Fixy Demo — 2026-10-09

## Resultado ejecutado

- `bun install`: PASS. Dependencias propias, sin copiar node_modules.
- `bun run typecheck`: PASS después de los últimos cambios.
- `bun run build`: PASS, SPA en `dist/fixy-demo/browser`. Bundle inicial 633,23 kB; transferencia estimada 153,39 kB.
- `bun run test -- --watch=false`: PASS, 10 archivos / 50 tests.
- `bunx eslint src/app/demo src/app/core/services/auth.service.ts src/app/core/services/payment.service.ts`: PASS.
- `bun run lint`: FAIL, 53 incidencias heredadas en componentes originales (accesibilidad de templates, imports, tipos). No se desactivaron reglas para ocultarlas.
- Advertencias de build heredadas: Sass del footer y dos expresiones nullish de workerRating.

## Cobertura funcional automatizada

El motor local y su integración Angular comprueban roles/ownership, selección de profesional, presupuesto/acuerdo, pago simulado idempotente, prevención de duplicados concurrentes, inicio, completion conservando HELD, protección, review/rating, registro y persistencia/reset, visitas gratuitas, disputes, participantes y counterpart del chat, cierre/reapertura y bloqueo total del fallback HTTP real. La confirmación de pago utiliza un diálogo Angular cancelable; no realiza Checkout ni mueve dinero.

## Navegador y responsive

Se probó en localhost:4300: cambio CLIENT/WORKER, publicación de solicitud 200, propuesta negociable por 55.000, aceptación, presupuesto 40.000 + 15.000, acuerdo 209 y persistencia al recargar. Consola sin errores relevantes durante estos pasos.

La comprobación interactiva quedó bloqueada por un diálogo nativo de la primera versión en el navegador embebido. Esa confirmación se reemplazó por un diálogo Angular con tests. No se declara PASS visual del flujo completo de pago/inicio/completion/review, registro ni intercambio de mensajes; estos comportamientos tienen validación automatizada, pero requieren completar el recorrido manual con un navegador libre del diálogo anterior.

Viewport móvil 390 × 844: captura revisada tras corregir el navbar; no desbordamiento horizontal (documento 375 px con viewport 390 px). Controles de demo, búsqueda y contratación visibles. Override de viewport restaurado al terminar.

## Integridad y entrega

Los 213 archivos originales registrados conservan sus hashes y el status Git original permanece idéntico: ver `original-integrity.json`. El origen es `C:\fixy-angular-front-new`; la copia está en `C:\fixy-demo`. Git independiente, sin remotes, sin push ni publicación. No se copiaron credenciales ni .env del original.

`vercel.json` incluye build SPA y rewrite de rutas. El despliegue real en Vercel no fue ejecutado. Ver README para cuentas, ejecución con Bun, arquitectura y límites explícitos de la simulación.

## Actualización — guía e Info (2026-10-09)

Cambios sólo en la copia demo: marca `(demo)` del logo; aviso sin backend; ruta Info y documentación del sistema; guía reutilizable por pantalla, rol y lifecycle, con cierre persistente/reapertura. La revisión reactiva del almacén sólo notifica cambios locales a la guía; no cambia reglas de negocio ni llama servicios externos.

TypeScript, lint de `src/app/demo` y build SPA: PASS. Build inicial 649,21 kB, transferencia estimada 157,78 kB; advertencias heredadas sin cambios.

Browser: PASS avance 1→2, cierre persistido tras reload, reapertura, navegación Info, contenido y enlace README. Mobile 390×844 sin overflow horizontal; guía debajo del navbar. Consola sin errores/warnings en esa comprobación. Viewport restaurado y pestaña devuelta a `/requests/103`. No se ejecutaron pagos ni mutaciones de contratación para esta revisión UI.
Suite final: `bun run test -- --watch=false` PASS, 12 archivos / 56 tests. Se agregaron tests de cobertura de rutas, rol/lifecycle, controles y cierre persistente sin mutar el dominio, y actualización del consejo tras confirmar un pago local sin reload.
