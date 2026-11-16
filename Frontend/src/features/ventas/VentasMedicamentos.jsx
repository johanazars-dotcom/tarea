import { useEffect, useState } from 'react';
import api from '../../shared/api';
import { formatearMoneda, formatearNumero } from '../../shared/formateadores';
import { IconoBusquedaMedica, IconoVenta } from '../../shared/IconosSalud';

function formatearFechaHora(iso) {
  if (!iso) return '-';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VentasMedicamentos({
  medicamentoInicial = null,
  recargaDatos = 0,
  onVentaRegistrada,
  onIrMedicamentos,
}) {
  const [busquedaCatalogo, setBusquedaCatalogo] = useState('');
  const [catalogoDisponible, setCatalogoDisponible] = useState([]);
  const [catalogoCargadoKey, setCatalogoCargadoKey] = useState('');

  const [medicamentoSeleccionado, setMedicamentoSeleccionado] = useState(medicamentoInicial);
  const [cantidad, setCantidad] = useState('1');
  const [comprador, setComprador] = useState('');
  const [observacion, setObservacion] = useState('');

  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [alertaVenta, setAlertaVenta] = useState(null);

  const [ventas, setVentas] = useState([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [paginaVentas, setPaginaVentas] = useState(1);
  const [siguienteVentas, setSiguienteVentas] = useState(null);
  const [anteriorVentas, setAnteriorVentas] = useState(null);
  const [busquedaVentas, setBusquedaVentas] = useState('');
  const [textoBusquedaVentas, setTextoBusquedaVentas] = useState('');
  const [historialCargadoKey, setHistorialCargadoKey] = useState('');

  const catalogoQueryKey = `${busquedaCatalogo.trim()}|${recargaDatos}`;
  const cargandoCatalogo = catalogoCargadoKey !== catalogoQueryKey;

  const historialQueryKey = `${paginaVentas}|${busquedaVentas.trim()}|${recargaDatos}`;
  const cargandoHistorial = historialCargadoKey !== historialQueryKey;

  useEffect(() => {
    let cancelado = false;

    const params = {
      solo_disponibles: 'true',
      page_size: 25,
      ordering: 'principio_activo',
    };
    if (busquedaCatalogo.trim()) {
      params.search = busquedaCatalogo.trim();
    }

    api
      .get('api/medicamentos/', { params })
      .then((response) => {
        if (cancelado) return;
        const lista = response.data.results || [];
        setCatalogoDisponible(lista);
        setMedicamentoSeleccionado((prev) => {
          if (prev) {
            const actualizado = lista.find((m) => m.id === prev.id);
            return actualizado || prev;
          }
          return lista[0] || null;
        });
        setCatalogoCargadoKey(catalogoQueryKey);
      })
      .catch((err) => {
        if (!cancelado) {
          console.error('Error al cargar inventario disponible:', err);
          setCatalogoCargadoKey(catalogoQueryKey);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [catalogoQueryKey, busquedaCatalogo, recargaDatos]);

  useEffect(() => {
    let cancelado = false;

    const params = {
      page: paginaVentas,
      page_size: 10,
    };
    if (busquedaVentas.trim()) {
      params.search = busquedaVentas.trim();
    }

    api
      .get('api/ventas/', { params })
      .then((response) => {
        if (cancelado) return;
        const data = response.data;
        setVentas(data.results || []);
        setTotalVentas(data.count || 0);
        setSiguienteVentas(data.next || null);
        setAnteriorVentas(data.previous || null);
        setHistorialCargadoKey(historialQueryKey);
      })
      .catch((err) => {
        if (!cancelado) {
          console.error('Error al cargar historial de ventas:', err);
          setHistorialCargadoKey(historialQueryKey);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [historialQueryKey, paginaVentas, busquedaVentas, recargaDatos]);

  const stockActual = medicamentoSeleccionado ? Number(medicamentoSeleccionado.cantidad_comprada || 0) : 0;
  const precioActual = medicamentoSeleccionado ? Number(medicamentoSeleccionado.precio_unitario || 0) : 0;
  const cantidadNumerica = Math.max(0, parseInt(cantidad || '0', 10) || 0);
  const totalEstimado = cantidadNumerica * precioActual;
  const stockDespues = Math.max(0, stockActual - cantidadNumerica);

  const manejarSeleccionarId = (e) => {
    const idSeleccionado = Number(e.target.value);
    const encontrado = catalogoDisponible.find((m) => m.id === idSeleccionado) || null;
    setMedicamentoSeleccionado(encontrado);
    setCantidad('1');
    setAlertaVenta(null);
  };

  const manejarRegistrarVenta = async (e) => {
    e.preventDefault();
    if (!medicamentoSeleccionado) {
      setAlertaVenta({ tipo: 'error', texto: 'Selecciona un medicamento disponible para vender.' });
      return;
    }
    if (cantidadNumerica < 1) {
      setAlertaVenta({ tipo: 'error', texto: 'La cantidad a vender debe ser al menos 1 unidad.' });
      return;
    }
    if (cantidadNumerica > stockActual) {
      setAlertaVenta({
        tipo: 'error',
        texto: `Stock insuficiente. Solo hay ${formatearNumero(stockActual)} unidades disponibles.`,
      });
      return;
    }

    setProcesandoVenta(true);
    setAlertaVenta(null);
    try {
      const { data } = await api.post('api/ventas/', {
        medicamento_id: medicamentoSeleccionado.id,
        cantidad: cantidadNumerica,
        comprador: comprador.trim(),
        observacion: observacion.trim(),
      });

      setMedicamentoSeleccionado(data.medicamento);
      setCantidad('1');
      setComprador('');
      setObservacion('');
      setPaginaVentas(1);
      setAlertaVenta({
        tipo: 'exito',
        texto: `Venta registrada por ${formatearMoneda(data.venta.total_venta)}. Se descontaron ${formatearNumero(data.venta.cantidad_vendida)} u. del inventario (stock restante: ${formatearNumero(data.stock_restante)} u.).`,
      });
      onVentaRegistrada?.();
    } catch (err) {
      setAlertaVenta({
        tipo: 'error',
        texto:
          err.response?.data?.detalle ||
          err.response?.data?.comprador?.[0] ||
          'No se pudo procesar la venta.',
      });
    } finally {
      setProcesandoVenta(false);
    }
  };

  const manejarBuscarHistorial = (e) => {
    e.preventDefault();
    setPaginaVentas(1);
    setBusquedaVentas(textoBusquedaVentas);
  };

  const totalPaginasVentas = Math.max(1, Math.ceil(totalVentas / 10));

  return (
    <div className="bloque-modulo">
      <div className="encabezado-panel">
        <div>
          <span className="etiqueta-seccion">Dispensación y salida de inventario</span>
          <h2>Punto de Venta de Medicamentos</h2>
          <p className="subtitulo-panel">
            Selecciona un medicamento con stock disponible, registra la venta y el sistema descontará automáticamente las unidades de la tabla en PostgreSQL.
          </p>
        </div>
        {onIrMedicamentos && (
          <button type="button" className="boton boton-secundario" onClick={onIrMedicamentos}>
            Ver inventario completo
          </button>
        )}
      </div>

      <div className="grilla-ventas">
        <form onSubmit={manejarRegistrarVenta} className="panel-formulario-venta">
          <h3>
            <IconoVenta size={19} /> Nueva venta
          </h3>

          <label className="grupo-campo">
            <span>Buscar medicamento disponible</span>
            <input
              type="text"
              className="control-entrada"
              value={busquedaCatalogo}
              onChange={(e) => setBusquedaCatalogo(e.target.value)}
              placeholder="Escribe principio activo, laboratorio o forma..."
            />
          </label>

          <label className="grupo-campo">
            <span>Medicamento en inventario {cargandoCatalogo ? '(cargando...)' : ''}</span>
            <select
              className="control-seleccion"
              value={medicamentoSeleccionado?.id || ''}
              onChange={manejarSeleccionarId}
              required
            >
              {catalogoDisponible.length === 0 && !medicamentoSeleccionado && (
                <option value="">No hay medicamentos con stock disponible</option>
              )}
              {medicamentoSeleccionado &&
                !catalogoDisponible.some((m) => m.id === medicamentoSeleccionado.id) && (
                  <option value={medicamentoSeleccionado.id}>
                    {medicamentoSeleccionado.principio_activo} · {medicamentoSeleccionado.laboratorio} (Stock:{' '}
                    {formatearNumero(medicamentoSeleccionado.cantidad_comprada)} u.)
                  </option>
                )}
              {catalogoDisponible.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.principio_activo} · {item.laboratorio} ({item.forma_farmaceutica}) — Stock:{' '}
                  {formatearNumero(item.cantidad_comprada)} u. · {formatearMoneda(item.precio_unitario)}
                </option>
              ))}
            </select>
          </label>

          {medicamentoSeleccionado && (
            <div className="resumen-stock-venta">
              <div>
                <span>Precio unitario</span>
                <strong>{formatearMoneda(medicamentoSeleccionado.precio_unitario)}</strong>
              </div>
              <div>
                <span>Stock actual en tabla</span>
                <strong className={stockActual === 0 ? 'texto-agotado' : 'texto-disponible'}>
                  {formatearNumero(stockActual)} unidades
                </strong>
              </div>
              <div>
                <span>Presentación</span>
                <strong>{medicamentoSeleccionado.forma_farmaceutica}</strong>
              </div>
              <div>
                <span>Laboratorio</span>
                <strong>{medicamentoSeleccionado.laboratorio}</strong>
              </div>
            </div>
          )}

          <div className="fila-campos-doble">
            <label className="grupo-campo">
              <span>Cantidad a vender</span>
              <input
                type="number"
                min="1"
                max={Math.max(1, stockActual)}
                className="control-entrada"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </label>

            <label className="grupo-campo">
              <span>Comprador / Paciente o Institución</span>
              <input
                type="text"
                className="control-entrada"
                value={comprador}
                onChange={(e) => setComprador(e.target.value)}
                placeholder="Ej. Clínica Reina Sofía o nombre del paciente"
                required
              />
            </label>
          </div>

          <label className="grupo-campo">
            <span>Observación (opcional)</span>
            <input
              type="text"
              className="control-entrada"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej. Entrega presencial o fórmula médica"
            />
          </label>

          <div className="resumen-total-venta">
            <div>
              <span>Total a cobrar</span>
              <strong>{formatearMoneda(totalEstimado)}</strong>
            </div>
            <div>
              <span>Stock tras la venta</span>
              <strong>{formatearNumero(stockDespues)} u.</strong>
            </div>
          </div>

          {alertaVenta && (
            <div
              className={`caja-alerta ${alertaVenta.tipo === 'error' ? 'alerta-error' : 'alerta-exito'}`}
              role="status"
            >
              {alertaVenta.texto}
            </div>
          )}

          <button
            type="submit"
            className="boton boton-primario boton-ancho-completo"
            disabled={procesandoVenta || !medicamentoSeleccionado || stockActual < 1}
          >
            {procesandoVenta
              ? 'Procesando venta...'
              : stockActual < 1
                ? 'Sin stock disponible'
                : 'Confirmar venta y descontar de la tabla'}
          </button>
        </form>

        <div className="panel-historial-ventas">
          <div className="cabecera-historial-ventas">
            <h3>Historial de ventas ({formatearNumero(totalVentas)})</h3>
            <form onSubmit={manejarBuscarHistorial} className="buscador-compacto">
              <input
                type="text"
                className="control-entrada"
                value={textoBusquedaVentas}
                onChange={(e) => setTextoBusquedaVentas(e.target.value)}
                placeholder="Buscar venta o comprador..."
                aria-label="Buscar en historial de ventas"
              />
              <button type="submit" className="boton boton-secundario">
                <IconoBusquedaMedica size={16} />
                Buscar
              </button>
            </form>
          </div>

          <div className="contenedor-tabla">
            <table className="tabla-datos tabla-datos-compacta">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Medicamento</th>
                  <th>Comprador</th>
                  <th className="columna-numerica">Cant.</th>
                  <th className="columna-numerica">Total</th>
                </tr>
              </thead>
              <tbody>
                {!cargandoHistorial && ventas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="celda-estado-vacio">
                      Aún no se han registrado ventas. Realiza la primera venta desde el formulario.
                    </td>
                  </tr>
                ) : (
                  ventas.map((v) => (
                    <tr key={v.id}>
                      <td className="numero-monoespaciado">{formatearFechaHora(v.fecha_venta)}</td>
                      <td>
                        <div className="texto-seminegrita">{v.principio_activo}</div>
                        <div className="subtexto-tabla">{v.laboratorio}</div>
                      </td>
                      <td>
                        <div>{v.comprador}</div>
                        {v.vendedor && <div className="subtexto-tabla">Por: {v.vendedor}</div>}
                      </td>
                      <td className="columna-numerica numero-monoespaciado">
                        {formatearNumero(v.cantidad_vendida)}
                      </td>
                      <td className="columna-numerica numero-monoespaciado texto-seminegrita">
                        {formatearMoneda(v.total_venta)}
                      </td>
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
              disabled={!anteriorVentas || paginaVentas <= 1 || cargandoHistorial}
              onClick={() => setPaginaVentas((p) => Math.max(1, p - 1))}
            >
              ‹ Anterior
            </button>
            <span className="texto-rango-resultados">
              Página {paginaVentas} de {totalPaginasVentas}
            </span>
            <button
              type="button"
              className="boton boton-pagina"
              disabled={!siguienteVentas || paginaVentas >= totalPaginasVentas || cargandoHistorial}
              onClick={() => setPaginaVentas((p) => p + 1)}
            >
              Siguiente ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
