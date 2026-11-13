import { useState } from 'react';
import fotoHospitalPrincipal from '../../assets/hospital-principal.jpg';
import { API_BASE_URL, postSinToken, validarTokenSuperusuario } from '../../shared/api';
import { IconoCruzHospital, IconoEscudoConfianza, IconoUbicacion } from '../../shared/IconosSalud';

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
      <div className="contenedor-acceso-hospitalario">
        <aside className="panel-presentacion-acceso">
          <div className="marca-acceso-hospital">
            <span className="emblema-cruz-salud">
              <IconoCruzHospital size={24} />
            </span>
            <div>
              <span className="eyebrow-salud">Gestión Farmacéutica Hospitalaria</span>
              <p className="nombre-institucion-acceso">Precios y Compras de Medicamentos</p>
            </div>
          </div>

          <figure className="figura-acceso-hospital">
            <img
              src={fotoHospitalPrincipal}
              alt="Profesional de la salud atendiendo con cercanía a una paciente en área de recepción y farmacia hospitalaria"
            />
          </figure>

          <div className="mensaje-presentacion-acceso">
            <h2>Información farmacéutica clara, verificada y accesible</h2>
            <p>
              Plataforma de consulta y auditoría de precios unitarios, volúmenes adquiridos y reportes oficiales en formato PDF para el seguimiento responsable de compras médicas.
            </p>
            <p className="ubicacion-acceso">
              <IconoUbicacion size={17} />
              <span>Sogamoso, Boyacá, Colombia · Proyecto ADSO - SENA (Ficha 3171062)</span>
            </p>
          </div>
        </aside>

        <section className="tarjeta-acceso-superusuario" aria-label="Inicio de sesión de superusuario">
          <div className="cabecera-acceso-superusuario">
            <span className="insignia-rol-superusuario">
              <IconoEscudoConfianza size={16} />
              Acceso autorizado · Superusuario
            </span>
            <h1>Ingreso al portal institucional</h1>
            <p className="descripcion-acceso-superusuario">
              Ingresa con tu usuario y contraseña de superadministrador o valida un token de acceso emitido por el servidor.
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
                {cargando ? 'Validando acceso...' : 'Iniciar sesión y validar acceso'}
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
            <span>Servidor activo: <code>{API_BASE_URL}</code></span>
            <span>Verificación segura mediante <code>POST /api/validar-superusuario/</code></span>
          </div>
        </section>
      </div>
    </div>
  );
}
