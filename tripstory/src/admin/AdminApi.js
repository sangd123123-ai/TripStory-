// src/assets/api/admin.js — 충돌 없는 전체본
import axios from 'axios';

// === API_BASE: 빈 문자열로 고정 (same-origin) ===
const API_BASE = '';

console.log('[AdminApi] API_BASE =', API_BASE);

// === 토큰 로컬 저장키(관리자 전용) ===
const KEY = 'adminAccess';

function getToken() {
  return localStorage.getItem(KEY);
}
function setToken(t) {
  if (t) localStorage.setItem(KEY, t);
  else localStorage.removeItem(KEY);
}

// === 리프레시 호출(쿠키 필요) ===
async function refresh() {
  const url = `${API_BASE}/admin-auth/refresh`;
  const res = await axios.post(url, null, { withCredentials: true });
  return res.data?.accessToken;
}

// === 관리자용 axios 인스턴스 ===
const admin = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// === 요청 인터셉터: Bearer 자동 첨부 ===
admin.interceptors.request.use((cfg) => {
  const tk = getToken();
  if (tk) cfg.headers.Authorization = `Bearer ${tk}`;
  return cfg;
});

// === 401 처리: 1회 자동 재발급 ===
let isRefreshing = false;
let waiters = [];

admin.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config || {};
    const status = err?.response?.status;

    // 이미 한 번 재시도했거나, 401이 아니면 그대로 throw
    if (status !== 401 || cfg.__retry) return Promise.reject(err);
    cfg.__retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newTk = await refresh();
        if (!newTk) throw new Error('no_new_token');
        setToken(newTk);
        waiters.forEach(w => w.resolve(newTk));
      } catch (e) {
        waiters.forEach(w => w.reject(e));
        throw e;
      } finally {
        isRefreshing = false;
        waiters = [];
      }
    } else {
      // 갱신 진행 중이면 대기
      const newTk = await new Promise((resolve, reject) => waiters.push({ resolve, reject }));
      setToken(newTk);
    }

    // 원요청 재시도
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${getToken()}`;
    return admin(cfg);
  }
);

// === 공개 API ===
const AdminApi = {
  // 로그인: accessToken 수령 후 저장
  async login(userId, password) {
    const { data } = await admin.post('/admin-auth/lgn', { userId, password });
    if (data?.accessToken) setToken(data.accessToken);
    return data;
  },

  // 로그아웃: 서버 쿠키 제거 + 로컬 토큰 제거
  async logout() {
    try { await admin.post('/admin-auth/logout'); }
    finally { setToken(null); }
  },

  // 수동 재발급 버튼용
  async manualRefresh() {
    const newTk = await refresh();
    if (newTk) setToken(newTk);
    return newTk;
  },

  // 로그인 확인용(대시보드 진입 전 체크)
  async me() {
    const { data } = await admin.get('/admin-auth/me');
    return data;
  },

  // 토큰 getter/setter (다른 코드 호환용)
  getAccessToken: getToken,
  setAccessToken: setToken,
};

// === export 형태(충돌 방지) ===
// - default: AdminApi 객체 (기존 코드들이 기대하는 모양)
// - named: manualRefresh, API_BASE (이미 사용 중인 코드 호환)
export { http as default, manualRefresh, API_BASE, AdminAuth } from '../assets/api/admin';