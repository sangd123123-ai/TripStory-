// src/assets/api/index.js
import axios from 'axios';

// ✅ 개발환경(3000 포트)에서는 API_BASE를 '' 로 해서 같은 오리진처럼 보이게 -> 쿠키 붙게
const API_BASE = '';
// ===== accessToken 메모리/로컬 동기화 =====
let accessToken =
  (typeof window !== 'undefined' &&
    window.localStorage.getItem('accessToken')) ||
  null;

// ===== 공용 axios 인스턴스 =====
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // 쿠키(rt) 주고받으려면 필수
  headers: { 'Content-Type': 'application/json' },
});

// ===== 요청 인터셉터: Authorization 자동 첨부 =====
api.interceptors.request.use((cfg) => {
  if (accessToken) {
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

// ===== 응답 인터셉터: 401이면 한 번만 refresh 시도 =====
let refreshing = null; // 동시에 여러 요청 401 -> 한 번만 /auth/refresh 날리고 모두 대기

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original || original._retry) {
        return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      try {
        if (!refreshing) {
          // refreshToken은 httpOnly 쿠키라서 withCredentials 필요
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

        // 원래 요청 다시 쏘기
        original._retry = true;
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newAT}`,
        };
        original.withCredentials = true;   // ✅ refresh 이후 재시도에 쿠키 강제 포함
        original.baseURL = API_BASE;
        return api.request(original);
      } catch (e) {
        // refresh도 실패 -> 로그인 안 된 상태로 정리
        accessToken = null;
        window.localStorage.removeItem('accessToken');
        delete api.defaults.headers.Authorization;
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

// ===== 공개 Auth API =====
export const Auth = {
  /** 회원가입 */
  async register(arg1, password, nickname, extra = {}) {
    // 두 스타일 모두 허용: register({email, password, ...}) 또는 register(email, password, nickname)
    let body;
    if (typeof arg1 === 'object' && arg1 !== null) {
      body = arg1;
    } else {
      body = { email: arg1, password, nickname, ...extra };
    }
    const { data } = await api.post('/auth/register', body);
    return data.user;
  },

  /** 로그인 -> accessToken 저장 + user 리턴 */
  async login(userId, password) {
    const { data } = await axios.post(
      `${API_BASE}/auth/login`,
      { userId, password },
      { withCredentials: true } // refreshToken 쿠키 심어주는 응답 받아야 하니까
    );

    accessToken = data?.accessToken || null;
    if (accessToken) {
      window.localStorage.setItem('accessToken', accessToken);
      api.defaults.headers.Authorization = `Bearer ${accessToken}`;
    }

    return data?.user || null;
  },

  /** 내 정보 조회 */
  async me() {
    const { data } = await api.get('/auth/me');
    return data?.user || null;
  },

  /** 로그아웃 -> 서버 세션/쿠키 정리 + 프론트 토큰 비우기 */
  async logout() {
    await axios.post(`${API_BASE}/auth/logout`, null, {
      withCredentials: true,
    });
    accessToken = null;
    window.localStorage.removeItem('accessToken');
    delete api.defaults.headers.Authorization;
  },

  /** 앱 부팅 시(새로고침 직후 등) refresh 먼저 시도해서 세션 복구 */
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

  /** 소셜로그인 등에서 받은 토큰 주입 */
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