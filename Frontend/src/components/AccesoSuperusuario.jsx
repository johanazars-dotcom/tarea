import { useState } from 'react';
import { postSinToken, validarTokenSuperusuario } from '../api';

export default function AccesoSuperusuario() {
  const [usuarioAdmin, setUsuarioAdmin] = useState('');
  const [claveAdmin, setClaveAdmin] = useState('');
  const [tokenIngresado, setTokenIngresado] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);

  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [cargandoValidacion, setCargandoValidacion] = useState(false);
  const [resultado, setResultado] = useState(null);

  const evaluarToken = async (tokenAProbar, origen) => {
    setCargandoValidacion(true);
    const tokenLimpio = (tokenAProbar || '').trim();

    try {
      const response = await validarTokenSuperusuario(tokenLimpio);
      setResultado({
        tipo: 'exito',
        estado: response.status,
        titulo: 'Superusuario verificado',
        origen,
        conToken: Boolean(tokenLimpio),
        payload: response.data,
      });
    } catch (err) {
      const status = err.response?.status || 500;
      const payload = err.response?.data || { detail: err.message };
      setResultado({
        tipo: status === 403 ? 'advertencia' : 'error',
        estado: status,
        titulo:
          status === 403
            ? 'Token válido, pero sin rol de superusuario'
            : status === 401
              ? 'Token rechazado o ausente (401 Unauthorized)'
              : 'Error de validación',
        origen,
        conToken: Boolean(tokenLimpio),
        payload,
      });
    } finally {
      setCargandoValidacion(false);
    }
  };

  const manejarLoginSuperusuario = async (e) => {
    e.preventDefault();
    setCargandoLogin(true);
    setResultado(null);

    try {
      const resLogin = await postSinToken('api-token-auth/', {
        username: usuarioAdmin.trim(),
        password: claveAdmin,
      });
      const nuevoToken = resLogin.data.token;
      setTokenIngresado(nuevoToken);
      setClaveAdmin('');
      await evaluarToken(nuevoToken, `Login independiente (${usuarioAdmin.trim()})`);
    } catch (err) {
      const status = err.response?.status || 400;
      const payload = err.response?.data || { detail: 'No fue posible iniciar sesión.' };
      setResultado({
        tipo: 'error',
        estado: status,
        titulo: 'Credenciales inválidas al solicitar token',
        origen: 'POST /api-token-auth/',
        conToken: false,
        payload,
      });
    } finally {
      setCargandoLogin(false);
    }
  };

  const limpiarPortal = () => {
    setUsuarioAdmin('');
    setClaveAdmin('');
    setTokenIngresado('');
    setResultado(null);
  };

  return (
    <section id="superusuario" className="portal-superusuario">
      <div className="encabezado-superusuario">
        <div>
          <span className="insignia-superusuario">Acceso Independiente · Validación de Rol</span>
          <h2>Portal de Login y Validación de Token de Superusuario</h2>
          <p className="subtitulo-superusuario">
            Inicio de sesión aislado y verificador directo contra <code>POST /api/validar-superusuario/</code> para confirmar si un token es auténtico (<code>200</code> vs <code>401</code>) y si pertenece a un superusuario (<code>200</code> vs <code>403</code>).
          </p>
        </div>
        <button type="button" className="boton-super-secundario" onClick={limpiarPortal}>
          Reiniciar portal
        </button>
      </div>

      <div className="grilla-superusuario">
        <form onSubmit={manejarLoginSuperusuario} className="tarjeta-login-superusuario">
          <div className="cabecera-tarjeta-super">
            <span className="icono-escudo" aria-hidden="true">🛡️</span>
            <div>
              <h3>Login aparte de Superusuario</h3>
              <p>Solicita el token y verifica privilegios en un solo flujo.</p>
            </div>
          </div>

          <label className="campo-superusuario">
            <span>Usuario superadministrador</span>
            <input
              type="text"
              className="entrada-superusuario"
              value={usuarioAdmin}
              onChange={(e) => setUsuarioAdmin(e.target.value)}
              placeholder="Ej. johann"
              required
              autoComplete="off"
            />
          </label>

          <label className="campo-superusuario">
            <span>Contraseña</span>
            <div className="fila-clave-super">
              <input
                type={mostrarClave ? 'text' : 'password'}
                className="entrada-superusuario"
                value={claveAdmin}
                onChange={(e) => setClaveAdmin(e.target.value)}
                placeholder="Contraseña del superusuario"
                required
                autoComplete="off"
              />
              <button
                type="button"
                className="boton-super-secundario"
                onClick={() => setMostrarClave((v) => !v)}
              >
                {mostrarClave ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="boton-super-primario"
            disabled={cargandoLogin || cargandoValidacion}
          >
            {cargandoLogin ? 'Validando acceso...' : 'Iniciar sesión y validar superusuario'}
          </button>
        </form>

        <div className="tarjeta-validador-superusuario">
          <div className="cabecera-tarjeta-super">
            <span className="icono-escudo" aria-hidden="true">🔑</span>
            <div>
              <h3>Validador manual de Token</h3>
              <p>Pega cualquier token emitido para comprobar su validez y nivel de acceso.</p>
            </div>
          </div>

          <label className="campo-superusuario">
            <span>Token a validar (sin el prefijo "Token ")</span>
            <input
              type="text"
              className="entrada-superusuario entrada-token-super"
              value={tokenIngresado}
              onChange={(e) => setTokenIngresado(e.target.value)}
              placeholder="Pega aquí el token hexadecimal..."
            />
          </label>

          <div className="acciones-validador-super">
            <button
              type="button"
              className="boton-super-primario"
              disabled={cargandoValidacion}
              onClick={() => evaluarToken(tokenIngresado, 'Validación manual con token')}
            >
              {cargandoValidacion ? 'Verificando...' : 'Validar token'}
            </button>
            <button
              type="button"
              className="boton-super-peligro"
              disabled={cargandoValidacion}
              onClick={() => evaluarToken('', 'Prueba sin credencial')}
            >
              Probar sin token (401)
            </button>
          </div>

          {resultado && (
            <div
              className={`resultado-superusuario resultado-super-${resultado.tipo}`}
              role="status"
            >
              <div className="cabecera-resultado-super">
                <span className={`etiqueta-estado-super estado-super-${resultado.tipo}`}>
                  HTTP {resultado.estado}
                </span>
                <span className="origen-resultado-super">{resultado.origen}</span>
              </div>
              <p className="titulo-resultado-super">{resultado.titulo}</p>
              <pre className="json-superusuario">
                {JSON.stringify(resultado.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
