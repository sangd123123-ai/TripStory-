// src/components/Main/NoticeStrip.jsx
import React, { useEffect, useState } from 'react';
import { fetchRecentNotices } from '../../assets/api/notice';

export default function NoticeStrip({ onOpen }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchRecentNotices(5).then(setItems).catch(console.error);
  }, []);

  if (!items.length) return null;

  return (
    <div className="notice-strip">
      <h3 className="notice-strip__title">📢 최근 공지</h3>
      <div className="notice-strip__list">
        {items.map((n) => (
          <button key={n._id} className="notice-pill" onClick={() => onOpen?.(n._id)}>
            {n.title}
          </button>
        ))}
      </div>
      <style>{`
        .notice-strip {
          margin: 1rem 0;
          padding: 1rem 1.2rem;
          border-radius: 1rem;
          background: rgba(0,0,0,.04);
        }
        .notice-strip__title {
          margin: 0 0 .6rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: #1a2980;
        }
        .notice-strip__list {
          display: flex;
          gap: .5rem;
          flex-wrap: wrap;
        }
        .notice-pill {
          padding: .45rem .85rem;
          border-radius: 999px;
          background: #fff;
          border: 1px solid rgba(0,0,0,.08);
          cursor: pointer;
          font-size: 0.88rem;
          color: #1a2980;
          transition: transform .15s ease, box-shadow .15s ease;
          text-align: left;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .notice-pill:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,.08); }
        @media (max-width: 480px) {
          .notice-strip { padding: .75rem 1rem; }
          .notice-pill { font-size: 0.82rem; max-width: calc(100vw - 80px); }
        }
      `}</style>
    </div>
  );
}