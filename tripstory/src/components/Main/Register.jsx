// src/components/Auth/Register.jsx
import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Auth } from "../../assets/api/index";
import "./Register.css";

export default function Register() {
  const nav = useNavigate();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [nick, setNick] = useState("");
  const [addr, setAddr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const pwTooShort = pw && pw.length < 8;
  const pwMismatch = pw && pw2 && pw !== pw2;
  const missingRequired = !(userId && email && pw && pw2 && name && nick);
  const canSubmit = !missingRequired && !pwTooShort && !pwMismatch && !loading;

  const hint = useMemo(() => {
    if (pwTooShort) return "비밀번호는 8자 이상을 권장합니다.";
    if (pwMismatch) return "비밀번호가 서로 일치하지 않습니다.";
    return "";
  }, [pwTooShort, pwMismatch]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setMsg("");
    setLoading(true);

    try {
      const payload = {
        userId,
        email,
        password: pw,
        name,
        nickname: nick,
        address: addr,
      };

      await Auth.register(payload);
      setMsg("회원가입이 완료되었습니다.");
      setUserId("");
      setEmail("");
      setPw("");
      setPw2("");
      setName("");
      setNick("");
      setAddr("");
      setTimeout(() => nav("/login", { replace: true }), 600);
    } catch (err) {
      const message = err?.response?.data?.message || "회원가입에 실패했습니다.";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="reg-wrap reg-vertical" onSubmit={onSubmit} noValidate>
      <h2 className="reg-title">회원가입</h2>

      <label className="label" htmlFor="userId">아이디</label>
      <input
        id="userId"
        className="input"
        type="text"
        placeholder="아이디를 입력하세요"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        required
      />

      <label className="label" htmlFor="email">이메일</label>
      <input
        id="email"
        className="input"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label className="label" htmlFor="pw">비밀번호</label>
      <input
        id="pw"
        className={`input ${pwTooShort ? "is-invalid" : ""}`}
        type="password"
        placeholder="8자 이상 입력"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        required
      />

      <label className="label" htmlFor="pw2">비밀번호 확인</label>
      <input
        id="pw2"
        className={`input ${pwMismatch ? "is-invalid" : ""}`}
        type="password"
        placeholder="비밀번호를 한 번 더 입력"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        required
      />

      {hint && <p className="hint">{hint}</p>}

      <label className="label" htmlFor="name">이름</label>
      <input
        id="name"
        className="input"
        type="text"
        placeholder="이름을 입력하세요"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label className="label" htmlFor="nick">닉네임</label>
      <input
        id="nick"
        className="input"
        type="text"
        placeholder="표시할 이름"
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        required
      />

      <label className="label" htmlFor="addr">주소 (선택)</label>
      <input
        id="addr"
        className="input"
        type="text"
        placeholder="거주지 또는 배송지"
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
      />

      <button className="btn-primary" type="submit" disabled={!canSubmit}>
        {loading ? "가입 중..." : "가입하기"}
      </button>

      {msg && <p className="msg">{msg}</p>}

      <p className="sub">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </form>
  );
}
