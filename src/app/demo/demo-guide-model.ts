import { DemoState } from './demo-state';
export interface GuideStep {
  title: string;
  text: string;
}
export interface PageGuide {
  key: string;
  title: string;
  steps: GuideStep[];
}
const step = (title: string, text: string): GuideStep => ({ title, text });
export function pageGuide(url: string, state: DemoState): PageGuide {
  const path = url.split(/[?#]/)[0];
  const user = state.users.find((u) => u.id === state.sessionId);
  const worker = user?.role === 'WORKER';
  let key = path;
  let title = 'Explorá Fixy';
  let steps = [
    step(
      'Todo es una demostración',
      'No hay backend conectado. Los usuarios, mensajes y pagos son ficticios y se guardan en este navegador.',
    ),
    step(
      'Elegí un recorrido',
      'Usá Entrar como cliente o Entrar como trabajador arriba. Podés cambiar de rol para probar ambos lados de una contratación.',
    ),
  ];
  if (/^\/requests\/\d+$/.test(path)) {
    key = 'request-detail';
    title = 'Tu contratación, paso a paso';
    const id = Number(path.split('/').at(-1));
    const request = state.requests.find((r) => r.id === id);
    const contract = state.contracts[id];
    const payment = state.payments.find((p) => p.serviceRequestId === id);
    if (!request)
      steps = [
        step(
          'Abrí una solicitud disponible',
          'Usá tu dashboard o el listado de solicitudes. Algunas contrataciones sólo son visibles para sus participantes.',
        ),
      ];
    else if (request.status === 'OPEN')
      steps = worker
        ? [
            step(
              'Evaluá el trabajo',
              'Leé la descripción, categoría y ubicación antes de enviar una propuesta.',
            ),
            step(
              'Enviá tu propuesta',
              'Indicá alcance e importe orientativo. Si requiere visita, marcala. El cliente debe seleccionarte antes del presupuesto negociado.',
            ),
          ]
        : [
            step(
              'Compará propuestas',
              'Las propuestas aparecen en esta pantalla. Si aún no hay ninguna, cambiá al trabajador y enviá una en esta solicitud.',
            ),
            step(
              'Seleccioná al profesional',
              'Aceptá una propuesta. Esto selecciona al trabajador y habilita la coordinación. Un precio definitivo puede generar el acuerdo directamente.',
            ),
          ];
    else if (request.status === 'COMPLETED')
      steps = [
        step(
          'Trabajo completado ≠ dinero liquidado',
          'El pago protegido permanece HELD durante el período de protección. Esta demo no ejecuta liquidaciones ni retiros.',
        ),
        step(
          'Dejá una reseña',
          'Como cliente, completá una única review con puntuación de 1 a 5. Verás el rating actualizado del profesional. Si ya existe, podés consultarla.',
        ),
      ];
    else if (request.status === 'IN_PROGRESS')
      steps = [
        step(
          'El trabajo está en curso',
          'Usá el chat para coordinar. No confundas los comentarios públicos con la conversación privada.',
        ),
        step(
          'Confirmá la finalización como cliente',
          'Cuando el trabajo esté terminado, usá Confirmar finalización. El pago debe estar confirmado; la protección comienza al completar.',
        ),
      ];
    else if (request.status === 'DISPUTED')
      steps = [
        step(
          'Hay un reclamo activo',
          'Consultá el reclamo de esta contratación. No hay resolución administrativa ni movimientos financieros reales en esta demo.',
        ),
      ];
    else if (request.status !== 'MATCHED')
      steps = [
        step(
          'Consultá el historial',
          'Esta solicitud ya no está en la etapa de selección. Revisá su estado y los eventos; no todas las acciones están disponibles en estados finales.',
        ),
      ];
    else if (contract?.visit && contract.visit.status !== 'COMPLETED')
      steps = [
        step(
          'Primero, la visita técnica',
          'El profesional debe coordinar y registrar la visita antes del presupuesto del trabajo. La demo permite visitas gratuitas, no cobros de diagnóstico.',
        ),
        step(
          'Después, el presupuesto',
          'Una vez completada la visita, cambiá al trabajador para enviar el presupuesto estructurado.',
        ),
      ];
    else if (!contract?.agreement)
      steps = worker
        ? [
            step(
              'Prepará el presupuesto',
              'En Acuerdo y pago, completá mano de obra, materiales y alcance. El total se calcula con esos importes, nunca con texto del chat.',
            ),
            step(
              'Esperá la decisión del cliente',
              'Cambiá al cliente para aceptar o rechazar. El presupuesto aceptado queda registrado como acuerdo y no se modifica silenciosamente.',
            ),
          ]
        : [
            step(
              'Revisá el presupuesto',
              'En Acuerdo y pago, compará alcance, mano de obra, materiales y total. Si todavía no existe, cambiá al trabajador para enviarlo.',
            ),
            step(
              'Aceptá sólo si estás de acuerdo',
              'Aceptar registra el acuerdo y habilita el pago simulado. El chat sirve para negociar; no reemplaza el presupuesto.',
            ),
          ];
    else if (payment?.status === 'HELD')
      steps = [
        step('Pago protegido', 'El acuerdo tiene un pago HELD simulado. No se movió dinero real.'),
        step(
          'Iniciá el trabajo como profesional',
          'Usá la acción de iniciar; después cambiá al cliente para confirmar la finalización y dejar una review.',
        ),
      ];
    else
      steps = [
        step(
          'Ya hay un acuerdo',
          'Revisá el alcance y el importe aceptados. La contratación, no el chat ni el anuncio, determina lo que se paga.',
        ),
        step(
          worker ? 'El cliente confirma el pago' : 'Simulá el pago',
          worker
            ? 'Cambiá al cliente y usá Pagar contratación. Luego volvé como trabajador para iniciar.'
            : 'Usá Pagar contratación y confirmá el diálogo de simulación. El pago pasa a HELD localmente; no se abre Mercado Pago ni se cobra dinero.',
        ),
      ];
  } else if (path === '/requests/new' || path === '/requests/publish') {
    title = 'Publicá una necesidad';
    steps = [
      step(
        'Describí el problema',
        'Completá título, descripción y categoría. La dirección de esta demo es ficticia; no ingreses datos personales reales.',
      ),
      step(
        'Revisá y publicá',
        'Continuar lleva a la confirmación. Después de publicar, cambiá al trabajador para encontrar tu solicitud y enviar una propuesta.',
      ),
    ];
  } else if (path === '/requests/open') {
    title = 'Encontrá oportunidades';
    steps = [
      step(
        'Elegí una solicitud abierta',
        'Como trabajador verificado, revisá trabajos de tus categorías. Abrí uno para conocer el alcance.',
      ),
      step(
        'Proponé una solución',
        'En el detalle podés enviar una propuesta. El cliente la evalúa y selecciona al profesional; verla no te asigna el trabajo.',
      ),
    ];
  } else if (path === '/requests/my') {
    title = 'Seguí tus solicitudes';
    steps = [
      step(
        'Abrí una contratación',
        'Cada solicitud muestra su estado. Entrá al detalle para gestionar propuestas, presupuesto, pago y progreso.',
      ),
      step(
        'Probá distintas etapas',
        'Los ejemplos iniciales incluyen acuerdo pendiente de pago, trabajo en curso y trabajo completado. Tus nuevas solicitudes se conservan al recargar.',
      ),
    ];
  } else if (path.startsWith('/dashboard')) {
    title = worker ? 'Tu panel profesional' : 'Tu panel de cliente';
    steps = worker
      ? [
          step(
            'Buscá oportunidades',
            'Entrá a solicitudes abiertas y enviá propuestas compatibles con tus categorías.',
          ),
          step(
            'Gestioná tus trabajos',
            'Abrí las solicitudes donde te seleccionaron para presupuestar e iniciar tras el pago. Tus servicios publicados son anuncios, no pagos.',
          ),
          step(
            'Probá el otro lado',
            'Cambiá al cliente arriba para aceptar tu propuesta y presupuesto. El cambio de rol no borra la contratación.',
          ),
        ]
      : [
          step(
            'Publicá o retomá',
            'Creá una solicitud o abrí una de tus contrataciones. Desde su detalle se gestiona todo el recorrido.',
          ),
          step(
            'Propuestas → acuerdo → pago',
            'Seleccioná al profesional, aceptá el presupuesto y confirmá un pago simulado. Podés consultar los pagos sin abrir el chat.',
          ),
        ];
  } else if (path.startsWith('/conversations')) {
    title = 'Coordiná por chat';
    steps = [
      step(
        'Elegí el contacto',
        'La lista y el encabezado muestran al otro participante. Un chat de anuncio sirve para consultar; no crea un pago.',
      ),
      step(
        'Enviá un mensaje y cambiá de rol',
        'Escribí, enviá y entrá como el otro participante para leerlo y responder. Los mensajes quedan guardados localmente.',
      ),
      step(
        'El chat no es el contrato',
        'En una conversación de solicitud, usá el contexto comercial para volver a la contratación. El presupuesto y acuerdo estructurados fijan el importe.',
      ),
    ];
  } else if (path === '/payments') {
    title = 'Entendé tus pagos';
    steps = [
      step(
        'Cada contratación tiene su pago',
        'Pendientes espera confirmación; Protegidos corresponde a HELD. Los ejemplos finalizados son datos ficticios.',
      ),
      step(
        'Probá un pago pendiente',
        'Abrí la contratación o usá su acción de pago. Confirmar simula la reserva y actualiza el estado; cancelar no confirma el pago.',
      ),
      step(
        'No hay cobros reales',
        'No se usa Mercado Pago, no se liquidan fondos ni se ejecutan refunds o payouts. Recargar mantiene la simulación.',
      ),
    ];
  } else if (path === '/worker/services/new') {
    title = 'Publicá tu servicio';
    steps = [
      step(
        'Presentá lo que ofrecés',
        'Completá categoría, descripción y precio orientativo. Usá sólo imágenes y datos de prueba.',
      ),
      step(
        'Un anuncio no es una contratación',
        'Publicar permite descubrir tu servicio y contactarte. El cliente debe tener una contratación y acuerdo para llegar a un pago.',
      ),
    ];
  } else if (path.startsWith('/services/') || path === '/service-offerings') {
    title = 'Descubrí profesionales';
    steps = [
      step(
        'Explorá los anuncios',
        'Filtrá por categoría y abrí un servicio para ver descripción, precio orientativo y profesional.',
      ),
      step(
        'Guardá o consultá',
        'Como cliente, guardá favoritos o contactá al trabajador. Abrir un chat desde un anuncio no crea ni cobra una contratación.',
      ),
    ];
  } else if (path === '/favorites') {
    title = 'Tus favoritos';
    steps = [
      step(
        'Guardá servicios que te interesan',
        'Usá el corazón en los anuncios. Los favoritos pertenecen al usuario de demo activo.',
      ),
      step(
        'Retomá después',
        'Abrí un favorito para consultar al profesional. Guardarlo no reserva trabajo ni crea un pago.',
      ),
    ];
  } else if (path === '/login' || path === '/register') {
    title = 'Elegí tu identidad de prueba';
    steps = [
      step(
        'Acceso rápido',
        'Usá los botones superiores para entrar con el cliente o trabajador ficticios. También podés usar las cuentas indicadas en login.',
      ),
      step(
        'Registro local',
        'Podés crear un usuario de prueba. No uses tu contraseña habitual ni datos reales: no hay autenticación de servidor. Para probar propuestas usá el trabajador ya verificado.',
      ),
    ];
  } else if (path.startsWith('/become-worker')) {
    title = 'Conocé el alta profesional';
    steps = [
      step(
        'Requisitos del profesional',
        'Leé la información y completá datos ficticios si probás el formulario. No cargues documentación personal real.',
      ),
      step(
        'Verificación de demo',
        'El alta queda pendiente. No se simula una aprobación administrativa: usá Entrar como trabajador para el recorrido con un profesional verificado.',
      ),
    ];
  } else if (path.startsWith('/workers/') || path === '/worker/profile') {
    title = 'Conocé al profesional';
    steps = [
      step(
        'Perfil y reputación',
        'Consultá categorías, publicaciones y rating. Las reviews de contrataciones completadas actualizan la reputación en la demo.',
      ),
    ];
  } else if (path === '/demo-info') {
    title = 'Cómo probar el producto';
    steps = [
      step(
        'Leé el alcance',
        'Esta página explica la simulación, la arquitectura real y los límites. El enlace al README abre la documentación del repositorio.',
      ),
      step(
        'Retomá el recorrido',
        'Volvé a Inicio, elegí cliente y publicá una solicitud. La guía de cada pantalla te explica el siguiente paso.',
      ),
    ];
  } else if (path === '/home') {
    steps = [
      step(
        'Empezá como cliente',
        'Usá Entrar como cliente arriba. Explorá anuncios o entrá al dashboard para publicar una necesidad.',
      ),
      step(
        'Probá ambos participantes',
        'Enviá una propuesta como trabajador y aceptala como cliente. El cambio de rol conserva todos los datos.',
      ),
      step(
        'Volvé al inicio cuando quieras',
        'Restablecer demo recupera los ejemplos iniciales. Info explica el alcance y enlaza el README de Fixy.',
      ),
    ];
  }
  return { key, title, steps };
}
