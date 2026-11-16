import { useEffect, useState } from 'react';
import fotoFarmaciaAtencion from '../assets/farmacia-atencion.jpg';
import fotoHospitalPrincipal from '../assets/hospital-principal.jpg';
import AccesoSuperusuario from '../features/autenticacion/AccesoSuperusuario';
import TableroEstadisticas from '../features/estadisticas/TableroEstadisticas';
import ExploracionMedicamentos from '../features/exploracion/ExploracionMedicamentos';
import VentasMedicamentos from '../features/ventas/VentasMedicamentos';
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
  IconoVenta,
} from '../shared/IconosSalud';

const STORAGE_TOKEN_KEY = 'medicamentos_superusuario_token';
const STORAGE_USER_KEY = 'medicamentos_superusuario_nombre';

const PAGINAS_PORTAL = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'medicamentos', label: 'Medicamentos (CRUD)' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'estadisticas', label: 'Estadísticas' },
  { id: 'institucion', label: 'Institución y Contacto' },
];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY) || '');
  const [usuario, setUsuario] = useState(() => localStorage.getItem(STORAGE_USER_KEY) || '');
  const [superusuarioVerificado, setSuperusuarioVerificado] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(() =>
    Boolean(localStorage.getItem(STORAGE_TOKEN_KEY))
  );

  const [paginaActiva, setPaginaActiva] = useState('inicio');
  const [medicamentoParaVender, setMedicamentoParaVender] = useState(null);

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

  const navegarA = (paginaId) => {
    setPaginaActiva(paginaId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const irAVenderMedicamento = (medicamento) => {
    setMedicamentoParaVender(medicamento);
    navegarA('ventas');
  };

  const refrescarTodo = () => {
    setRecargaDatos((prev) => prev + 1);
  };

  const manejarAccesoAutorizado = (nuevoToken, nombreUsuario) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, nuevoToken);
    localStorage.setItem(STORAGE_USER_KEY, nombreUsuario);
    setAuthToken(nuevoToken);
    setToken(nuevoToken);
    setUsuario(nombreUsuario);
    setSuperusuarioVerificado(true);
    setVerificandoSesion(false);
    setPaginaActiva('inicio');
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
          <button
            type="button"
            className="identidad-hospital identidad-boton"
            onClick={() => navegarA('inicio')}
          >
            <span className="emblema-cruz-salud">
              <IconoCruzHospital size={26} />
            </span>
            <div>
              <span className="eyebrow-salud">Gestión y Auditoría Farmacéutica</span>
              <span className="titulo-hospital">Precios y Compras de Medicamentos</span>
            </div>
          </button>

          <nav className="navegacion-hospital" aria-label="Navegación principal por secciones">
            {PAGINAS_PORTAL.map((pag) => (
              <button
                key={pag.id}
                type="button"
                className={`enlace-nav-pagina ${paginaActiva === pag.id ? 'enlace-nav-activo' : ''}`}
                aria-current={paginaActiva === pag.id ? 'page' : undefined}
                onClick={() => navegarA(pag.id)}
              >
                {pag.label}
              </button>
            ))}
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
        {paginaActiva === 'inicio' && (
          <>
            <section className="seccion-hero-hospital">
              <div className="hero-hospital-grid">
                <div className="hero-hospital-texto">
                  <span className="eyebrow-salud">Información clara para el sector salud</span>
                  <h1>Gestión integral de medicamentos, ventas y auditoría hospitalaria</h1>
                  <p className="hero-hospital-descripcion">
                    Navega página por página sin saturación visual: registra y actualiza medicamentos, realiza ventas con descuento automático en el inventario, consulta estadísticas en vivo y descarga reportes PDF oficiales.
                  </p>
                  <div className="hero-hospital-acciones">
                    <button
                      type="button"
                      className="boton boton-primario boton-grande"
                      onClick={() => navegarA('medicamentos')}
                    >
                      <IconoBusquedaMedica size={18} />
                      Ir a Medicamentos (CRUD)
                    </button>
                    <button
                      type="button"
                      className="boton boton-secundario boton-grande"
                      onClick={() => navegarA('ventas')}
                    >
                      <IconoVenta size={18} />
                      Ir a Ventas
                    </button>
                  </div>
                </div>

                <figure className="hero-hospital-fotografia">
                  <img
                    src={fotoHospitalPrincipal}
                    alt="Profesional de salud brindando orientación clara y amable sobre documentación médica en recepción hospitalaria"
                  />
                  <figcaption>
                    Atención organizada y transparente en farmacia institucional.
                  </figcaption>
                </figure>
              </div>
            </section>

            <section className="banda-accesos-rapidos" aria-label="Accesos rápidos del portal">
              <div className="contenedor-seccion">
                <div className="rejilla-accesos-rapidos">
                  <button
                    type="button"
                    className="enlace-acceso-rapido enlace-acceso-boton"
                    onClick={() => navegarA('medicamentos')}
                  >
                    <span className="icono-acceso-rapido">
                      <IconoMedicamento size={22} />
                    </span>
                    <div>
                      <strong>Inventario y CRUD</strong>
                      <span>Registra, edita, elimina y filtra todos los medicamentos.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="enlace-acceso-rapido enlace-acceso-boton"
                    onClick={() => navegarA('ventas')}
                  >
                    <span className="icono-acceso-rapido">
                      <IconoVenta size={22} />
                    </span>
                    <div>
                      <strong>Vender medicamentos</strong>
                      <span>Registra ventas y descuenta unidades de la tabla en vivo.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="enlace-acceso-rapido enlace-acceso-boton"
                    onClick={() => navegarA('estadisticas')}
                  >
                    <span className="icono-acceso-rapido">
                      <IconoEstadistica size={22} />
                    </span>
                    <div>
                      <strong>Estadísticas en vivo</strong>
                      <span>Analiza promedios, máximos y volumen por segmento.</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="enlace-acceso-rapido enlace-acceso-boton"
                    onClick={() => navegarA('institucion')}
                  >
                    <span className="icono-acceso-rapido">
                      <IconoHospital size={22} />
                    </span>
                    <div>
                      <strong>Institución y contacto</strong>
                      <span>Consulta cobertura real del catálogo y datos del proyecto.</span>
                    </div>
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {paginaActiva === 'medicamentos' && (
          <section className="banda-blanca banda-pagina-unica">
            <div className="contenedor-seccion">
              <ExploracionMedicamentos
                opcionesFiltros={opcionesFiltros}
                onExportarPdf={descargarPDF}
                recargaDatos={recargaDatos}
                onDatosImportados={refrescarTodo}
                onVenderMedicamento={irAVenderMedicamento}
              />
            </div>
          </section>
        )}

        {paginaActiva === 'ventas' && (
          <section className="banda-blanca banda-pagina-unica">
            <div className="contenedor-seccion">
              <VentasMedicamentos
                key={medicamentoParaVender?.id ?? 'general'}
                medicamentoInicial={medicamentoParaVender}
                recargaDatos={recargaDatos}
                onVentaRegistrada={refrescarTodo}
                onIrMedicamentos={() => navegarA('medicamentos')}
              />
            </div>
          </section>
        )}

        {paginaActiva === 'estadisticas' && (
          <section className="banda-blanca banda-pagina-unica">
            <div className="contenedor-seccion">
              <TableroEstadisticas opcionesFiltros={opcionesFiltros} recargaDatos={recargaDatos} />
            </div>
          </section>
        )}

        {paginaActiva === 'institucion' && (
          <section className="banda-blanca banda-pagina-unica">
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
                    Este sistema centraliza los registros de medicamentos y ventas almacenados en PostgreSQL para ofrecer búsquedas claras, cifras verificables y documentos PDF sin pasos técnicos complejos.
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
                        {totalFormas > muestraFormas.length
                          ? ` y ${totalFormas - muestraFormas.length} más disponibles en los filtros.`
                          : '.'}
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
                        {totalEntidades > muestraEntidades.length
                          ? ` y ${totalEntidades - muestraEntidades.length} instituciones adicionales.`
                          : '.'}
                      </p>
                    </div>
                  )}

                  <div className="bloque-info-institucional bloque-orientacion">
                    <h3>Orientación para pacientes, familiares y auditores</h3>
                    <ul className="lista-orientacion">
                      <li>En <strong>Medicamentos (CRUD)</strong> puedes registrar nuevos medicamentos, editar sus datos o iniciar una venta directa desde la fila.</li>
                      <li>En <strong>Ventas</strong> puedes seleccionar un producto disponible, indicar la cantidad vendida y descontar automáticamente las unidades del inventario.</li>
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
        )}
      </main>

      <footer className="pie-pagina">
        <div className="pie-pagina-interno">
          <div className="pie-identidad">
            <div className="pie-logo">
              <IconoCruzHospital size={22} />
              <strong>Precios y Compras de Medicamentos</strong>
            </div>
            <p>
              Sistema institucional para gestión CRUD de medicamentos, registro de ventas con descuento de stock, estadísticas dinámicas y exportación PDF.
            </p>
          </div>

          <div className="pie-enlaces">
            <strong>Navegación por páginas</strong>
            {PAGINAS_PORTAL.map((pag) => (
              <button
                key={pag.id}
                type="button"
                className="pie-boton-enlace"
                onClick={() => navegarA(pag.id)}
              >
                {pag.label}
              </button>
            ))}
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
