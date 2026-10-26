import axios from 'axios';

export const apiClient = axios.create({
  baseURL: ((import.meta as any).env?.VITE_API_URL as string) || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  let token = localStorage.getItem('urbanwine_token');

  // Nếu token trong localStorage bị undefined/null, thử trích xuất từ urbanwine_user
  if (!token || token === 'undefined' || token === 'null') {
    const userStr = localStorage.getItem('urbanwine_user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        token = userObj.token || userObj.accessToken;
        if (token && token !== 'undefined' && token !== 'null') {
          localStorage.setItem('urbanwine_token', token);
        }
      } catch (e) {
        console.error('Error parsing urbanwine_user from localStorage', e);
      }
    }
  }

  if (token && token !== 'undefined' && token !== 'null' && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
