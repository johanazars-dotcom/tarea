import axios from 'axios';

const api = axios.create({
    baseURL: 'https://precio-compras-medicamentos.onrender.com/',
});

export default api;