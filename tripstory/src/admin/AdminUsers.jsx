// src/admin/AdminUsers.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LuSearch,
  LuRefreshCw,
  LuChevronLeft,
  LuChevronRight,
  LuFileDown,
  LuTrash2,
  LuPencil,
} from "react-icons/lu";
import adminApi from "./AdminApi";

/* ===== 스타일 토큰 ===== */
const C = {
  primary: "#26d0ce",
  head: "#2a3958",
  headBg: "#f8fbff",
  line: "#e6eef7",
  text: "#213047",
  textDim: "#6b7a90",
};

const th = {
  padding: "10px 8px",
  fontWeight: 700,
  fontSize: 14,
  color: C.head,
  whiteSpace: "nowrap",
  textAlign: "left",
};
const td = {
  padding: "10px 8px",
  fontSize: 14,
  color: C.text,
  verticalAlign: "middle",
  lineHeight: 1.2,
  wordBreak: "keep-all",
};

// 버튼
const BTN_W = 84,
  BTN_H = 30;
const BTN_W_SM = 48,
  BTN_H_SM = 24; // 삭제 더 작게
const btnBase = {
  height: BTN_H,
  width: BTN_W,
  fontSize: 13,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  cursor: "pointer",
  borderRadius: 999,
};
const btn = {
  ...btnBase,
  border: "1px solid #d9e4ef",
  background: "#fff",
  color: "#24457a",
};
const btnDanger = {
  ...btnBase,
  border: "1px solid #ffb4b4",
  background: "#fff",
  color: "#c0392b",
};
const btnPrimary = {
  border: 0,
  padding: "10px 14px",
  borderRadius: 10,
  background: C.primary,
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(38,208,206,.25)",
};
const btnGhost = {
  border: "1px solid #d9e4ef",
  padding: "10px 12px",
  borderRadius: 10,
  background: "#fff",
  color: "#24457a",
  fontWeight: 700,
  cursor: "pointer",
};

export default function AdminUsers() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [sort, setSort] = useState("lastLogin:desc");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [checked, setChecked] = useState(new Set());
  const [editUser, setEditUser] = useState(null);
  const editNameRef = useRef(null);

  const getId = (u) => u?._id || u?.id;
  const getRole = (u) => u?.role || "user";
  const getStatus = (u) => (u?.isBlocked ? "blocked" : "active");
  const getUserId = (u) =>
    u?.userId || u?.userid || u?.username || (u?.email ? u.email.split("@")[0] : "-");

  const fmtDate = (x) => {
    if (!x) return "-";
    try {
      const d = new Date(x);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}.${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return String(x);
    }
  };

  const fetchList = async (opts = {}) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminApi.get("/admin/users", {
        params: {
          page,
          size,
          sort,
          query: q || undefined,
          role: role || undefined,
          status: status || undefined,
          ...opts,
        },
      });
      setList(data.items || []);
      setTotal(data.total ?? 0);
      setChecked(new Set());
    } catch (e) {
      setError(e?.response?.data?.message || "목록 조회 중 오류");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, sort]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, size))),
    [total, size]
  );

  const toggleAll = (e) => {
    const next = new Set();
    if (e.target.checked) list.forEach((u) => next.add(getId(u)));
    setChecked(next);
  };
  const toggleOne = (id) => {
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);
  };

  const bulkAction = async (action) => {
    if (checked.size === 0) return alert("선택된 사용자가 없어요.");
    if (action === "delete" && !window.confirm("선택한 사용자를 삭제할까요?")) return;

    try {
      const ids = Array.from(checked);
      await adminApi.post("/admin/users/bulk", { ids, action });
      if (action === "delete") {
        setList((prev) => prev.filter((u) => !ids.includes(getId(u))));
        setTotal((t) => Math.max(0, t - ids.length));
      } else {
        const toBlocked = action === "block";
        setList((prev) =>
          prev.map((u) =>
            ids.includes(getId(u)) ? { ...u, isBlocked: toBlocked } : u
          )
        );
      }
      setChecked(new Set());
    } catch (e) {
      alert(e?.response?.data?.message || "일괄 작업 실패");
    }
  };

  const updateRole = async (u, toRole) => {
    try {
      await adminApi.patch(`/admin/users/${getId(u)}`, { role: toRole });
      setList((p) =>
        p.map((x) => (getId(x) === getId(u) ? { ...x, role: toRole } : x))
      );
    } catch (e) {
      alert(e?.response?.data?.message || "권한 변경 실패");
    }
  };
  const toggleStatusOne = async (u) => {
    const next = !u.isBlocked;
    try {
      await adminApi.patch(`/admin/users/${getId(u)}`, { isBlocked: next });
      setList((p) =>
        p.map((x) => (getId(x) === getId(u) ? { ...x, isBlocked: next } : x))
      );
    } catch (e) {
      alert(e?.response?.data?.message || "상태 변경 실패");
    }
  };
  const removeOne = async (u) => {
    if (!window.confirm(`${getUserId(u) || u.name || u.email} 삭제할까요?`)) return;
    try {
      await adminApi.delete(`/admin/users/${getId(u)}`);
      setList((p) => p.filter((x) => getId(x) !== getId(u)));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      alert(e?.response?.data?.message || "삭제 실패");
    }
  };

  const exportCSV = () => {
    const rows = [
      ["userId", "name", "email", "role", "status", "createdAt", "lastLogin"],
      ...list.map((u) => [
        safe(getUserId(u)),
        safe(u.name),
        safe(u.email),
        safe(getRole(u)),
        safe(getStatus(u)),
        fmtDate(u.createdAt),
        fmtDate(u.lastLogin),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `users_page${page}.csv`;
    a.click();
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        width: "min(1100px,98%)",
        margin: "0 auto",
        paddingBottom: 16,
      }}
    >
      {/* 검색/필터 */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "#fff",
            border: "1px solid #d9e4ef",
            borderRadius: 10,
            padding: "4px 10px",
            width: isMobile ? "100%" : undefined,
            height: 38,
            boxSizing: "border-box",
          }}
        >
          <LuSearch size={18} color="#6b7a90" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchList({ page: 1 })}
            placeholder="아이디, 이름, 이메일 검색"
            style={{ border: "none", outline: "none", flex: 1, minWidth: 0, height: 30, fontSize: 14 }}
          />
          <button onClick={() => fetchList({ page: 1 })} style={{ ...btnPrimary, height: 30, padding: "0 14px", flexShrink: 0 }}>
            검색
          </button>
          <button
            onClick={() => {
              setQ(""); setRole(""); setStatus(""); setSort("createdAt:desc"); setPage(1); fetchList({ page: 1 });
            }}
            style={{ ...btnGhost, height: 30, flexShrink: 0 }}
            title="초기화"
          >
            <LuRefreshCw />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); fetchList({ page: 1, role: e.target.value || undefined }); }}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d9e4ef", height: 36 }}
          >
            <option value="">전체 권한</option>
            <option value="user">일반</option>
            <option value="admin">관리자</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); fetchList({ page: 1, status: e.target.value || undefined }); }}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d9e4ef", height: 36 }}
          >
            <option value="">전체 상태</option>
            <option value="active">정상</option>
            <option value="blocked">차단</option>
          </select>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d9e4ef", height: 36 }}
          >
            <option value="createdAt:desc">가입순(최근)</option>
            <option value="createdAt:asc">가입순(오래됨)</option>
            <option value="lastLogin:desc">최근 로그인</option>
            <option value="name:asc">이름 A→Z</option>
          </select>
          <button onClick={exportCSV} style={btnGhost}><LuFileDown /> CSV</button>
        </div>
      </div>

      {/* 일괄 작업 바 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          border: "1px solid #e6eef7",
          borderRadius: 12,
          background: "#fff",
          boxShadow: "0 4px 12px rgba(31,64,135,.05)",
        }}
      >
        <div style={{ color: C.textDim, fontSize: 14 }}>
          선택: <b>{checked.size}</b>명
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ ...btn, height: 30 }} onClick={() => bulkAction("block")}>일괄 차단</button>
          <button style={{ ...btn, height: 30 }} onClick={() => bulkAction("unblock")}>차단 해제</button>
          <button style={{ ...btnDanger, height: 30 }} onClick={() => bulkAction("delete")}>일괄 삭제</button>
        </div>
      </div>

      {/* 테이블 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e6eef7",
          boxShadow: "0 8px 20px rgba(31,64,135,.06)",
          padding: 8,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead style={{ background: C.headBg }}>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={list.length > 0 && checked.size === list.length}
                />
              </th>
              {/* 총합 100% 맞춤: 19 + 9 + 10 + 10 + 14 + 12 + 19 + 7 + 40px(체크박스) */}
              <th style={{ ...th, width: "19%" }}>아이디/이메일</th>
              <th style={{ ...th, width: "9%" }}>이름</th>
              <th style={{ ...th, width: "10%", textAlign: "center" }}>권한</th>
              <th style={{ ...th, width: "10%", textAlign: "center" }}>상태</th>
              <th style={{ ...th, width: "14%" }}>가입일</th>
              <th style={{ ...th, width: "12%" }}>최근 로그인</th>
              <th style={{ ...th, width: "19%", textAlign: "center" }}>작업</th>
              <th style={{ ...th, width: "7%", textAlign: "center" }}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 20 }}>불러오는 중…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 20 }}>결과가 없어요</td></tr>
            ) : (
              list.map((u, i) => (
                <tr key={getId(u)} style={{ background: i % 2 ? "#fbfdff" : "#fff", borderTop: `1px solid ${C.line}` }}>
                  <td><input type="checkbox" checked={checked.has(getId(u))} onChange={() => toggleOne(getId(u))} /></td>

                  {/* 아이디/이메일 */}
                  <td style={{ ...td, overflow: "hidden" }}>
                    <div style={{ display: "grid", maxWidth: "100%" }}>
                      <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getUserId(u)}
                      </b>
                      <small style={{ color: C.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.email || "-"}
                      </small>
                    </div>
                  </td>

                  {/* 이름 */}
                  <td style={{ ...td, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.name || "-"}
                  </td>

                  <td style={{ ...td, textAlign: "center" }}>{roleBadge(getRole(u))}</td>
                  <td style={{ ...td, textAlign: "center" }}>{statusBadge(getStatus(u))}</td>

                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(u.lastLogin)}</td>

                  {/* 작업: 세로정렬 + 중앙 */}
                  <td style={{ ...td, textAlign: "center" }}>
                    <div
                      style={{
                        display: "grid",
                        gridAutoRows: `${BTN_H}px`,
                        gap: 6,
                        justifyItems: "center",
                        alignContent: "center",
                        width: BTN_W,
                        margin: "0 auto",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button style={btn} onClick={() => updateRole(u, getRole(u) === "admin" ? "user" : "admin")}>
                        {getRole(u) === "admin" ? "일반" : "관리자"}
                      </button>
                      <button style={btn} onClick={() => toggleStatusOne(u)}>
                        {u.isBlocked ? "해제" : "차단"}
                      </button>
                      <button style={btn} onClick={() => setEditUser(u)}>
                        <LuPencil style={{ marginRight: 4 }} />편집
                      </button>
                    </div>
                  </td>

                  {/* 삭제: 소형 버튼 */}
                  <td style={{ ...td, textAlign: "center" }}>
                    <button
                      style={{ ...btnDanger, width: BTN_W_SM, height: BTN_H_SM }}
                      onClick={() => removeOne(u)}
                      title="삭제"
                    >
                      <LuTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
        <button style={btn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          <LuChevronLeft /> 이전
        </button>
        <b>{page}</b> / {totalPages}
        <button style={btn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          다음 <LuChevronRight />
        </button>
      </div>

      {error && (
        <div style={{ background: "#fff5f5", border: "1px solid #ffd7d7", color: "#8a1c1c", borderRadius: 12, padding: 12 }}>
          {error}
        </div>
      )}

      {/* 편집 모달 */}
      {editUser && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 30 }}
          onClick={() => setEditUser(null)}
        >
          <div
            style={{ width: "min(560px,96vw)", background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 20px 50px rgba(0,0,0,.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>유저 편집</h3>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <label>이름</label>
              <input
                ref={editNameRef}
                value={editUser.name || ""}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #d9e4ef" }}
              />
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <label>이메일</label>
              <input
                value={editUser.email || ""}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #d9e4ef" }}
              />
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <label>권한</label>
              <select
                value={getRole(editUser)}
                onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #d9e4ef" }}
              >
                <option value="user">일반</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <label>상태</label>
              <select
                value={getStatus(editUser)}
                onChange={(e) => setEditUser({ ...editUser, isBlocked: e.target.value === "blocked" })}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #d9e4ef" }}
              >
                <option value="active">정상</option>
                <option value="blocked">차단</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={() => setEditUser(null)} style={btnGhost}>닫기</button>
              <button
                onClick={async () => {
                  const id = getId(editUser);
                  const payload = { role: getRole(editUser), isBlocked: getStatus(editUser) === "blocked" };
                  try { await adminApi.patch(`/admin/users/${id}`, payload); setEditUser(null); fetchList(); alert("저장 완료"); }
                  catch (e) { alert(e?.response?.data?.message || "저장 실패"); }
                }}
                style={btnPrimary}
              >저장</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: C.textDim }}>
              * 현재 백엔드는 권한/상태만 저장됩니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 뱃지/보조 ===== */
function roleBadge(role) {
  const map = { admin: ["관리자", "#1a73e8"], user: ["일반", "#64748b"] };
  const [t, col] = map[role] || ["-", "#94a3b8"];
  return (
    <span style={{ padding: "4px 8px", borderRadius: 999, background: hexToRgba(col, 0.12), border: `1px solid ${hexToRgba(col, 0.3)}`, color: col }}>
      {t}
    </span>
  );
}
function statusBadge(st) {
  const map = { active: ["정상", "#16a34a"], blocked: ["차단", "#ef4444"] };
  const [t, col] = map[st] || ["-", "#94a3b8"];
  return (
    <span style={{ padding: "4px 8px", borderRadius: 999, background: hexToRgba(col, 0.12), border: `1px solid ${hexToRgba(col, 0.3)}`, color: col }}>
      {t}
    </span>
  );
}
function csvEscape(x) { const s = String(x ?? ""); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; }
function safe(x) { return x == null ? "" : String(x); }
function hexToRgba(hex, a = 1) {
  const h = hex.replace("#", "");
  const b = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (b >> 16) & 255, g = (b >> 8) & 255, bl = b & 255;
  return `rgba(${r},${g},${bl},${a})`;
}
