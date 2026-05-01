// src/assets/api/admin.js
import axios from 'axios';

// --- API_BASE: 빈 문자열로 고정 (same-origin) ---
const API_BASE = '';

console.log('[AdminApi] API_BASE =', API_BASE);

// --- 토큰 저장 (관리자만 쓰는 전용 key) ---
const KEY = 'adminAccess';
const getToken = () => localStorage.getItem(KEY);
const setToken = (t) =>
  t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY);

// --- refresh: 쿠키 기반 재발급 ---
async function refresh() {
  const url = `${API_BASE}/admin-auth/refresh`;
  const res = await axios.post(url, null, {
    withCredentials: true,
    timeout: 15000,
  });
  return res.data?.accessToken;
}

// --- axios 인스턴스 ---
const admin = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // <- httpOnly refresh 쿠키 주고받기
  timeout: 15000,
});

// --- 요청 인터셉터: Authorization 헤더에 adminAccess 붙이기 ---
admin.interceptors.request.use((cfg) => {
  const tk = getToken();
  if (tk) cfg.headers.Authorization = `Bearer ${tk}`;
  return cfg;
});

// --- 응답 인터셉터: 401 자동 복구 (동시요청 큐 처리) ---
let isRefreshing = false;
let waiters = [];

admin.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config || {};
    const status = err?.response?.status;

    // 이미 재시도 한 번 했거나 401 아니면 그냥 실패 리턴
    if (status !== 401 || cfg.__retry) return Promise.reject(err);
    cfg.__retry = true;

    if (!isRefreshing) {
      // 내가 첫 401이야 -> refresh 시작
      isRefreshing = true;
      try {
        const newTk = await refresh();
        if (!newTk) throw new Error('no_new_token_from_refresh');
        setToken(newTk);

        // 대기중이던 요청들 깨우기
        waiters.forEach((w) => w.resolve(newTk));
      } catch (e) {
        waiters.forEach((w) => w.reject(e));
        throw e;
      } finally {
        isRefreshing = false;
        waiters = [];
      }
    } else {
      // 누군가 이미 refresh 중이면 기다렸다가 새 토큰 받기
      const newTk = await new Promise((resolve, reject) => {
        waiters.push({ resolve, reject });
      });
      setToken(newTk);
    }

    // 새 토큰으로 원래 요청 다시 쏘기
    cfg.headers = cfg.headers || {};
    const tk = getToken();
    if (tk) cfg.headers.Authorization = `Bearer ${tk}`;
    return admin(cfg);
  }
);

// --- 외부에서 쓰는 관리자 API ---
const AdminApi = {
  // 로그인
  async login(userId, password) {
    const { data } = await admin.post('/admin-auth/lgn', {
      userId,
      password,
    });
    if (data?.accessToken) setToken(data.accessToken);
    return data;
  },

  // (선택) 관리자 회원가입
  async register(payload) {
    const { data } = await admin.post('/admin-auth/register', payload);
    return data;
  },

  // 로그아웃
  async logout() {
    try {
      await admin.post('/admin-auth/logout');
    } finally {
      setToken(null);
    }
  },

  // 수동 refresh (버튼 눌러서 강제 재발급 등)
  async manualRefresh() {
    const newTk = await refresh();
    if (newTk) setToken(newTk);
    return newTk;
  },

  // 내 정보
  async me() {
    const { data } = await admin.get('/admin-auth/me');
    return data;
  },

  // 토큰 getter/setter
  getAccessToken: getToken,
  setAccessToken: setToken,
};

// 호환 유지용 export들
export default AdminApi;
export const manualRefresh = AdminApi.manualRefresh;
export { API_BASE };
export { admin as http };
export { AdminApi as AdminAuth };