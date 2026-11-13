import { useEffect, useState } from 'react';
import api, { API_BASE_URL, setAuthToken, validarTokenSuperusuario } from '../shared/api';
import AccesoSuperusuario from '../features/autenticacion/AccesoSuperusuario';
import ExploracionMedicamentos from '../features/exploracion/ExploracionMedicamentos';
import TableroEstadisticas from '../features/estadisticas/TableroEstadisticas';

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
          <p className="texto-verificando">Validando token de superusuario...</p>
        </div>
      </div>
    );
  }

  if (!superusuarioVerificado) {
    return <AccesoSuperusuario onAccesoAutorizado={manejarAccesoAutorizado} />;
  }

  return (
    <div className="contenedor-app">
      <header className="encabezado-superior">
        <div className="encabezado-interno">
          <div className="bloque-marca">
            <span className="insignia-marca">Sistema de Auditoría Farmacéutica</span>
            <h1>Panel de Precios y Compras de Medicamentos</h1>
            <p className="subtitulo-marca">
              Conectado a <code>{API_BASE_URL}</code> · Superusuario activo: <strong>{usuario}</strong>
            </p>
          </div>

          <div className="acciones-encabezado">
            <nav className="navegacion-rapida" aria-label="Secciones del panel">
              <a href="#exploracion">Exploración</a>
              <a href="#estadisticas">Estadísticas</a>
            </nav>
            <button type="button" className="boton boton-primario" onClick={() => descargarPDF()}>
              Descargar PDF Auditoría
            </button>
            <button type="button" className="boton boton-cerrar-sesion" onClick={manejarCerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="contenido-principal">
        <ExploracionMedicamentos
          opcionesFiltros={opcionesFiltros}
          onExportarPdf={descargarPDF}
          recargaDatos={recargaDatos}
          onDatosImportados={() => setRecargaDatos((prev) => prev + 1)}
        />

        <TableroEstadisticas opcionesFiltros={opcionesFiltros} recargaDatos={recargaDatos} />
      </main>

      <footer className="pie-pagina">
        <p>
          <strong>Proyecto desarrollado por:</strong> Johan Salazar Lopez ·{' '}
          <strong>Programa:</strong> Tecnólogo en Análisis y Desarrollo de Software (ADSO) - SENA (Ficha 3171062)
        </p>
        <p>
          <strong>Ubicación:</strong> Sogamoso, Boyacá, Colombia ·{' '}
          <strong>Herramienta diferencial:</strong> Módulo automatizado de generación y exportación de informes en formato PDF para auditorías rápidas.
        </p>
      </footer>
    </div>
  );
}
