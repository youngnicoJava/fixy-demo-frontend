import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { DemoStore } from './demo-store';
import { AuthService } from '../core/services/auth.service';
@Component({
  selector: 'app-demo-info',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CurrencyPipe],
  template: `<section class="fx-card demo-info">
    <p class="fx-eyebrow">Demo interactiva</p>
    @if (worker) {
      <h1>{{ worker.fullName }}</h1>
      <p>{{ worker.description }}</p>
      <p>Verificación: {{ worker.status }} · Rating: {{ worker.rating ?? 'Sin reseñas' }}</p>
      <p>{{ worker.categories.join(' · ') }}</p>
      @for (offering of offerings; track offering.id) {
        <p>
          <a [routerLink]="['/services', offering.id]">{{ offering.title }}</a> —
          {{ offering.basePrice | currency: 'ARS' }}
        </p>
      }
    } @else {
      <h1>Fixy: demo interactiva sin backend</h1>
      <p>
        Fixy conecta personas que necesitan resolver un problema con profesionales de distintos
        oficios. Esta versión de portfolio permite recorrer el producto y probar ambos lados de una
        contratación, sin servicios de backend conectados.
      </p>
      <h2>Cómo probarlo</h2>
      <ol>
        <li>
          Entrá como cliente con el botón superior y publicá una solicitud desde tu dashboard.
        </li>
        <li>Cambiá a trabajador, buscá la solicitud y enviá una propuesta.</li>
        <li>Volvé al cliente y seleccioná al profesional. Coordiná por chat si hace falta.</li>
        <li>
          Como trabajador, enviá un presupuesto estructurado. Como cliente, aceptalo para registrar
          el acuerdo.
        </li>
        <li>Confirmá un pago simulado como cliente; luego iniciá el trabajo como profesional.</li>
        <li>
          Confirmá la finalización como cliente y dejá una review para ver la actualización del
          rating.
        </li>
      </ol>
      <p>
        La guía de cada pantalla explica sus controles y el siguiente paso. Podés cerrarla o volver
        a abrirla. También hay contrataciones de ejemplo para explorar distintas etapas sin empezar
        desde cero.
      </p>
      <h2>Qué ocurre en esta demo</h2>
      <p>
        Un motor local simula las respuestas de la API. Solicitudes, propuestas, presupuestos,
        acuerdos, mensajes, reviews y sesión se guardan en el almacenamiento de este navegador.
        Recargar conserva los cambios; Restablecer demo recupera los ejemplos iniciales.
      </p>
      <p>
        <strong
          >No hay Spring, Go, PostgreSQL ni Kafka conectados. No hay cobros de Mercado Pago ni
          dinero real.</strong
        >
        No ingreses datos personales, documentos ni contraseñas reales. Los usuarios de ejemplo son
        ficticios y el registro local no ofrece seguridad de autenticación de servidor.
      </p>
      <h2>Cómo funciona Fixy con backend</h2>
      <p>
        El frontend Angular se comunica con la API de Spring Boot. El backend autentica, verifica
        permisos y reglas del dominio, y persiste los datos en PostgreSQL. Las reglas no dependen de
        que un botón esté visible en el frontend.
      </p>
      <p>
        El recorrido de contratación es solicitud → propuesta y selección del profesional →
        presupuesto aceptado → acuerdo → pago → trabajo → finalización → protección → review. Un
        anuncio del profesional permite descubrirlo y contactarlo; no crea automáticamente una
        contratación ni un pago.
      </p>
      <p>
        El presupuesto registra alcance, mano de obra y materiales. El acuerdo conserva lo aceptado:
        el precio no se obtiene del texto libre del chat. Si hace falta una visita técnica, se
        coordina antes de presupuestar el trabajo.
      </p>
      <p>
        La integración de pagos existente usa Checkout Pro de Mercado Pago y un servicio de Payment.
        En la implementación real, el proveedor y las validaciones del backend determinan la
        confirmación del pago; la URL de retorno por sí sola no prueba que se haya cobrado.
      </p>
      <p>
        Garantía Fixy distingue trabajo completado de dinero liquidado: un pago puede seguir
        protegido en HELD después de la finalización. Una disputa puede impedir su liquidación. Esta
        demo representa esa protección, pero no ejecuta settlement, retiros, refunds ni payouts. La
        integración financiera sigue en desarrollo; no se presenta como un servicio productivo
        terminado.
      </p>
      <h2>Documentación del proyecto</h2>
      <p>El README del repositorio describe el sistema real y su contexto técnico.</p>
      <a
        class="fx-button primary"
        href="https://github.com/youngnicoJava/fixy-readme#readme"
        target="_blank"
        rel="noopener noreferrer"
        >Fixy README ↗</a
      >
    }
    <p>
      Los pagos son simulados. Completar un trabajo inicia la protección y conserva HELD; esta demo
      no ejecuta liquidaciones, retiros ni devoluciones. Las visitas pagas y la aprobación
      administrativa de profesionales no están disponibles.
    </p>
    <a class="fx-button secondary" routerLink="/home">Volver a Fixy</a>
  </section>`,
  styleUrl: './demo-info.scss',
})
export class DemoInfoComponent {
  private store = inject(DemoStore);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  readonly worker = this.route.snapshot.paramMap.get('id')
    ? this.store.state.workers.find((w) => w.id === Number(this.route.snapshot.paramMap.get('id')))
    : this.route.snapshot.routeConfig?.path === 'worker/profile'
      ? this.store.state.workers.find((w) => w.userId === this.auth.currentUser()?.id)
      : null;
  readonly offerings = this.store.state.offerings.filter(
    (o) => o.workerId === this.worker?.id && o.active,
  );
}
