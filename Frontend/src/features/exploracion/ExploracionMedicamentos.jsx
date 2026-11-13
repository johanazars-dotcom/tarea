import { useEffect, useState } from 'react';
import api from '../../shared/api';
import { formatearMoneda, formatearNumero } from '../../shared/formateadores';

const CAMPOS_ORDEN = [
  { value: 'fecha_reporte', label: 'Fecha de reporte' },
  { value: 'precio_unitario', label: 'Precio unitario' },
  { value: 'cantidad_comprada', label: 'Cantidad comprada' },
  { value: 'principio_activo', label: 'Principio activo' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'forma_farmaceutica', label: 'Forma farmacéutica' },
  { value: 'entidad_compradora', label: 'Entidad compradora' },
];

function construirPaginasVisibles(actual, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }
  const paginas = new Set([1, total, actual - 1, actual, actual + 1]);
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const resultado = [];
  for (let i = 0; i < ordenadas.length; i += 1) {
    if (i > 0 && ordenadas[i] - ordenadas[i - 1] > 1) {
      resultado.push('...');
    }
    resultado.push(ordenadas[i]);
  }
  return resultado;
}

export default function ExploracionMedicamentos({
  opcionesFiltros,
  onExportarPdf,
  recargaDatos = 0,
  onDatosImportados,
}) {
  const [medicamentos, setMedicamentos] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [siguientePagina, setSiguientePagina] = useState(null);
  const [anteriorPagina, setAnteriorPagina] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [importando, setImportando] = useState(false);
  const [estadoImportacion, setEstadoImportacion] = useState(null);

  const [textoInput, setTextoInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [formaFarmaceutica, setFormaFarmaceutica] = useState('');
  const [principioActivo, setPrincipioActivo] = useState('');
  const [entidadCompradora, setEntidadCompradora] = useState('');
  const [anio, setAnio] = useState('');

  const [campoOrden, setCampoOrden] = useState('fecha_reporte');
  const [direccionOrden, setDireccionOrden] = useState('-');

  const ordering = `${direccionOrden}${campoOrden}`;
  const consultaKey = JSON.stringify({
    pagina,
    pageSize,
    busqueda: busqueda.trim(),
    formaFarmaceutica,
    principioActivo,
    entidadCompradora,
    anio,
    ordering,
    recargaDatos,
  });

  const [estadoConsulta, setEstadoConsulta] = useState({
    key: '',
    error: null,
  });

  const cargando = estadoConsulta.key !== consultaKey;
  const error = estadoConsulta.error;

  const construirParams = (paginaDestino = pagina) => {
    const params = {
      page: paginaDestino,
      page_size: pageSize,
      ordering,
    };
    if (busqueda.trim()) params.search = busqueda.trim();
    if (formaFarmaceutica) params.forma_farmaceutica = formaFarmaceutica;
    if (principioActivo) params.principio_activo = principioActivo;
    if (entidadCompradora) params.entidad_compradora = entidadCompradora;
    if (anio) params.anio = anio;
    return params;
  };

  useEffect(() => {
    let cancelado = false;
    const params = {
      page: pagina,
      page_size: pageSize,
      ordering,
    };
    if (busqueda.trim()) params.search = busqueda.trim();
    if (formaFarmaceutica) params.forma_farmaceutica = formaFarmaceutica;
    if (principioActivo) params.principio_activo = principioActivo;
    if (entidadCompradora) params.entidad_compradora = entidadCompradora;
    if (anio) params.anio = anio;

    api
      .get('api/medicamentos/', { params })
      .then((response) => {
        if (cancelado) return;
        const data = response.data;
        setMedicamentos(data.results || []);
        setTotalRegistros(data.count ?? (data.results ? data.results.length : 0));
        setSiguientePagina(data.next || null);
        setAnteriorPagina(data.previous || null);
        setEstadoConsulta({ key: consultaKey, error: null });
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al cargar medicamentos:', err);
        setEstadoConsulta({
          key: consultaKey,
          error: 'No se pudo cargar el listado desde la API.',
        });
      });

    return () => {
      cancelado = true;
    };
  }, [consultaKey, pagina, pageSize, busqueda, formaFarmaceutica, principioActivo, entidadCompradora, anio, ordering, recargaDatos]);

  const generarLoteMedicamentos = async () => {
    setImportando(true);
    setEstadoImportacion(null);
    try {
      const { data } = await api.post('api/medicamentos/inyeccion/', {
        cantidad: 500,
        continuar: true,
      });
      setEstadoImportacion({
        tipo: 'exito',
        texto: `${formatearNumero(data.creados)} nuevos medicamentos generados en ${data.ms} ms (total en PostgreSQL: ${formatearNumero(data.total)}).`,
      });
      setPagina(1);
      onDatosImportados?.();
    } catch (err) {
      setEstadoImportacion({
        tipo: 'error',
        texto: err.response?.data?.detalle || 'No se pudo generar el lote de medicamentos.',
      });
    } finally {
      setImportando(false);
    }
  };

  const manejarSubmitBusqueda = (e) => {
    e.preventDefault();
    setPagina(1);
    setBusqueda(textoInput);
  };

  const cambiarFiltro = (setter) => (e) => {
    setPagina(1);
    setter(e.target.value);
  };

  const alternarOrdenColumna = (campo) => {
    setPagina(1);
    if (campoOrden === campo) {
      setDireccionOrden((prev) => (prev === '-' ? '' : '-'));
    } else {
      setCampoOrden(campo);
      setDireccionOrden('-');
    }
  };

  const limpiarFiltros = () => {
    setTextoInput('');
    setBusqueda('');
    setFormaFarmaceutica('');
    setPrincipioActivo('');
    setEntidadCompradora('');
    setAnio('');
    setCampoOrden('fecha_reporte');
    setDireccionOrden('-');
    setPageSize(10);
    setPagina(1);
  };

  const hayFiltrosActivos = Boolean(
    busqueda || formaFarmaceutica || principioActivo || entidadCompradora || anio
  );

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / pageSize));
  const inicioRango = totalRegistros === 0 ? 0 : (pagina - 1) * pageSize + 1;
  const finRango = Math.min(pagina * pageSize, totalRegistros);
  const paginasVisibles = construirPaginasVisibles(pagina, totalPaginas);

  const indicadorOrden = (campo) => {
    if (campoOrden !== campo) return '⇅';
    return direccionOrden === '-' ? '↓' : '↑';
  };

  return (
    <section id="exploracion" className="tarjeta-panel">
      <div className="encabezado-panel">
        <div>
          <span className="etiqueta-seccion">Consulta de registros</span>
          <h2>Exploración Paginada y Controles de Consulta</h2>
          <p className="subtitulo-panel">
            Navegación por páginas, búsqueda textual, filtros por categoría y ordenamiento sincronizados en tiempo real con <code>GET /api/medicamentos/</code>.
          </p>
        </div>
        <div className="acciones-encabezado-panel">
          <button
            type="button"
            className="boton boton-primario"
            onClick={generarLoteMedicamentos}
            disabled={importando}
          >
            {importando ? 'Generando...' : 'Generar lote de medicamentos'}
          </button>
          {onExportarPdf && (
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => onExportarPdf(construirParams(1))}
            >
              Exportar PDF filtrado
            </button>
          )}
        </div>
      </div>

      <form onSubmit={manejarSubmitBusqueda} className="fila-busqueda">
        <div className="grupo-entrada-busqueda">
          <input
            type="text"
            className="control-entrada"
            placeholder="Buscar por principio activo, laboratorio, forma o entidad..."
            value={textoInput}
            onChange={(e) => setTextoInput(e.target.value)}
            aria-label="Buscar medicamentos"
          />
          <button type="submit" className="boton boton-primario">
            Buscar
          </button>
          {hayFiltrosActivos && (
            <button type="button" className="boton boton-fantasma" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          )}
        </div>
      </form>

      <div className="grilla-filtros">
        <label className="grupo-campo">
          <span>Forma farmacéutica (Categoría)</span>
          <select
            className="control-seleccion"
            value={formaFarmaceutica}
            onChange={cambiarFiltro(setFormaFarmaceutica)}
          >
            <option value="">Todas las categorías</option>
            {(opcionesFiltros.formas_farmaceuticas || []).map((forma) => (
              <option key={forma} value={forma}>
                {forma}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Principio activo</span>
          <select
            className="control-seleccion"
            value={principioActivo}
            onChange={cambiarFiltro(setPrincipioActivo)}
          >
            <option value="">Todos los principios</option>
            {(opcionesFiltros.principios_activos || []).map((principio) => (
              <option key={principio} value={principio}>
                {principio}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Entidad compradora</span>
          <select
            className="control-seleccion"
            value={entidadCompradora}
            onChange={cambiarFiltro(setEntidadCompradora)}
          >
            <option value="">Todas las entidades</option>
            {(opcionesFiltros.entidades_compradoras || []).map((entidad) => (
              <option key={entidad} value={entidad}>
                {entidad}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Año del reporte</span>
          <select className="control-seleccion" value={anio} onChange={cambiarFiltro(setAnio)}>
            <option value="">Todos los años</option>
            {(opcionesFiltros.anios || []).map((itemAnio) => (
              <option key={itemAnio} value={itemAnio}>
                {itemAnio}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Ordenar por</span>
          <select
            className="control-seleccion"
            value={campoOrden}
            onChange={cambiarFiltro(setCampoOrden)}
          >
            {CAMPOS_ORDEN.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Dirección</span>
          <select
            className="control-seleccion"
            value={direccionOrden}
            onChange={cambiarFiltro(setDireccionOrden)}
          >
            <option value="-">Descendente (mayor / más reciente)</option>
            <option value="">Ascendente (menor / A-Z)</option>
          </select>
        </label>

        <label className="grupo-campo">
          <span>Filas por página</span>
          <select
            className="control-seleccion"
            value={pageSize}
            onChange={(e) => {
              setPagina(1);
              setPageSize(Number(e.target.value));
            }}
          >
            <option value={10}>10 registros</option>
            <option value={20}>20 registros</option>
            <option value={50}>50 registros</option>
          </select>
        </label>
      </div>

      <div className="barra-resumen-resultados">
        <div className="pildora-conteo-resultados">
          Total que cumplen el criterio: <strong>{formatearNumero(totalRegistros)}</strong> registros
        </div>
        <div className="texto-rango-resultados">
          {cargando
            ? 'Consultando API...'
            : `Mostrando ${formatearNumero(inicioRango)}–${formatearNumero(finRango)} de ${formatearNumero(totalRegistros)} · Página ${pagina} de ${totalPaginas}`}
        </div>
      </div>

      {estadoImportacion && (
        <div
          className={`caja-alerta ${estadoImportacion.tipo === 'error' ? 'alerta-error' : 'alerta-exito'}`}
        >
          {estadoImportacion.texto}
        </div>
      )}

      {error && <div className="caja-alerta alerta-error">{error}</div>}

      <div className="contenedor-tabla">
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>
                <button type="button" className="boton-orden-columna" onClick={() => alternarOrdenColumna('principio_activo')}>
                  Principio Activo <span>{indicadorOrden('principio_activo')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="boton-orden-columna" onClick={() => alternarOrdenColumna('laboratorio')}>
                  Laboratorio <span>{indicadorOrden('laboratorio')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="boton-orden-columna" onClick={() => alternarOrdenColumna('forma_farmaceutica')}>
                  Forma Farmacéutica <span>{indicadorOrden('forma_farmaceutica')}</span>
                </button>
              </th>
              <th className="columna-numerica">
                <button type="button" className="boton-orden-columna" onClick={() => alternarOrdenColumna('precio_unitario')}>
                  Precio Unitario <span>{indicadorOrden('precio_unitario')}</span>
                </button>
              </th>
              <th className="columna-numerica">
                <button type="button" className="boton-orden-columna" onClick={() => alternarOrdenColumna('cantidad_comprada')}>
                  Cantidad <span>{indicadorOrden('cantidad_comprada')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="boton-orden-columna" onClick={() => alternarOrdenColumna('fecha_reporte')}>
                  Fecha <span>{indicadorOrden('fecha_reporte')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="boton-orden-columna" onClick={() => alternarOrdenColumna('entidad_compradora')}>
                  Entidad Compradora <span>{indicadorOrden('entidad_compradora')}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {!cargando && medicamentos.length === 0 ? (
              <tr>
                <td colSpan="7" className="celda-estado-vacio">
                  No se encontraron registros que coincidan con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              medicamentos.map((item) => (
                <tr key={item.id}>
                  <td className="texto-seminegrita">{item.principio_activo}</td>
                  <td>{item.laboratorio}</td>
                  <td>
                    <span className="insignia-categoria">{item.forma_farmaceutica}</span>
                  </td>
                  <td className="columna-numerica numero-monoespaciado">{formatearMoneda(item.precio_unitario)}</td>
                  <td className="columna-numerica numero-monoespaciado">{formatearNumero(item.cantidad_comprada)}</td>
                  <td className="numero-monoespaciado">{item.fecha_reporte}</td>
                  <td>{item.entidad_compradora}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="barra-paginacion">
        <button
          type="button"
          className="boton boton-pagina"
          disabled={pagina <= 1 || cargando}
          onClick={() => setPagina(1)}
        >
          « Primera
        </button>
        <button
          type="button"
          className="boton boton-pagina"
          disabled={!anteriorPagina || pagina <= 1 || cargando}
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
        >
          ‹ Anterior
        </button>

        <div className="numeros-pagina">
          {paginasVisibles.map((item, idx) =>
            item === '...' ? (
              <span key={`ellipsis-${idx}`} className="elipsis-pagina">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`boton boton-pagina ${item === pagina ? 'boton-pagina-activo' : ''}`}
                disabled={cargando}
                onClick={() => setPagina(item)}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="boton boton-pagina"
          disabled={!siguientePagina || pagina >= totalPaginas || cargando}
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
        >
          Siguiente ›
        </button>
        <button
          type="button"
          className="boton boton-pagina"
          disabled={pagina >= totalPaginas || cargando}
          onClick={() => setPagina(totalPaginas)}
        >
          Última »
        </button>
      </div>
    </section>
  );
}
