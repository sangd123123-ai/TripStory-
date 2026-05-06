// src/admin/AdminAuth.jsx — 2025-10-28 교체본
// - 로그인 성공 시 accessToken 확보 → 브리지 주입(syncFromAdminLogin)
// - 토큰이 응답에 없으면 /admin-auth/refresh로 폴백 시도
// - 이미 로그인된 상태면 바로 /admin 이동
// - 내정보/일반메뉴에서도 admin 토큰을 활용할 수 있게 강제 새로고침

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminGlobal } from './AdminTheme';
import AdminApi from '../assets/api/admin';

// 🔽 추가: 관리자 토큰 브리지 유틸 (키: adminAccessToken)
import { syncFromAdminLogin, tryAdminRefreshFallback } from './bridgeAuth';

export default function AdminAuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ userId:'', password:'', email:'', name:'', secret:'' });
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');

  // 바디에 admin 클래스 부여(스타일용)
  useEffect(() => {
    document.body.classList.add('admin');
    return () => document.body.classList.remove('admin');
  }, []);

  // 이미 로그인돼 있으면 바로 /admin
  useEffect(() => {
    (async () => {
      try {
        if (typeof AdminApi.me === 'function') {
          const u = await AdminApi.me();
          if (u && (u.role === 'admin' || (Array.isArray(u.roles) && u.roles.includes('admin')))) {
            setMe(u);
            nav('/admin', { replace: true });
          }
        }
      } catch {}
    })();
  }, [nav]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const doLogin = async () => {
    setErr('');
    try {
      // 1) 로그인 시도
      const res = await AdminApi.login(form.userId, form.password);

      // 응답 형태 유연 처리
      const accessToken =
        res?.accessToken ||
        res?.data?.accessToken ||
        res?.token ||
        res?.data?.token;

      let at = accessToken;

      // 2) 토큰이 응답에 없으면 refresh 폴백 시도 (쿠키 기반)
      if (!at) {
        const fallback = await tryAdminRefreshFallback(); // /admin-auth/refresh 시도
        if (fallback) at = fallback;
      }

      // 3) 토큰이 있으면 전역 axios에도 주입
      if (at) {
        // 토큰 브리지 (axios 인스턴스들 Authorization 맞추기)
        syncFromAdminLogin(at);

        // 🔥 여기 추가: 방금 로그인한 관리자 정보 한 번 더 가져와서 저장
        // 이 값은 AppShell이 새로 렌더될 때 user/admin 상태로 활용될 수 있게 해줘
        let adminProfile = null;
        try {
          // AdminApi.me()는 관리자용 /admin-auth/me 를 호출한다고 가정
          adminProfile = await AdminApi.me();
        } catch (e) {
          adminProfile = null;
        }

        // 관리자인지 확인하고 로컬에도 남겨
        if (adminProfile) {
          // 이건 임시 저장소야. AppShell에서 필요하다면 가져다 쓸 수 있어.
          // (만약 AppShell이 localStorage 쪽도 읽도록 우리가 만들면 즉시 반영됨)
          localStorage.setItem('adminProfile', JSON.stringify(adminProfile));
        }

        // 4) 관리자 대시보드로 이동
        window.location.href = '/admin';
        return;
      }

      // 여기까지 왔으면 토큰 하나도 못 얻은 상황
      throw new Error('관리자 토큰을 받지 못했습니다.');
    } catch (e) {
      console.error('[AdminLogin error]', e?.response?.data || e?.message);
      setErr(
        e?.response?.data?.msg ||
          e?.response?.data?.message ||
          e?.message ||
          '로그인 실패'
      );
    }
  };

  const doRegister = async () => {
    setErr('');
    try {
      if (typeof AdminApi.register === 'function') {
        await AdminApi.register({
          userId: form.userId,
          password: form.password,
          email: form.email,
          name: form.name,
          secret: form.secret,
        });
        setMode('login');
      } else {
        setErr('회원가입은 백엔드에 준비되지 않았습니다.');
      }
    } catch (e) {
      setErr(e?.response?.data?.msg || e?.response?.data?.message || '회원가입 실패');
    }
  };

  const doLogout = async () => {
    try {
      if (typeof AdminApi.logout === 'function') await AdminApi.logout();
    } finally {
      setMe(null);
    }
  };

  return (
    <>
      <AdminGlobal />
      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-brand">TripStory Admin</div>
        </header>

        <div className="admin-container">
          <div className="admin-card">
            <h2 className="admin-title">{mode === 'login' ? '관리자 로그인' : '관리자 회원가입'}</h2>
            <p className="admin-desc">TripStory 운영자 전용 페이지입니다.</p>

            {mode === 'register' && (
              <div className="admin-field">
                <label>이메일</label>
                <input name="email" value={form.email} onChange={onChange} placeholder="admin@example.com" />
              </div>
            )}

            <div className="admin-field">
              <label>아이디</label>
              <input name="userId" value={form.userId} onChange={onChange} placeholder="admin01" />
            </div>

            <div className="admin-field">
              <label>비밀번호</label>
              <input type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••••" />
            </div>

            {mode === 'register' && (
              <>
                <div className="admin-field">
                  <label>이름</label>
                  <input name="name" value={form.name} onChange={onChange} placeholder="홍길동" />
                </div>
                <div className="admin-field">
                  <label>관리자 가입 코드(옵션)</label>
                  <input name="secret" value={form.secret} onChange={onChange} placeholder="환경변수 ADMIN_SIGNUP_SECRET" />
                </div>
              </>
            )}

            {err && <div className="admin-note" style={{ color: 'salmon' }}>{err}</div>}

            <div className="admin-actions">
              {mode === 'login' ? (
                <>
                  <button className="btn btn-primary" onClick={doLogin}>로그인</button>
                  <button className="btn btn-secondary" onClick={() => setMode('register')}>관리자 회원가입</button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={doRegister}>회원가입</button>
                  <button className="btn btn-secondary" onClick={() => setMode('login')}>로그인으로</button>
                </>
              )}
            </div>

            {me && (
              <div className="admin-note" style={{ marginTop: 12 }}>
                현재 로그인: <b>{me.name || me.userId}</b>{' '}
                {Array.isArray(me.roles) && me.roles.length ? `(${me.roles.join(', ')})` : ''}
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-secondary" onClick={doLogout}>로그아웃</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}