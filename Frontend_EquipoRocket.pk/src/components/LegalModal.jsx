import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const SECTIONS = {
  terms: {
    label: 'Términos y Condiciones',
    content: [
      {
        title: '1. Aceptación de los Términos',
        text: 'Al registrarte y utilizar EquipoRocket.pk ("la Plataforma"), aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar la Plataforma.',
      },
      {
        title: '2. Descripción del Servicio',
        text: 'EquipoRocket.pk es una plataforma web para construir, analizar y simular equipos Pokémon competitivos ("Pokémon Champions"). Ofrecemos herramientas de construcción asistida por IA, simulaciones Monte Carlo, análisis de sinergia y seguimiento de colecciones personales.',
      },
      {
        title: '3. Elegibilidad',
        text: 'Para utilizar la Plataforma debes tener al menos 13 años de edad. Si eres menor de 18 años, debes contar con el consentimiento de tu representante legal. Al registrarte, declaras que cumples con este requisito.',
      },
      {
        title: '4. Cuenta de Usuario',
        text: 'Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Notifica inmediatamente a los administradores cualquier uso no autorizado de tu cuenta. No podemos ser responsables por daños derivados del uso no autorizado de tu cuenta.',
      },
      {
        title: '5. Uso Aceptable',
        text: 'Te comprometes a no utilizar la Plataforma para: (a) cargar contenido ilegal, difamatorio u ofensivo; (b) intentar vulnerar la seguridad del sistema; (c) realizar ingeniería inversa del software; (d) usar la Plataforma con fines comerciales no autorizados; (e) crear cuentas falsas o suplantar identidades.',
      },
      {
        title: '6. Propiedad Intelectual',
        text: 'El software, diseño y contenido original de la Plataforma son propiedad de sus creadores. Pokémon y todos los nombres, personajes e imágenes relacionados son marcas registradas de Nintendo/Game Freak. EquipoRocket.pk es una herramienta de fans sin fines comerciales, no afiliada a Nintendo.',
      },
      {
        title: '7. Limitación de Responsabilidad',
        text: 'La Plataforma se proporciona "tal como está". No garantizamos disponibilidad ininterrumpida ni la exactitud de las simulaciones o recomendaciones. No seremos responsables por daños indirectos derivados del uso o imposibilidad de uso del servicio.',
      },
      {
        title: '8. Modificaciones',
        text: 'Nos reservamos el derecho de modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigencia al ser publicadas en la Plataforma. El uso continuado del servicio implica la aceptación de los nuevos términos.',
      },
      {
        title: '9. Ley Aplicable',
        text: 'Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia será sometida a los tribunales competentes de la ciudad de Santiago de Chile.',
      },
    ],
  },
  privacy: {
    label: 'Política de Privacidad',
    content: [
      {
        title: '1. Responsable del Tratamiento',
        text: 'EquipoRocket.pk es el responsable del tratamiento de sus datos personales, de conformidad con la Ley N° 21.719 sobre Protección de la Vida Privada y de los Datos Personales de la República de Chile ("la Ley"). Para consultas puede contactarnos en: contacto@equiporocket.pk',
      },
      {
        title: '2. Marco Legal Aplicable',
        text: 'El tratamiento de datos personales se realiza en conformidad con la Ley N° 21.719, promulgada el 13 de diciembre de 2024 y publicada en el Diario Oficial. Esta ley establece los principios de licitud, finalidad, proporcionalidad, calidad, seguridad y responsabilidad que rigen nuestro tratamiento de datos.',
      },
      {
        title: '3. Datos Personales Recopilados',
        text: 'Recopilamos: (a) Datos de identificación: nombre de usuario y correo electrónico, al momento del registro. (b) Datos de uso: equipos creados, Pokémon en colección, resultados de simulaciones, preferencias de juego. (c) Datos técnicos: información del dispositivo y registro de accesos, para seguridad del sistema.',
      },
      {
        title: '4. Finalidades del Tratamiento',
        text: 'Sus datos son tratados para: (a) Gestionar su cuenta y autenticación. (b) Prestar los servicios de construcción y simulación de equipos. (c) Mejorar el servicio mediante análisis estadísticos anonimizados. (d) Enviar notificaciones relacionadas con el servicio (no publicidad). (e) Cumplir obligaciones legales.',
      },
      {
        title: '5. Base de Licitud',
        text: 'El tratamiento de sus datos se basa en: (a) Su consentimiento, otorgado al aceptar estos términos al registrarse (art. 12 Ley N° 21.719). (b) La ejecución del contrato de prestación de servicios. (c) El interés legítimo para la seguridad y mejora del servicio.',
      },
      {
        title: '6. Derechos del Titular (Art. 4 y siguientes, Ley N° 21.719)',
        text: 'Como titular de datos personales, usted tiene derecho a: ACCESO: solicitar confirmación de si tratamos sus datos y obtener una copia. RECTIFICACIÓN: corregir datos inexactos o incompletos. SUPRESIÓN: solicitar la eliminación de sus datos cuando ya no sean necesarios. OPOSICIÓN: oponerse al tratamiento de sus datos en determinadas circunstancias. PORTABILIDAD: recibir sus datos en formato estructurado y legible por máquina. BLOQUEO: solicitar la suspensión temporal del tratamiento. Para ejercer cualquiera de estos derechos, diríjase a: contacto@equiporocket.pk. Responderemos dentro de los plazos establecidos por la Ley.',
      },
      {
        title: '7. Seguridad de los Datos',
        text: 'Implementamos medidas técnicas y organizativas para proteger sus datos personales contra accesos no autorizados, pérdida o destrucción, de conformidad con el art. 14 quáter de la Ley N° 21.719. Las contraseñas se almacenan con hash criptográfico (bcrypt). La comunicación se realiza mediante protocolos seguros. En caso de vulneración de seguridad que afecte sus datos, le notificaremos en los plazos que establece la Ley.',
      },
      {
        title: '8. Conservación de los Datos',
        text: 'Sus datos se conservan mientras mantenga su cuenta activa o mientras sea necesario para prestar el servicio. Al solicitar la eliminación de su cuenta, sus datos personales identificables serán suprimidos dentro de los 30 días siguientes, salvo que deban conservarse por obligación legal.',
      },
      {
        title: '9. Transferencias Internacionales',
        text: 'Podemos utilizar servicios de terceros (como alojamiento en la nube) que impliquen transferencia internacional de datos. En tales casos, garantizamos que los destinatarios ofrezcan niveles de protección adecuados, conforme al art. 26 de la Ley N° 21.719.',
      },
      {
        title: '10. Cookies y Almacenamiento Local',
        text: 'Utilizamos localStorage del navegador para mantener su sesión (token JWT) y preferencias de la aplicación. No utilizamos cookies de seguimiento ni publicidad comportamental.',
      },
      {
        title: '11. Autoridad de Control',
        text: 'De conformidad con la Ley N° 21.719, la autoridad de control competente es la Agencia de Protección de Datos Personales de Chile. Si considera que sus derechos han sido vulnerados, puede presentar un reclamo ante dicha institución.',
      },
      {
        title: '12. Actualizaciones de esta Política',
        text: 'Podemos actualizar esta Política de Privacidad para reflejar cambios legales o en el servicio. Las modificaciones relevantes serán notificadas por correo electrónico o mediante aviso en la Plataforma, con al menos 15 días de anticipación.',
      },
    ],
  },
};

export default function LegalModal({ open, initialTab = 'terms', onClose }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const section = SECTIONS[tab];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--color-pk-bg)', border: '1px solid var(--color-pk-border)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--color-pk-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, letterSpacing: '0.04em' }}>Información Legal</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-pk-muted)' }}>EquipoRocket.pk — Ley N° 21.719 · Chile</p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)', flexShrink: 0 }}
            >
              <FaTimes />
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {Object.entries(SECTIONS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  borderBottom: tab === key ? '2px solid var(--color-pk-red)' : '2px solid transparent',
                  background: tab === key ? 'var(--color-pk-surface)' : 'transparent',
                  color: tab === key ? 'var(--color-pk-text)' : 'var(--color-pk-muted)',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {section.content.map((item, i) => (
              <div key={i}>
                <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: 'var(--color-pk-red-light)', letterSpacing: '0.02em' }}>
                  {item.title}
                </h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--color-pk-subtle)' }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Law badge */}
          <div style={{ marginTop: 28, padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20, flexShrink: 0 }}>⚖️</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12, color: 'var(--color-pk-red-light)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Marco Legal</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-pk-muted)', lineHeight: 1.6 }}>
                Esta plataforma cumple con la <strong style={{ color: 'var(--color-pk-subtle)' }}>Ley N° 21.719</strong> sobre Protección de la Vida Privada y de los Datos Personales de Chile, promulgada el 13 de diciembre de 2024. Última actualización de este documento: julio 2026.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
