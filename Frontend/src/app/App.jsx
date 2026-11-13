import { useEffect, useState } from 'react';
import fotoFarmaciaAtencion from '../assets/farmacia-atencion.jpg';
import fotoHospitalPrincipal from '../assets/hospital-principal.jpg';
import AccesoSuperusuario from '../features/autenticacion/AccesoSuperusuario';
import TableroEstadisticas from '../features/estadisticas/TableroEstadisticas';
import ExploracionMedicamentos from '../features/exploracion/ExploracionMedicamentos';
import api, { API_BASE_URL, setAuthToken, validarTokenSuperusuario } from '../shared/api';
import {
  IconoBusquedaMedica,
  IconoCruzHospital,
  IconoDocumentoPDF,
  IconoEscudoConfianza,
  IconoEstadistica,
  IconoHospital,
  IconoMedicamento,
  IconoUbicacion,
} from '../shared/IconosSalud';

const STORAGE_TOKEN_KEY = 'medicamentos_superusuario_token';
const STORAGE_USER_KEY = 'medicamentos_superusuario_nombre';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY) || '');
  const [usuario, setUsuario] = useState(() => localStorage.getItem(STORAGE_USER_KEY) || '');
  const [superusuarioVerificado, setSuperusuarioVerificado] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(() =>
    Boolean(localStorage.getItem(STORAGE_TOKEN_KEY))
  );

  const [opcionesFiltros, setOpcionesFiltros] = useState({
    principios_activos: [],
    formas_farmaceuticas: [],
    laboratorios: [],
    entidades_compradoras: [],
    anios: [],
  });
  const [recargaDatos, setRecargaDatos] = useState(0);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    if (!token || superusuarioVerificado) {
      return;
    }

    let cancelado = false;
    validarTokenSuperusuario(token)
      .then((response) => {
        if (cancelado) return;
        if (response.data?.es_superusuario) {
          setUsuario(response.data.usuario);
          setSuperusuarioVerificado(true);
        } else {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          localStorage.removeItem(STORAGE_USER_KEY);
          setAuthToken('');
          setToken('');
          setUsuario('');
          setSuperusuarioVerificado(false);
        }
      })
      .catch(() => {
        if (cancelado) return;
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        setAuthToken('');
        setToken('');
        setUsuario('');
        setSuperusuarioVerificado(false);
      })
      .finally(() => {
        if (!cancelado) setVerificandoSesion(false);
      });

    return () => {
      cancelado = true;
    };
  }, [token, superusuarioVerificado]);

  useEffect(() => {
    if (!superusuarioVerificado) return;

    let cancelado = false;
    api
      .get('api/filtros/')
      .then((response) => {
        if (!cancelado) setOpcionesFiltros(response.data);
      })
      .catch((err) => console.error('Error al cargar opciones de filtros:', err));

    return () => {
      cancelado = true;
    };
  }, [superusuarioVerificado, recargaDatos]);

  const manejarAccesoAutorizado = (nuevoToken, nombreUsuario) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, nuevoToken);
    localStorage.setItem(STORAGE_USER_KEY, nombreUsuario);
    setAuthToken(nuevoToken);
    setToken(nuevoToken);
    setUsuario(nombreUsuario);
    setSuperusuarioVerificado(true);
    setVerificandoSesion(false);
  };

  const manejarCerrarSesion = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setAuthToken('');
    setToken('');
    setUsuario('');
    setSuperusuarioVerificado(false);
    setVerificandoSesion(false);
  };

  const descargarPDF = async (filtros = {}) => {
    try {
      const response = await api.get('api/exportar-pdf/', {
        params: filtros,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_auditoria.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al descargar el PDF:', error);
    }
  };

  if (verificandoSesion) {
    return (
      <div className="pantalla-acceso-superusuario">
        <div className="tarjeta-acceso-superusuario tarjeta-verificacion-sesion">
          <span className="emblema-cruz-salud" style={{ margin: '0 auto 12px' }}>
            <IconoCruzHospital size={24} />
          </span>
          <p className="texto-verificando">Verificando credenciales de acceso...</p>
        </div>
      </div>
    );
  }

  if (!superusuarioVerificado) {
    return <AccesoSuperusuario onAccesoAutorizado={manejarAccesoAutorizado} />;
  }

  const totalPrincipios = (opcionesFiltros.principios_activos || []).length;
  const totalFormas = (opcionesFiltros.formas_farmaceuticas || []).length;
  const totalLaboratorios = (opcionesFiltros.laboratorios || []).length;
  const totalEntidades = (opcionesFiltros.entidades_compradoras || []).length;
  const muestraEntidades = (opcionesFiltros.entidades_compradoras || []).slice(0, 6);
  const muestraFormas = (opcionesFiltros.formas_farmaceuticas || []).slice(0, 6);

  return (
    <div className="contenedor-app">
      <header className="encabezado-hospital">
        <div className="barra-informativa-superior">
          <div className="barra-informativa-interna">
            <span>
              <IconoUbicacion size={15} /> Sogamoso, Boyacá, Colombia · Transparencia Farmacéutica
            </span>
            <span>
              <IconoEscudoConfianza size={15} /> Sesión activa: <strong>{usuario}</strong>
            </span>
          </div>
        </div>

        <div className="encabezado-interno">
          <a href="#inicio" className="identidad-hospital">
            <span className="emblema-cruz-salud">
              <IconoCruzHospital size={26} />
            </span>
            <div>
              <span className="eyebrow-salud">Gestión y Auditoría Farmacéutica</span>
              <span className="titulo-hospital">Precios y Compras de Medicamentos</span>
            </div>
          </a>

          <nav className="navegacion-hospital" aria-label="Navegación principal">
            <a href="#inicio">Inicio</a>
            <a href="#exploracion">Medicamentos</a>
            <a href="#estadisticas">Estadísticas</a>
            <a href="#institucion">Institución y Contacto</a>
          </nav>

          <div className="acciones-encabezado">
            <button type="button" className="boton boton-primario" onClick={() => descargarPDF()}>
              <IconoDocumentoPDF size={17} />
              Descargar PDF
            </button>
            <button type="button" className="boton boton-cerrar-sesion" onClick={manejarCerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="contenido-principal">
        <section id="inicio" className="seccion-hero-hospital">
          <div className="hero-hospital-grid">
            <div className="hero-hospital-texto">
              <span className="eyebrow-salud">Información clara para el sector salud</span>
              <h1>Consulta transparente de precios y abastecimiento de medicamentos</h1>
              <p className="hero-hospital-descripcion">
                Espacio diseñado para pacientes, familiares y equipos de auditoría hospitalaria que necesitan verificar precios unitarios, volúmenes adquiridos y generar reportes oficiales de manera sencilla, ordenada y confiable.
              </p>
              <div className="hero-hospital-acciones">
                <a href="#exploracion" className="boton boton-primario boton-grande">
                  <IconoBusquedaMedica size={18} />
                  Consultar medicamentos
                </a>
                <a href="#estadisticas" className="boton boton-secundario boton-grande">
                  <IconoEstadistica size={18} />
                  Ver análisis de precios
                </a>
              </div>
            </div>

            <figure className="hero-hospital-fotografia">
              <img
                src={fotoHospitalPrincipal}
                alt="Profesional de salud brindando orientación clara y amable sobre documentación médica en recepción hospitalaria"
              />
              <figcaption>
                Atención y registro organizado de medicamentos para facilitar la lectura a cualquier usuario.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="banda-accesos-rapidos" aria-label="Accesos rápidos del portal">
          <div className="contenedor-seccion">
            <div className="rejilla-accesos-rapidos">
              <a href="#exploracion" className="enlace-acceso-rapido">
                <span className="icono-acceso-rapido">
                  <IconoBusquedaMedica size={22} />
                </span>
                <div>
                  <strong>Buscar medicamentos</strong>
                  <span>Filtra por principio activo, laboratorio, forma farmacéutica o año.</span>
                </div>
              </a>

              <a href="#estadisticas" className="enlace-acceso-rapido">
                <span className="icono-acceso-rapido">
                  <IconoEstadistica size={22} />
                </span>
                <div>
                  <strong>Estadísticas del segmento</strong>
                  <span>Consulta promedios, precios máximos y volumen total comprado.</span>
                </div>
              </a>

              <button
                type="button"
                className="enlace-acceso-rapido enlace-acceso-boton"
                onClick={() => descargarPDF()}
              >
                <span className="icono-acceso-rapido">
                  <IconoDocumentoPDF size={22} />
                </span>
                <div>
                  <strong>Exportar reporte PDF</strong>
                  <span>Genera un documento oficial listo para revisión o archivo.</span>
                </div>
              </button>

              <a href="#institucion" className="enlace-acceso-rapido">
                <span className="icono-acceso-rapido">
                  <IconoHospital size={22} />
                </span>
                <div>
                  <strong>Entidades e información</strong>
                  <span>Conoce las instituciones incluidas y cómo usar este portal.</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        <section className="banda-blanca">
          <div className="contenedor-seccion">
            <ExploracionMedicamentos
              opcionesFiltros={opcionesFiltros}
              onExportarPdf={descargarPDF}
              recargaDatos={recargaDatos}
              onDatosImportados={() => setRecargaDatos((prev) => prev + 1)}
            />
          </div>
        </section>

        <section className="banda-suave">
          <div className="contenedor-seccion">
            <TableroEstadisticas opcionesFiltros={opcionesFiltros} recargaDatos={recargaDatos} />
          </div>
        </section>

        <section id="institucion" className="banda-blanca">
          <div className="contenedor-seccion seccion-institucional">
            <div className="institucional-grid">
              <figure className="institucional-fotografia">
                <img
                  src={fotoFarmaciaAtencion}
                  alt="Especialista de farmacia hospitalaria verificando existencias y presentaciones de medicamentos"
                />
              </figure>

              <div className="institucional-contenido">
                <span className="eyebrow-salud">Sobre la plataforma y orientación al usuario</span>
                <h2>Cobertura de catálogo, atención a usuarios y datos institucionales</h2>
                <p>
                  Este sistema centraliza los registros de compras farmacéuticas almacenados en PostgreSQL para ofrecer búsquedas claras, cifras verificables y documentos PDF sin pasos técnicos complejos.
                </p>

                <div className="lista-cobertura-real">
                  <div className="dato-cobertura-real">
                    <span className="numero-cobertura">{totalPrincipios}</span>
                    <span>Principios activos en catálogo</span>
                  </div>
                  <div className="dato-cobertura-real">
                    <span className="numero-cobertura">{totalFormas}</span>
                    <span>Formas farmacéuticas</span>
                  </div>
                  <div className="dato-cobertura-real">
                    <span className="numero-cobertura">{totalLaboratorios}</span>
                    <span>Laboratorios farmacéuticos</span>
                  </div>
                  <div className="dato-cobertura-real">
                    <span className="numero-cobertura">{totalEntidades}</span>
                    <span>Entidades del sector salud</span>
                  </div>
                </div>

                {muestraFormas.length > 0 && (
                  <div className="bloque-info-institucional">
                    <h3>
                      <IconoMedicamento size={18} /> Presentaciones farmacéuticas registradas en el sistema
                    </h3>
                    <p className="texto-listado-simple">
                      {muestraFormas.join(' · ')}
                      {totalFormas > muestraFormas.length ? ` y ${totalFormas - muestraFormas.length} más disponibles en los filtros.` : '.'}
                    </p>
                  </div>
                )}

                {muestraEntidades.length > 0 && (
                  <div className="bloque-info-institucional">
                    <h3>
                      <IconoHospital size={18} /> Entidades compradoras incluidas en la consulta
                    </h3>
                    <p className="texto-listado-simple">
                      {muestraEntidades.join(' · ')}
                      {totalEntidades > muestraEntidades.length ? ` y ${totalEntidades - muestraEntidades.length} instituciones adicionales.` : '.'}
                    </p>
                  </div>
                )}

                <div className="bloque-info-institucional bloque-orientacion">
                  <h3>Orientación para pacientes, familiares y auditores</h3>
                  <ul className="lista-orientacion">
                    <li>Escribe el nombre del medicamento o laboratorio en el buscador superior y pulsa <strong>Buscar</strong>.</li>
                    <li>Si prefieres letras y listados más amplios, puedes cambiar el tamaño de página entre 10, 20 o 50 registros.</li>
                    <li>Usa <strong>Exportar PDF filtrado</strong> para guardar únicamente los medicamentos que coincidan con tu consulta.</li>
                  </ul>
                </div>

                <div className="datos-contacto-reales">
                  <p>
                    <IconoUbicacion size={17} />
                    <span><strong>Ubicación del proyecto:</strong> Sogamoso, Boyacá, Colombia</span>
                  </p>
                  <p>
                    <IconoEscudoConfianza size={17} />
                    <span><strong>Responsable de desarrollo:</strong> Johan Salazar Lopez · Tecnólogo en Análisis y Desarrollo de Software (ADSO) - SENA (Ficha 3171062)</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="pie-pagina">
        <div className="pie-pagina-interno">
          <div className="pie-identidad">
            <div className="pie-logo">
              <IconoCruzHospital size={22} />
              <strong>Precios y Compras de Medicamentos</strong>
            </div>
            <p>
              Sistema institucional de consulta paginada, estadísticas dinámicas y exportación de reportes PDF para auditoría farmacéutica.
            </p>
          </div>

          <div className="pie-enlaces">
            <strong>Navegación</strong>
            <a href="#inicio">Inicio</a>
            <a href="#exploracion">Consulta de medicamentos</a>
            <a href="#estadisticas">Estadísticas en vivo</a>
            <a href="#institucion">Información institucional</a>
          </div>

          <div className="pie-meta">
            <strong>Datos del proyecto</strong>
            <p>Johan Salazar Lopez · ADSO SENA (Ficha 3171062)</p>
            <p>Sogamoso, Boyacá, Colombia</p>
            <p className="pie-servidor">API conectada: <code>{API_BASE_URL}</code></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
