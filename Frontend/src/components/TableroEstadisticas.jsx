import { useEffect, useState } from 'react';
import api from '../api';
import { formatearMoneda, formatearNumero } from '../utils/formatters';

const OPCIONES_AGRUPACION = [
  { value: 'principio_activo', label: 'Principio activo' },
  { value: 'forma_farmaceutica', label: 'Forma farmacéutica (Categoría)' },
  { value: 'entidad_compradora', label: 'Entidad compradora' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'anio_reporte', label: 'Año de reporte' },
  { value: 'principio_anio', label: 'Principio activo y año' },
];

export default function TableroEstadisticas({ opcionesFiltros }) {
  const [formaFarmaceutica, setFormaFarmaceutica] = useState('');
  const [anio, setAnio] = useState('');
  const [entidadCompradora, setEntidadCompradora] = useState('');
  const [principioActivo, setPrincipioActivo] = useState('');
  const [laboratorio, setLaboratorio] = useState('');
  const [agruparPor, setAgruparPor] = useState('principio_activo');

  const [estadisticas, setEstadisticas] = useState(null);
  const consultaKey = JSON.stringify({
    formaFarmaceutica,
    anio,
    entidadCompradora,
    principioActivo,
    laboratorio,
    agruparPor,
  });
  const [estadoConsulta, setEstadoConsulta] = useState({ key: '', error: null });

  const cargando = estadoConsulta.key !== consultaKey;
  const error = estadoConsulta.error;

  useEffect(() => {
    let cancelado = false;
    const params = { agrupar_por: agruparPor };
    if (formaFarmaceutica) params.forma_farmaceutica = formaFarmaceutica;
    if (anio) params.anio = anio;
    if (entidadCompradora) params.entidad_compradora = entidadCompradora;
    if (principioActivo) params.principio_activo = principioActivo;
    if (laboratorio) params.laboratorio = laboratorio;

    api
      .get('api/estadisticas/', { params })
      .then((response) => {
        if (cancelado) return;
        setEstadisticas(response.data);
        setEstadoConsulta({ key: consultaKey, error: null });
      })
      .catch((err) => {
        if (cancelado) return;
        console.error('Error al cargar estadisticas:', err);
        setEstadoConsulta({
          key: consultaKey,
          error: 'No se pudieron recalcular las estadísticas desde el servidor.',
        });
      });

    return () => {
      cancelado = true;
    };
  }, [consultaKey, formaFarmaceutica, anio, entidadCompradora, principioActivo, laboratorio, agruparPor]);

  const restablecerControles = () => {
    setFormaFarmaceutica('');
    setAnio('');
    setEntidadCompradora('');
    setPrincipioActivo('');
    setLaboratorio('');
    setAgruparPor('principio_activo');
  };

  const paramsActivos = new URLSearchParams({ agrupar_por: agruparPor });
  if (formaFarmaceutica) paramsActivos.set('forma_farmaceutica', formaFarmaceutica);
  if (anio) paramsActivos.set('anio', anio);
  if (entidadCompradora) paramsActivos.set('entidad_compradora', entidadCompradora);
  if (principioActivo) paramsActivos.set('principio_activo', principioActivo);
  if (laboratorio) paramsActivos.set('laboratorio', laboratorio);

  const haySegmentoActivo = Boolean(
    formaFarmaceutica || anio || entidadCompradora || principioActivo || laboratorio
  );

  const resumen = estadisticas?.resumen_general || {};
  const distribucion = estadisticas?.distribucion_agrupada || [];
  const maxVolumen = Math.max(1, ...distribucion.map((item) => Number(item.volumen_total || 0)));

  return (
    <section id="estadisticas" className="tarjeta-panel">
      <div className="encabezado-panel">
        <div>
          <span className="etiqueta-seccion">Módulo 2 · Analítica en Vivo</span>
          <h2>Tablero de Estadísticas Dinámicas y Manipulables</h2>
          <p className="subtitulo-panel">
            Cada filtro envía una petición al backend para recalcular totales, promedios, máximos y distribución agrupada exactamente sobre el segmento seleccionado.
          </p>
        </div>
        {haySegmentoActivo && (
          <button type="button" className="boton boton-fantasma" onClick={restablecerControles}>
            Restablecer análisis
          </button>
        )}
      </div>

      <div className="grilla-filtros">
        <label className="grupo-campo">
          <span>Categoría (Forma farmacéutica)</span>
          <select
            className="control-seleccion"
            value={formaFarmaceutica}
            onChange={(e) => setFormaFarmaceutica(e.target.value)}
          >
            <option value="">Todas las formas</option>
            {(opcionesFiltros.formas_farmaceuticas || []).map((forma) => (
              <option key={forma} value={forma}>
                {forma}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Año</span>
          <select
            className="control-seleccion"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
          >
            <option value="">Todos los años</option>
            {(opcionesFiltros.anios || []).map((itemAnio) => (
              <option key={itemAnio} value={itemAnio}>
                {itemAnio}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Entidad compradora</span>
          <select
            className="control-seleccion"
            value={entidadCompradora}
            onChange={(e) => setEntidadCompradora(e.target.value)}
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
          <span>Principio activo</span>
          <select
            className="control-seleccion"
            value={principioActivo}
            onChange={(e) => setPrincipioActivo(e.target.value)}
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
          <span>Laboratorio</span>
          <select
            className="control-seleccion"
            value={laboratorio}
            onChange={(e) => setLaboratorio(e.target.value)}
          >
            <option value="">Todos los laboratorios</option>
            {(opcionesFiltros.laboratorios || []).map((lab) => (
              <option key={lab} value={lab}>
                {lab}
              </option>
            ))}
          </select>
        </label>

        <label className="grupo-campo">
          <span>Agrupar conteos por</span>
          <select
            className="control-seleccion"
            value={agruparPor}
            onChange={(e) => setAgruparPor(e.target.value)}
          >
            {OPCIONES_AGRUPACION.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="traza-consulta">
        <span className="etiqueta-traza">{cargando ? 'Recalculando en backend...' : 'Consulta activa:'}</span>
        <code>GET /api/estadisticas/?{paramsActivos.toString()}</code>
      </div>

      {error && <div className="caja-alerta alerta-error">{error}</div>}

      <div className="grilla-indicadores">
        <div className="tarjeta-indicador">
          <span className="etiqueta-indicador">Registros analizados</span>
          <strong className="valor-indicador">{formatearNumero(resumen.conteo_total)}</strong>
          <span className="detalle-indicador">Total en el segmento</span>
        </div>

        <div className="tarjeta-indicador">
          <span className="etiqueta-indicador">Precio promedio</span>
          <strong className="valor-indicador">{formatearMoneda(resumen.global_precio_promedio)}</strong>
          <span className="detalle-indicador">Media unitaria del segmento</span>
        </div>

        <div className="tarjeta-indicador">
          <span className="etiqueta-indicador">Precio máximo</span>
          <strong className="valor-indicador">{formatearMoneda(resumen.global_precio_maximo)}</strong>
          <span className="detalle-indicador">Mínimo: {formatearMoneda(resumen.global_precio_minimo)}</span>
        </div>

        <div className="tarjeta-indicador">
          <span className="etiqueta-indicador">Volumen total comprado</span>
          <strong className="valor-indicador">{formatearNumero(resumen.global_volumen)}</strong>
          <span className="detalle-indicador">Unidades acumuladas</span>
        </div>

        <div className="tarjeta-indicador tarjeta-indicador-destacado">
          <span className="etiqueta-indicador">Valor total estimado</span>
          <strong className="valor-indicador">{formatearMoneda(resumen.valor_total_compras)}</strong>
          <span className="detalle-indicador">Σ (precio × cantidad)</span>
        </div>
      </div>

      <div className="division-estadisticas">
        <div className="subpanel-estadisticas">
          <h3>Distribución de volumen por grupo</h3>
          {distribucion.length === 0 ? (
            <p className="texto-vacio">No hay datos agrupados para este segmento.</p>
          ) : (
            <div className="lista-barras">
              {distribucion.map((fila) => {
                const porcentaje = Math.max(
                  4,
                  Math.round((Number(fila.volumen_total || 0) / maxVolumen) * 100)
                );
                return (
                  <div key={fila.grupo} className="elemento-barra">
                    <div className="cabecera-barra">
                      <span className="etiqueta-barra">{fila.grupo}</span>
                      <span className="meta-barra">
                        {formatearNumero(fila.volumen_total)} u. · {formatearNumero(fila.total_registros)} reg.
                      </span>
                    </div>
                    <div className="pista-barra">
                      <div className="relleno-barra" style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="subpanel-estadisticas">
          <h3>Detalle agregado por grupo</h3>
          {distribucion.length === 0 ? (
            <p className="texto-vacio">Ajusta los filtros para visualizar las métricas agrupadas.</p>
          ) : (
            <div className="contenedor-tabla">
              <table className="tabla-datos tabla-datos-compacta">
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th className="columna-numerica">Registros</th>
                    <th className="columna-numerica">Volumen</th>
                    <th className="columna-numerica">Promedio</th>
                    <th className="columna-numerica">Máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {distribucion.map((fila) => (
                    <tr key={fila.grupo}>
                      <td className="texto-seminegrita">{fila.grupo}</td>
                      <td className="columna-numerica numero-monoespaciado">{formatearNumero(fila.total_registros)}</td>
                      <td className="columna-numerica numero-monoespaciado">{formatearNumero(fila.volumen_total)}</td>
                      <td className="columna-numerica numero-monoespaciado">{formatearMoneda(fila.precio_promedio)}</td>
                      <td className="columna-numerica numero-monoespaciado">{formatearMoneda(fila.precio_maximo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
