import { useState } from 'react';
import api, { postSinToken } from '../api';

export default function PanelAutenticacion({ token, usuario, onLoginSuccess, onLogout }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarToken, setMostrarToken] = useState(false);
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState(null);

  const [cargandoOperacion, setCargandoOperacion] = useState(false);
  const [resultadoOperacion, setResultadoOperacion] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const registrarEvento = (evento) => {
    setHistorial((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        hora: new Date().toLocaleTimeString('es-CO'),
        ...evento,
      },
      ...prev.slice(0, 5),
    ]);
  };

  const manejarLogin = async (e) => {
    e.preventDefault();
    setErrorLogin(null);
    setCargandoLogin(true);

    try {
      const response = await api.post('api-token-auth/', {
        username: username.trim(),
        password,
      });
      const nuevoToken = response.data.token;
      onLoginSuccess(nuevoToken, username.trim());
      setPassword('');
      registrarEvento({
        metodo: 'POST',
        endpoint: '/api-token-auth/',
        estado: response.status,
        detalle: `Token emitido para usuario "${username.trim()}"`,
        ok: true,
      });
    } catch (err) {
      const status = err.response?.status || 'ERR';
      const data = err.response?.data || { detail: 'No fue posible autenticar contra el servidor.' };
      setErrorLogin(
        data.non_field_errors?.[0] || data.detail || 'Usuario o contraseña incorrectos.'
      );
      registrarEvento({
        metodo: 'POST',
        endpoint: '/api-token-auth/',
        estado: status,
        detalle: 'Credenciales rechazadas por el servidor',
        ok: false,
      });
    } finally {
      setCargandoLogin(false);
    }
  };

  const ejecutarOperacion = async ({ forzarSinCredencial = false } = {}) => {
    setCargandoOperacion(true);
    const usarToken = Boolean(token) && !forzarSinCredencial;

    try {
      const response = usarToken
        ? await api.post('api/operacion-protegida/')
        : await postSinToken('api/operacion-protegida/');

      setResultadoOperacion({
        ok: true,
        status: response.status,
        statusText: response.statusText || 'OK',
        conCredencial: usarToken,
        payload: response.data,
      });
      registrarEvento({
        metodo: 'POST',
        endpoint: '/api/operacion-protegida/',
        estado: response.status,
        detalle: 'Acceso autorizado con Token válido',
        ok: true,
      });
    } catch (err) {
      const status = err.response?.status || 500;
      const statusText =
        err.response?.statusText || (status === 401 ? 'Unauthorized' : 'Error');
      const payload = err.response?.data || { detail: err.message };

      setResultadoOperacion({
        ok: false,
        status,
        statusText,
        conCredencial: usarToken,
        payload,
      });
      registrarEvento({
        metodo: 'POST',
        endpoint: '/api/operacion-protegida/',
        estado: status,
        detalle:
          status === 401
            ? 'Rechazo 401: solicitud sin credencial válida'
            : 'Error al ejecutar operación protegida',
        ok: false,
      });
    } finally {
      setCargandoOperacion(false);
    }
  };

  const copiarToken = async () => {
    if (!token || !navigator.clipboard) return;
    await navigator.clipboard.writeText(token);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  const tokenVisible = token
    ? mostrarToken
      ? token
      : `${token.slice(0, 6)}••••••••••••••••••••••••${token.slice(-4)}`
    : '';

  return (
    <section id="autenticacion" className="tarjeta-panel">
      <div className="encabezado-panel">
        <div>
          <span className="etiqueta-seccion">Módulo 3 · Seguridad y Tokens DRF</span>
          <h2>Flujo Completo de Autenticación y Operación Protegida</h2>
          <p className="subtitulo-panel">
            Inicia sesión en <code>POST /api-token-auth/</code> para obtener un token del servidor y úsalo en <code>POST /api/operacion-protegida/</code>, contrastando el rechazo <strong>401 Unauthorized</strong> sin credencial frente al <strong>200 OK</strong> autenticado.
          </p>
        </div>
        <span className={`pildora-autenticacion ${token ? 'pildora-autenticacion-activa' : 'pildora-autenticacion-inactiva'}`}>
          {token ? `Autenticado: ${usuario}` : 'Sin token activo'}
        </span>
      </div>

      <div className="grilla-autenticacion">
        <div className="caja-autenticacion">
          <h3>1. Credenciales y Token del Servidor</h3>

          {!token ? (
            <form onSubmit={manejarLogin} className="formulario-autenticacion">
              <label className="grupo-campo">
                <span>Usuario</span>
                <input
                  type="text"
                  className="control-entrada"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  required
                  autoComplete="username"
                />
              </label>

              <label className="grupo-campo">
                <span>Contraseña</span>
                <input
                  type="password"
                  className="control-entrada"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  required
                  autoComplete="current-password"
                />
              </label>

              {errorLogin && <div className="caja-alerta alerta-error">{errorLogin}</div>}

              <button type="submit" className="boton boton-primario" disabled={cargandoLogin}>
                {cargandoLogin ? 'Autenticando...' : 'Iniciar sesión y recibir token'}
              </button>
            </form>
          ) : (
            <div className="tarjeta-token">
              <div className="meta-token">
                <span>Sesión iniciada como</span>
                <strong>{usuario}</strong>
              </div>
              <div className="caja-valor-token">
                <code>Authorization: Token {tokenVisible}</code>
              </div>
              <div className="acciones-token">
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={() => setMostrarToken((v) => !v)}
                >
                  {mostrarToken ? 'Ocultar token' : 'Mostrar token'}
                </button>
                <button type="button" className="boton boton-secundario" onClick={copiarToken}>
                  {copiado ? '¡Copiado!' : 'Copiar token'}
                </button>
                <button type="button" className="boton boton-peligro-contorno" onClick={onLogout}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="caja-autenticacion">
          <h3>2. Ejecutar Operación Protegida</h3>
          <p className="texto-ayuda-autenticacion">
            {token
              ? 'Tu sesión tiene un token válido. Puedes ejecutar la operación autorizada (200) o probar explícitamente el rechazo sin credencial (401).'
              : 'No tienes sesión iniciada. Al pulsar el botón se enviará la petición sin credencial para verificar el rechazo 401 del servidor.'}
          </p>

          <div className="acciones-protegidas">
            <button
              type="button"
              className="boton boton-primario"
              disabled={cargandoOperacion}
              onClick={() => ejecutarOperacion({ forzarSinCredencial: false })}
            >
              {cargandoOperacion
                ? 'Enviando petición...'
                : token
                  ? 'Ejecutar operación protegida (con Token)'
                  : 'Ejecutar operación protegida (sin credencial)'}
            </button>

            {token && (
              <button
                type="button"
                className="boton boton-peligro-contorno"
                disabled={cargandoOperacion}
                onClick={() => ejecutarOperacion({ forzarSinCredencial: true })}
              >
                Probar rechazo 401 (sin token)
              </button>
            )}
          </div>

          {resultadoOperacion && (
            <div
              className={`inspector-http ${
                resultadoOperacion.ok ? 'inspector-http-exito' : 'inspector-http-error'
              }`}
              role="status"
            >
              <div className="cabecera-inspector-http">
                <span
                  className={`insignia-estado ${
                    resultadoOperacion.ok ? 'estado-200' : 'estado-401'
                  }`}
                >
                  HTTP {resultadoOperacion.status} {resultadoOperacion.statusText}
                </span>
                <span className="etiqueta-cabecera-auth">
                  {resultadoOperacion.conCredencial
                    ? 'Cabecera enviada: Authorization: Token ...'
                    : 'Sin cabecera Authorization'}
                </span>
              </div>
              <p className="resumen-inspector-http">
                {resultadoOperacion.ok
                  ? 'Operación autorizada y ejecutada exitosamente por el servidor.'
                  : resultadoOperacion.status === 401
                    ? 'Acceso denegado (401 Unauthorized): el endpoint requiere un token de autenticación válido.'
                    : 'El servidor devolvió un error al procesar la solicitud.'}
              </p>
              <pre className="vista-json">
                {JSON.stringify(resultadoOperacion.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {historial.length > 0 && (
        <div className="historial-autenticacion">
          <h4>Registro reciente de llamadas de autenticación</h4>
          <ul>
            {historial.map((ev) => (
              <li key={ev.id}>
                <span className={`punto-estado ${ev.ok ? 'punto-exito' : 'punto-error'}`} />
                <span className="numero-monoespaciado">{ev.hora}</span>
                <code>
                  {ev.metodo} {ev.endpoint}
                </code>
                <span className={`mini-estado ${ev.ok ? 'mini-exito' : 'mini-error'}`}>
                  {ev.estado}
                </span>
                <span>{ev.detalle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
