# Fixy Demo Frontend

Demo interactiva independiente del frontend Angular de Fixy. No requiere Spring, Payment/Go, PostgreSQL ni Kafka. Todas las operaciones de esta demo son locales y ficticias.

## Ejecutar con Docker

Requiere Docker con Compose. Node y Bun se usan dentro del contenedor; no hace falta instalarlos localmente.

```sh
docker compose up --build -d
```

Abrir http://localhost:4300. La imagen compila Angular y sirve la demo estática con Nginx, incluyendo fallback para rutas profundas como `/requests/103`. No levanta backend ni servicios de pago: el recorrido sigue siendo una simulación local en el navegador.

Para aplicar cambios, repetir el comando anterior. Para detener:

```sh
docker compose down
```

El estado se conserva en localStorage del navegador, no en volúmenes Docker. GitHub Pages y Vercel mantienen sus builds actuales.

## Desarrollo sin Docker

Requisitos: Bun 1.3.14 y Node compatible con Angular 22 (`^22.22.3` o `^24.15.0`).

```powershell
cd C:\fixy-demo
bun install --frozen-lockfile
bun run start -- --port 4300
```

Abrir `http://localhost:4300`. Cada origen/navegador guarda su propio recorrido; `localhost` y `127.0.0.1` tienen almacenes distintos.

## Usuarios y sesión

Todos los usuarios iniciales usan la contraseña ficticia `Demo123!`:

| Email | Rol | Nombre |
|---|---|---|
| cliente@fixy.demo | CLIENT | José María Paz |
| trabajador@fixy.demo | WORKER verificado | Luca Prodan |
| sofia@fixy.demo | CLIENT | Sofía Torres |
| camila@fixy.demo | WORKER verificado | Camila Ríos |

Los dos accesos rápidos de la barra permiten cambiar de cliente a trabajador sin borrar las operaciones. El registro crea un cliente utilizable en ese navegador. No usar passwords, documentos, teléfono ni datos personales reales. Se guarda sólo un hash con salt de la contraseña ficticia: esto NO es autenticación segura ni un sistema de protección real.

La sesión, solicitudes, acuerdos, pagos, chat y reseñas viven en `localStorage`, clave versionada `fixy-demo-v1`. Los favoritos se guardan por usuario. **Restablecer demo** pide confirmación, recupera los fixtures iniciales y elimina los favoritos/hints de la demo. No borrar datos de otros productos ni bases de datos.

## Recorrido completo

1. Entrar como cliente → publicar una solicitud desde el dashboard o `/requests/new`.
2. Cambiar a trabajador → oportunidades → abrir esa solicitud → enviar propuesta.
3. Cambiar a cliente → mis solicitudes → seleccionar profesional.
4. Propuesta con importe definitivo: genera presupuesto aceptado y acuerdo sin reconfirmar. Propuesta a evaluar: el trabajador envía presupuesto estructurado y el cliente lo acepta.
5. Cliente → **Pagar contratación** desde detalle, chat o `/payments` → **Confirmar simulación**. No se abre Mercado Pago ni hay cobros. El pago pasa de PENDING a HELD.
6. Trabajador → **Iniciar trabajo**. Cliente → **Confirmar finalización**. El request pasa a COMPLETED; el pago permanece HELD y empieza la protección del acuerdo (default 3 días).
7. Cliente → publicar una reseña en el detalle. Se actualiza el rating del trabajador y sus publicaciones.
8. Recargar las pantallas: datos y sesión se conservan.

Fixtures: solicitudes 101/102 abiertas, 103 con acuerdo/pago pendiente, 104 en progreso con pago protegido y 105 completada con pago finalizado y reseña. Sus estados son datos ficticios iniciales, no operaciones financieras ejecutadas por la demo.

## Implementación y alcance

`src/app/demo/demo-engine.ts` concentra operaciones y reglas, con escrituras serializadas y rollback si falla validación/persistencia. `demo-state.ts` contiene modelos y fixtures relacionados. `demo-store.ts` conecta Angular y un interceptor HTTP que responde localmente; nunca llama a `next`, por lo que una operación no soportada devuelve un error visible y no cae al backend real. Se mantienen componentes, rutas principales, guards, estilos y contratos existentes.

Operativos: solicitudes, ofertas de profesionales, búsqueda/filtros, detalle/perfil, direcciones ficticias, propuestas y retiro, selección, quotes/revisiones, aceptación/acuerdo, visita gratuita, pago simulado, inicio/finalización, timeline, reviews/rating, favoritos, mensajes entre ambos roles y reclamos durante protección. Imágenes elegidas por el usuario se guardan como data URLs locales (máximo 1 MB por archivo; sujetas a la cuota del navegador).

No hay WebSocket en el chat del frontend actual: conserva su carga/envío HTTP, respondidos localmente. No hay comunicación entre dispositivos ni sincronización entre pestañas. Cambiar usuario recarga para evitar componentes con el contexto anterior.

## Limitaciones concretas

- No hay cobros, provider lookup, webhook, correo, payouts, liquidación automática ni refunds. Una contratación nueva completada conserva HELD; no se inventa una política de devolución.
- Las visitas pagas siguen sin flujo financiero independiente en el código original: se muestra el error explicativo. Las visitas gratuitas requieren fecha válida y sólo pueden completarse cuando llega la fecha; luego se permite presupuestar.
- Onboarding puede crear un perfil PENDING; no se inventa una aprobación administrativa. Para recorrer el rol profesional usar los trabajadores ficticios ya verificados.
- La pantalla de edición de servicios no existe en el frontend fuente. Su botón explica el límite; crear, activar y desactivar publicaciones sí funcionan. Los enlaces informativos sin pantalla muestran una explicación en lugar de fallar silenciosamente.
- Los mapas/geocodificación/captcha se sustituyen por controles locales explícitos. Coordenadas son ficticias. No se solicita geolocalización real.
- Google Fonts es una dependencia visual opcional heredada, sin claves; si no hay red se usa el fallback tipográfico. Ninguna operación de dominio necesita un servicio externo.
- La información legal/contacto del footer es ficticia; no representa una empresa ni una garantía financiera real.

## Build y validación

```powershell
bun run typecheck
bun run test:demo
bun run test -- --watch=false
bun run lint
bunx eslint src/app/demo src/app/core/services/auth.service.ts src/app/core/services/payment.service.ts
bun run build
```

El lint global conserva incidencias heredadas de accesibilidad/`any`; el código nuevo se verifica por separado. El build conserva avisos de SCSS obsoleto y dos expresiones de template heredadas. En esta copia los budgets reflejan los estilos originales (footer ~40 KB); no se cambió el diseño para lograr compilar.

Ver `VALIDATION.md` para resultados reales y pendientes de navegador.

## Desplegar en Vercel (no ejecutado)

1. Crear, cuando quieras, un repositorio **nuevo** para esta carpeta; no reutilizar el remote de Fixy. No subir node_modules, dist ni archivos .env.
2. Importar ese nuevo repo en Vercel. Framework Angular; raíz del proyecto donde están package.json/vercel.json. Seleccionar Node 24 compatible con el requisito de Angular.
3. Install command: `bun install --frozen-lockfile`.
4. Build command: `bun run build`.
5. Output directory: `dist/fixy-demo/browser`.
6. No agregar variables de backend ni secretos. `vercel.json` contiene fallback SPA para rutas profundas y mantiene las rutas de assets/archivos.
7. Tras publicar por tu cuenta: abrir directamente `/requests/103`, `/payments` y `/conversations`, iniciar sesión y recargar. Los datos son de ese navegador/origen.

La demo usa salida SPA, sin SSR/hydration ni Functions. Bun se usa para instalación/scripts; Angular CLI utiliza Node. Referencias oficiales: [configurar build](https://vercel.com/docs/builds/configure-a-build), [vercel.json](https://vercel.com/docs/project-configuration/vercel-json).

## Guía contextual e Info

El navbar identifica la aplicación como **Fixy (demo)**. La barra superior y las ayudas recuerdan que funciona sin backend.

Cada pantalla principal tiene consejos navegables con Anterior/Siguiente/Entendido. El detalle adapta la ayuda al rol y a los datos locales (propuesta, visita, presupuesto, pago, trabajo y review), sin ejecutar acciones automáticamente. Cerrar la guía persiste por pantalla; Abrir guía permite recuperarla. Restablecer demo elimina también estas preferencias.

`/demo-info`, accesible desde **Info**, explica el recorrido, almacenamiento local, límites de la simulación y responsabilidades del backend real, y enlaza **Fixy README** en https://github.com/youngnicoJava/fixy-readme#readme.

## Publicación estática

Repositorio: https://github.com/youngnicoJava/fixy-demo-frontend

URL de despliegue: https://youngnicoJava.github.io/fixy-demo-frontend/

El workflow de GitHub Pages valida TypeScript, código demo y tests antes de desplegar. El build `production,github-pages` usa base `/fixy-demo-frontend/` y rutas hash (`/#/payments`) para permitir refresh y enlaces profundos sin backend ni reglas de rewrite. Los builds normales/locales y Vercel conservan las rutas habituales. No hay secretos ni variables de entorno para desplegar.

Leaflet puede utilizarse sin HERE; este recorrido usa un selector ficticio para evitar geocodificación o mapas remotos y no pedir ubicación real. Esta decisión afecta sólo a la demo.

## Licencia y relación con Fixy

La elección de licencia de este repositorio está pendiente. El código se publica para mostrar y revisar la demo, pero todavía no se concede una licencia MIT, GPL u otra para reutilizarlo. Un repositorio público sin licencia no debe presentarse como software open source formalmente licenciado.

La licencia que se elija aplicará únicamente al código de esta copia de demostración; no cambia la licencia del backend, Payment ni otros repositorios. Tampoco concede derechos sobre la marca Fixy. Las dependencias conservan sus propias licencias.
