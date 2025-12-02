// app/terminos/page.tsx

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">
          Términos de uso de UnlockMe
        </h1>

        <p className="text-sm text-gray-400 mb-6">
          Este documento es un texto general de referencia y no constituye
          asesoría legal. Te recomendamos revisarlo con un abogado antes de
          lanzar la plataforma al público.
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-gray-200">
          <section>
            <h2 className="text-lg font-semibold mb-2">
              1. Naturaleza del servicio
            </h2>
            <p>
              UnlockMe es una plataforma tecnológica que permite a
              creadores independientes ofrecer acceso a su contenido visual
              a compradores adultos. UnlockMe no produce el contenido,
              no es parte de la relación contractual entre creador y
              comprador, y actúa únicamente como intermediario tecnológico
              y de procesamiento de pagos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              2. Requisitos de edad
            </h2>
            <p>
              El uso de UnlockMe como creador de contenido está
              estrictamente limitado a personas que tengan al menos{" "}
              <strong>18 años cumplidos</strong> (o la mayoría de edad
              legal en su país de residencia, si fuera superior).
            </p>
            <p className="mt-2">
              Al crear una cuenta, declaras bajo protesta de decir verdad
              que eres mayor de edad y que toda persona que aparezca en tu
              contenido también es mayor de edad y participa de forma
              voluntaria y con consentimiento informado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              3. Contenido prohibido
            </h2>
            <p>
              Está terminantemente prohibido subir, compartir, ofrecer o
              promocionar a través de UnlockMe cualquier tipo de contenido
              que:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Involucre <strong>menores de 18 años</strong>, incluso si
                aparentan ser mayores.
              </li>
              <li>
                Muestre violencia extrema, explotación, trata de personas
                o cualquier actividad delictiva.
              </li>
              <li>
                Vulnere derechos de autor, derechos de imagen o
                privacidad de terceros.
              </li>
              <li>
                Haya sido grabado o distribuido sin el consentimiento de
                todas las personas que intervienen.
              </li>
            </ul>
            <p className="mt-2">
              UnlockMe se reserva el derecho de suspender o cerrar
              cuentas, bloquear contenido y, cuando sea legalmente
              necesario, reportar actividades sospechosas a las
              autoridades competentes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              4. Responsabilidad del creador
            </h2>
            <p>
              Cada creador es el único responsable legal de todo el
              contenido que sube a UnlockMe, así como de la descripción,
              el precio y las condiciones que ofrece a sus compradores.
            </p>
            <p className="mt-2">
              Al usar UnlockMe como creador, declaras que:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Posees todos los derechos necesarios sobre el contenido
                que publicas.
              </li>
              <li>
                No infringes derechos de terceros ni leyes aplicables en
                tu país o en el país de tus compradores.
              </li>
              <li>
                Aceptas que tus ingresos dependen de la demanda de tu
                contenido y que UnlockMe no garantiza ventas ni resultados
                económicos de ningún tipo.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              5. Responsabilidad limitada de UnlockMe
            </h2>
            <p>
              UnlockMe no se responsabiliza por:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                El contenido publicado por los creadores, ni por su
                legalidad, exactitud o calidad.
              </li>
              <li>
                El uso que compradores o terceros hagan del contenido una
                vez han obtenido acceso al mismo.
              </li>
              <li>
                Pérdidas económicas indirectas, lucro cesante o daños
                derivados del uso o imposibilidad de uso de la
                plataforma.
              </li>
            </ul>
            <p className="mt-2">
              UnlockMe se compromete a mantener medidas razonables de
              seguridad y a colaborar con las autoridades cuando sea
              requerido, pero no puede garantizar un entorno libre de
              riesgos al 100%.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              6. Pagos, comisiones y retiros
            </h2>
            <p>
              UnlockMe puede cobrar comisiones sobre cada transacción,
              así como ofrecer planes de suscripción para creadores. Las
              comisiones, tarifas y condiciones de pago podrán ser
              modificadas en el futuro y se notificarán a través de la
              plataforma.
            </p>
            <p className="mt-2">
              El procesamiento de pagos se realiza a través de un
              proveedor externo (por ejemplo, Stripe), por lo que los
              plazos, rechazos y revisiones de seguridad pueden depender
              parcialmente de dicho proveedor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              7. Suspensión y cierre de cuentas
            </h2>
            <p>
              UnlockMe podrá suspender o cerrar cuentas de usuario, con o
              sin previo aviso, en caso de:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Incumplimiento de estos Términos de uso.</li>
              <li>Denuncias reiteradas o fundadas de otros usuarios.</li>
              <li>Orden de autoridad competente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              8. Modificación de los términos
            </h2>
            <p>
              UnlockMe podrá actualizar estos Términos de uso en
              cualquier momento. Siempre que se realicen cambios
              relevantes, se mostrará un aviso en la plataforma. El uso
              continuado del servicio después de dichos cambios implica
              la aceptación de la versión actualizada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">
              9. Contacto
            </h2>
            <p>
              Si tienes dudas sobre estos Términos de uso o sobre el
              funcionamiento de la plataforma, puedes escribir a:
            </p>
            <p className="mt-1 text-emerald-300">
              soportemx74@unlockme.app
            </p>
            <p className="mt-2 text-xs text-gray-500">
              (Sustituye este correo por el que vayas a usar
              realmente para soporte legal y atención a usuarios.)
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
