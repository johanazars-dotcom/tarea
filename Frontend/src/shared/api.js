import axios from 'axios';

const DEFAULT_LOCAL_API = 'http://127.0.0.1:8000/';
const DEFAULT_PROD_API = 'https://precio-compras-medicamentos.onrender.com/';

const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const RAW_API_URL =
  import.meta.env.VITE_API_URL || (isLocalHost ? DEFAULT_LOCAL_API : DEFAULT_PROD_API);

export const API_BASE_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL : `${RAW_API_URL}/`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Token ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export function postSinToken(endpoint, data = {}) {
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return axios.post(`${API_BASE_URL}${cleanEndpoint}`, data);
}

export function validarTokenSuperusuario(token) {
  const headers = token ? { Authorization: `Token ${token}` } : {};
  return axios.post(`${API_BASE_URL}api/validar-superusuario/`, {}, { headers });
}

export default api;
