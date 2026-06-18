// src/admin/bridgeAuth.js — ✅ 최종 확정판
import AdminApi, { http as adminHttp } from '../assets/api/admin';
import { Auth } from '../assets/api/index';

// 공용 키(참고용): 관리자 액세스 토큰
export const ADMIN_ACCESS_KEY = 'adminAccess';
const LEGACY_ADMIN_ACCESS_KEY = 'adminAccessToken';

/** 관리자 로그인 성공 시, 유저/관리자 모두에 토큰 주입 */
export function syncFromAdminLogin(accessToken) {
  try {
    // 1) 관리자 측(로컬스토리지 + axios)
    if (typeof AdminApi.setAccessToken === 'function') {
      AdminApi.setAccessToken(accessToken);
    } else {
      localStorage.setItem(ADMIN_ACCESS_KEY, accessToken);
      localStorage.removeItem(LEGACY_ADMIN_ACCESS_KEY);
      adminHttp.defaults.headers.Authorization = `Bearer ${accessToken}`;
    }

    // 2) 유저 측(내정보/일반메뉴가 의존)
    //   ※ 이 호출이 중요: 내부 accessToken 변수까지 갱신됨
    Auth.setAccessToken(accessToken);
  } catch (err) {
    console.error('syncFromAdminLogin 오류:', err);
  }
}

/** 로그아웃 시 양쪽 세션 모두 정리 */
export function clearBothSessions() {
  try {
    if (typeof AdminApi.setAccessToken === 'function') AdminApi.setAccessToken(null);
    else {
      localStorage.removeItem(ADMIN_ACCESS_KEY);
      localStorage.removeItem(LEGACY_ADMIN_ACCESS_KEY);
      delete adminHttp.defaults.headers.Authorization;
    }
    Auth.setAccessToken(null);
  } catch (err) {
    console.error('clearBothSessions 오류:', err);
  }
}

/** 관리자 쿠키(rt) 기반 리프레시 폴백 */
export async function tryAdminRefreshFallback() {
  try {
    // ✅ 실제 관리자 axios 인스턴스 사용
    const r = await adminHttp.get('/admin-auth/refresh', { withCredentials: true });
    const at = r.data?.accessToken;
    if (at) {
      // 관리자/유저 모두에 주입
      if (typeof AdminApi.setAccessToken === 'function') AdminApi.setAccessToken(at);
      else {
        localStorage.setItem(ADMIN_ACCESS_KEY, at);
        localStorage.removeItem(LEGACY_ADMIN_ACCESS_KEY);
        adminHttp.defaults.headers.Authorization = `Bearer ${at}`;
      }
      Auth.setAccessToken(at);
      return at;
    }
  } catch (err) {
    console.error('tryAdminRefreshFallback 오류:', err);
  }
  return null;
}
