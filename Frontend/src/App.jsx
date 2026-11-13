import { useEffect, useState } from 'react';
import api, { API_BASE_URL, setAuthToken } from './api';
import './App.css';
import ExploracionMedicamentos from './components/ExploracionMedicamentos';
import PanelAutenticacion from './components/PanelAutenticacion';
import TableroEstadisticas from './components/TableroEstadisticas';

const STORAGE_TOKEN_KEY = 'medicamentos_auth_token';
const STORAGE_USER_KEY = 'medicamentos_auth_user';

export default function App() {
  const [opcionesFiltros, setOpcionesFiltros] = useState({
    principios_activos: [],
    formas_farmaceuticas: [],
    laboratorios: [],
    entidades_compradoras: [],
    anios: [],
  });

  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY) || '');
  const [usuario, setUsuario] = useState(() => localStorage.getItem(STORAGE_USER_KEY) || '');

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    api
      .get('api/filtros/')
      .then((response) => setOpcionesFiltros(response.data))
      .catch((err) => console.error('Error al cargar opciones de filtros:', err));
  }, []);

  const manejarLoginExitoso = (nuevoToken, nombreUsuario) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, nuevoToken);
    localStorage.setItem(STORAGE_USER_KEY, nombreUsuario);
    setAuthToken(nuevoToken);
    setToken(nuevoToken);
    setUsuario(nombreUsuario);
  };

  const manejarLogout = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setAuthToken('');
    setToken('');
    setUsuario('');
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

  return (
    <div className="contenedor-app">
      <header className="encabezado-superior">
        <div className="encabezado-interno">
          <div className="bloque-marca">
            <span className="insignia-marca">Sistema de Auditoría Farmacéutica</span>
            <h1>Panel de Precios y Compras de Medicamentos</h1>
            <p className="subtitulo-marca">
              Conectado a <code>{API_BASE_URL}</code>
            </p>
          </div>

          <div className="acciones-encabezado">
            <nav className="navegacion-rapida" aria-label="Secciones del panel">
              <a href="#exploracion">Exploración</a>
              <a href="#estadisticas">Estadísticas</a>
              <a href="#autenticacion">Autenticación</a>
            </nav>
            <button type="button" className="boton boton-primario" onClick={() => descargarPDF()}>
              Descargar PDF Auditoría
            </button>
          </div>
        </div>
      </header>

      <main className="contenido-principal">
        <ExploracionMedicamentos
          opcionesFiltros={opcionesFiltros}
          onExportarPdf={descargarPDF}
        />

        <TableroEstadisticas opcionesFiltros={opcionesFiltros} />

        <PanelAutenticacion
          token={token}
          usuario={usuario}
          onLoginSuccess={manejarLoginExitoso}
          onLogout={manejarLogout}
        />
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
