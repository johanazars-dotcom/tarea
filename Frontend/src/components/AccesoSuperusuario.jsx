import { useState } from 'react';
import { API_BASE_URL, postSinToken, validarTokenSuperusuario } from '../api';

export default function AccesoSuperusuario({ onAccesoAutorizado }) {
  const [modo, setModo] = useState('credenciales');
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [tokenManual, setTokenManual] = useState('');

  const [cargando, setCargando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const validarYEntrar = async (tokenAValidar) => {
    const tokenLimpio = (tokenAValidar || '').trim();
    try {
      const response = await validarTokenSuperusuario(tokenLimpio);
      const data = response.data;
      if (data?.es_superusuario) {
        onAccesoAutorizado(tokenLimpio, data.usuario);
        return;
      }
      setFeedback({
        tipo: 'advertencia',
        estado: 403,
        titulo: 'Acceso denegado: la cuenta no es superusuario',
        payload: data,
      });
    } catch (err) {
      const status = err.response?.status || 500;
      const payload = err.response?.data || { detail: err.message };
      setFeedback({
        tipo: status === 403 ? 'advertencia' : 'error',
        estado: status,
        titulo:
          status === 403
            ? 'Token válido, pero sin privilegios de superusuario'
            : status === 401
              ? 'Rechazo 401: token ausente o inválido'
              : 'Error al validar el token en el servidor',
        payload,
      });
    }
  };

  const manejarSubmitCredenciales = async (e) => {
    e.preventDefault();
    setCargando(true);
    setFeedback(null);

    try {
      const resLogin = await postSinToken('api-token-auth/', {
        username: usuario.trim(),
        password: clave,
      });
      const nuevoToken = resLogin.data.token;
      setClave('');
      await validarYEntrar(nuevoToken);
    } catch (err) {
      const status = err.response?.status || 400;
      const payload = err.response?.data || { detail: 'No se pudo conectar con el servidor.' };
      setFeedback({
        tipo: 'error',
        estado: status,
        titulo: 'Usuario o contraseña incorrectos',
        payload,
      });
    } finally {
      setCargando(false);
    }
  };

  const manejarValidacionManual = async (e) => {
    e.preventDefault();
    setCargando(true);
    setFeedback(null);
    await validarYEntrar(tokenManual);
    setCargando(false);
  };

  const probarSinCredencial = async () => {
    setCargando(true);
    setFeedback(null);
    await validarYEntrar('');
    setCargando(false);
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setFeedback(null);
  };

  return (
    <div className="pantalla-acceso-superusuario">
      <div className="tarjeta-acceso-superusuario">
        <div className="barra-superior-acceso" />

        <div className="cabecera-acceso-superusuario">
          <div className="icono-acceso-superusuario" aria-hidden="true">
            🛡️
          </div>
          <span className="insignia-rol-superusuario">Acceso Exclusivo · Superusuario</span>
          <h1>Panel de Precios y Compras de Medicamentos</h1>
          <p className="descripcion-acceso-superusuario">
            Inicia sesión con tu cuenta de superadministrador o valida un token emitido para acceder al panel.
          </p>
        </div>

        <div className="selector-modo-acceso" role="tablist" aria-label="Método de acceso">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'credenciales'}
            className={`boton-modo-acceso ${modo === 'credenciales' ? 'boton-modo-activo' : ''}`}
            onClick={() => cambiarModo('credenciales')}
          >
            Usuario y contraseña
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'token'}
            className={`boton-modo-acceso ${modo === 'token' ? 'boton-modo-activo' : ''}`}
            onClick={() => cambiarModo('token')}
          >
            Validar token
          </button>
        </div>

        {modo === 'credenciales' ? (
          <form onSubmit={manejarSubmitCredenciales} className="formulario-acceso-superusuario">
            <label className="grupo-campo">
              <span>Usuario superadministrador</span>
              <input
                type="text"
                className="control-entrada"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ej. johann"
                required
                autoComplete="username"
              />
            </label>

            <label className="grupo-campo">
              <span>Contraseña</span>
              <div className="campo-clave-acceso">
                <input
                  type={mostrarClave ? 'text' : 'password'}
                  className="control-entrada"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="boton boton-secundario boton-ver-clave"
                  onClick={() => setMostrarClave((v) => !v)}
                >
                  {mostrarClave ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>

            <button type="submit" className="boton boton-primario boton-ancho-completo" disabled={cargando}>
              {cargando ? 'Validando superusuario...' : 'Iniciar sesión y validar acceso'}
            </button>
          </form>
        ) : (
          <form onSubmit={manejarValidacionManual} className="formulario-acceso-superusuario">
            <label className="grupo-campo">
              <span>Token de autenticación</span>
              <input
                type="text"
                className="control-entrada numero-monoespaciado"
                value={tokenManual}
                onChange={(e) => setTokenManual(e.target.value)}
                placeholder="Pega aquí el token hexadecimal..."
              />
            </label>

            <div className="acciones-doble-acceso">
              <button type="submit" className="boton boton-primario" disabled={cargando}>
                {cargando ? 'Validando...' : 'Validar token e ingresar'}
              </button>
              <button
                type="button"
                className="boton boton-peligro-contorno"
                disabled={cargando}
                onClick={probarSinCredencial}
              >
                Probar sin token (401)
              </button>
            </div>
          </form>
        )}

        {feedback && (
          <div
            className={`alerta-validacion-super alerta-validacion-${feedback.tipo}`}
            role="alert"
          >
            <div className="cabecera-alerta-super">
              <span className={`insignia-estado-acceso estado-acceso-${feedback.tipo}`}>
                HTTP {feedback.estado}
              </span>
              <strong>{feedback.titulo}</strong>
            </div>
            <pre className="vista-json">{JSON.stringify(feedback.payload, null, 2)}</pre>
          </div>
        )}

        <div className="pie-tarjeta-acceso">
          <span>Servidor: <code>{API_BASE_URL}</code></span>
          <span>Validado mediante <code>POST /api/validar-superusuario/</code></span>
        </div>
      </div>
    </div>
  );
}
