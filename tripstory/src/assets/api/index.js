// src/assets/api/index.js
import axios from 'axios';

// 개발환경은 proxy를 쓰기 위해 빈 문자열을 사용하고, 배포환경은 Render 백엔드 URL을 사용합니다.
const API_BASE = process.env.REACT_APP_API_URL || '';

let accessToken =
  (typeof window !== 'undefined' &&
    window.localStorage.getItem('accessToken')) ||
  null;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  if (accessToken) {
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original || original._retry) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (sessionStorage.getItem('auth_logged_out')) {
        return Promise.reject(error);
      }

      try {
        if (!refreshing) {
          refreshing = axios
            .post(`${API_BASE}/auth/refresh`, null, { withCredentials: true })
            .then((r) => {
              accessToken = r.data?.accessToken || null;
              if (accessToken) {
                window.localStorage.setItem('accessToken', accessToken);
                api.defaults.headers.Authorization = `Bearer ${accessToken}`;
              } else {
                window.localStorage.removeItem('accessToken');
                delete api.defaults.headers.Authorization;
              }
              return accessToken;
            })
            .finally(() => {
              refreshing = null;
            });
        }

        const newAT = await refreshing;
        if (!newAT) throw error;

        original._retry = true;
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newAT}`,
        };
        original.withCredentials = true;
        original.baseURL = API_BASE;
        return api.request(original);
      } catch (e) {
        accessToken = null;
        window.localStorage.removeItem('accessToken');
        delete api.defaults.headers.Authorization;
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

export const Auth = {
  async register(arg1, password, nickname, extra = {}) {
    const body =
      typeof arg1 === 'object' && arg1 !== null
        ? arg1
        : { email: arg1, password, nickname, ...extra };

    const { data } = await api.post('/auth/register', body);
    return data.user;
  },

  async login(userId, password) {
    const { data } = await axios.post(
      `${API_BASE}/auth/login`,
      { userId, password },
      { withCredentials: true }
    );

    accessToken = data?.accessToken || null;
    if (accessToken) {
      window.localStorage.setItem('accessToken', accessToken);
      api.defaults.headers.Authorization = `Bearer ${accessToken}`;
    }
    sessionStorage.removeItem('auth_logged_out');

    return data?.user || null;
  },

  async me() {
    const { data } = await api.get('/auth/me');
    return data?.user || null;
  },

  async logout() {
    await axios.post(`${API_BASE}/auth/logout`, null, {
      withCredentials: true,
    });
    accessToken = null;
    window.localStorage.removeItem('accessToken');
    delete api.defaults.headers.Authorization;
    sessionStorage.setItem('auth_logged_out', '1');
  },

  async bootRefresh() {
    try {
      const r = await axios.post(
        `${API_BASE}/auth/refresh`,
        null,
        { withCredentials: true }
      );
      accessToken = r.data?.accessToken || null;

      if (accessToken) {
        window.localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.Authorization = `Bearer ${accessToken}`;
      } else {
        window.localStorage.removeItem('accessToken');
        delete api.defaults.headers.Authorization;
      }

      return !!accessToken;
    } catch {
      accessToken = null;
      window.localStorage.removeItem('accessToken');
      delete api.defaults.headers.Authorization;
      return false;
    }
  },

  setAccessToken(token) {
    accessToken = token || null;
    if (token) {
      window.localStorage.setItem('accessToken', token);
      api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      window.localStorage.removeItem('accessToken');
      delete api.defaults.headers.Authorization;
    }
  },
};

export default api;
