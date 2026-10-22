import axios from 'react';

const api = axios.create({
  baseURL: '/api',
});

export default api;
