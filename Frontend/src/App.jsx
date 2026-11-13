import { useEffect, useState } from 'react';
import api from './api';
import './App.css';
import axios from 'axios';

function App() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [siguientePagina, setSiguientePagina] = useState(null);
  const [anteriorPagina, setAnteriorPagina] = useState(null);

  function cargarMedicamentos(url = 'api/medicamentos/') {
    api.get(url)
      .then(response => {
        setMedicamentos(response.data.results || response.data);
        setSiguientePagina(response.data.next);
        setAnteriorPagina(response.data.previous);
      })
      .catch(error => console.error("Error al cargar medicamentos:", error));
  }

  function cargarEstadisticas() {
    api.get('api/estadisticas/')
      .then(response => setEstadisticas(response.data))
      .catch(error => console.error("Error al cargar estadisticas:", error));
  }

  useEffect(() => {
    cargarMedicamentos();
    cargarEstadisticas();
  }, []);

  const manejarBusqueda = async (e) => {
    e.preventDefault();
    try {
      const response = await api.get(`api/medicamentos/?search=${busqueda}`);
      setMedicamentos(response.data.results || response.data);
    } catch (error) {
      console.error("Error en la busqueda:", error);
    }
  };

  const descargarPDF = async () => {
    try {
      const response = await axios.get('https://precio-compras-medicamentos.onrender.com/api/exportar-pdf/', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reporte_auditoria.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error al descargar el PDF:", error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Panel de precios</h1> 
      <h1>y compra de medicamentos</h1>

      {estadisticas && (
        <div style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Resumen Estadistico (Calculado en Base de Datos)</h3>
          <p><strong>Total de Registros Analizados:</strong> {estadisticas.resumen_general.conteo_total}</p>
          <p><strong>Precio Promedio Global:</strong> ${estadisticas.resumen_general.global_precio_promedio?.toFixed(2) || 0}</p>
          <p><strong>Precio Maximo Global:</strong> ${estadisticas.resumen_general.global_precio_maximo || 0}</p>
        </div>
      )}

      <form onSubmit={manejarBusqueda} style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Buscar principio activo, laboratorio..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ padding: '8px', width: '300px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '8px 15px' }}>Buscar</button>
      </form>

      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#b2c593' }}>
            <th style={{ color: 'AccentColorText'}}>Principio Activo</th>
            <th style={{ color: 'AccentColorText'}}>Laboratorio</th>
            <th style={{ color: 'AccentColorText'}}>Forma Farmaceutica</th>
            <th style={{ color: 'AccentColorText'}}>Precio Unitario</th>
            <th style={{ color: 'AccentColorText'}}>Cantidad</th>
            <th style={{ color: 'AccentColorText'}}>Fecha</th>
            <th style={{ color: 'AccentColorText'}}>Entidad</th>
          </tr>
        </thead>
        <tbody>
          {medicamentos.map((item) => (
            <tr key={item.id}>
              <td>{item.principio_activo}</td>
              <td>{item.laboratorio}</td>
              <td>{item.forma_farmaceutica}</td>
              <td>${item.precio_unitario}</td>
              <td>{item.cantidad_comprada}</td>
              <td>{item.fecha_reporte}</td>
              <td>{item.entidad_compradora}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginBottom: '30px' }}>
        {anteriorPagina && (
          <button onClick={() => cargarMedicamentos(anteriorPagina.replace('https://precio-compras-medicamentos.onrender.com/', ''))} style={{ marginRight: '10px' }}>
            Anterior
          </button>
        )}
        {siguientePagina && (
          <button onClick={() => cargarMedicamentos(siguientePagina.replace('https://precio-compras-medicamentos.onrender.com/', ''))}>
            Siguiente
          </button>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={descargarPDF}
          style={{ padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Descargar Reporte PDF de Auditoria
        </button>
      </div>

      <footer style={{ marginTop: '40px', padding: '15px', background: '#eaeaea', textAlign: 'center', borderRadius: '5px' }}>
        <p><strong>Proyecto desarrollado por:</strong> Johan Salazar Lopez</p>
        <p><strong>Programa:</strong> Tecnologo en Analisis y Desarrollo de Software (ADSO) - SENA (Ficha 3171062)</p>
        <p><strong>Ubicacion:</strong> Sogamoso, Boyaca, Colombia</p>
        <p><strong>Herramienta diferencial:</strong> Modulo automatizado de generacion y exportacion de informes en formato PDF para auditorias rapidas.</p>
      </footer>
    </div>
  );
}

export default App;