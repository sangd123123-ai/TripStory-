import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth } from '../../assets/api/index';
import { AuthContext } from '../../context/AuthContext';
import './Login.css';

// 백엔드 절대 URL입니다. 배포환경에서는 REACT_APP_API_URL로 설정됩니다.
const API = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

export default function Login({ onAuthed }) {
  const nav = useNavigate();
  const { reload } = useContext(AuthContext);

  const [userId, setUserId] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    try {
      const user = await Auth.login(userId, pw);
      onAuthed?.(user);
      await reload();
      setUserId('');
      setPw('');
      nav(user?.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || '로그인에 실패했습니다.';
      setMsg(message);
    }
  };

  return (
    <main className="login-page">
      <form onSubmit={onSubmit} className="login-card" aria-labelledby="loginTitle">
        <h2 id="loginTitle" className="login-title">로그인</h2>

        <label htmlFor="uid" className="label">아이디</label>
        <input
          id="uid"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="아이디를 입력하세요"
          className="input"
          autoComplete="username"
        />

        <label htmlFor="pw" className="label">비밀번호</label>
        <input
          id="pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          className="input"
          autoComplete="current-password"
        />

        <button className="btn-primary" type="submit">로그인</button>

        {msg && <p className="msg" role="alert">{msg}</p>}

        <div className="divider"><span>또는</span></div>

        <nav className="social-stack" aria-label="소셜 로그인">
          <a
            className="btn-social kakao"
            href={`${API}/auth/kakao`}
            aria-label="카카오로 로그인"
            rel="nofollow noopener"
          >
            <svg className="kakao-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3C7.03 3 3 6.25 3 10.14c0 2.43 1.6 4.56 4.03 5.86l-.83 3.15a.5.5 0 0 0 .76.55l3.57-2.12c.48.07.98.11 1.47.11 4.97 0 9-3.25 9-7.55C21 6.25 16.97 3 12 3z" />
            </svg>
            <span>카카오로 로그인</span>
          </a>

          <a
            className="btn-social google"
            href={`${API}/auth/google`}
            aria-label="Google로 로그인"
            rel="nofollow noopener"
          >
            <img
              className="social-icon"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            <span>Google로 로그인</span>
          </a>
        </nav>

        <p className="sub">
          아직 계정이 없으신가요? <Link to="/join">회원가입</Link>
        </p>
      </form>
    </main>
  );
}
