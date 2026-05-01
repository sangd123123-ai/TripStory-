import React, { useState } from 'react';
import { getAiStory } from '../../assets/api/tripStoryApi';

function TripStoryWrite({ user }) {
  const [form, setForm] = useState({ title: '', region: '', mood: '', keywords: [] });
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ AI 스토리 생성 (이미 DB에 저장됨)
  const handleSubmit = async () => {
    if (!user) return alert('로그인 후 이용 가능합니다.');
    setLoading(true);
    try {
      const res = await getAiStory(form);
      setStory(res);
      alert('✅ 스토리가 생성되고 저장되었습니다!');
    } catch (err) {
      console.error(err);
      alert('AI 스토리 생성 실패 (로그인 상태나 토큰을 확인해주세요)');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!form.title || !form.region) {
      alert('제목과 지역을 입력해주세요.');
      return;
    }
    handleSubmit();
  };

  const handleConfirm = () => {
    setStory(null);
    setForm({ title: '', region: '', mood: '', keywords: [] });
    alert('새로운 스토리를 작성할 수 있습니다!');
  };

  // ✅ 이미지 URL 자동 보정 함수
  const getImageUrl = (url) => {
    if (!url) return '/img/profile-placeholder.png';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_URL || ''}${url}`;
  };

  return (
    <div className="story-write">
      <div className="story-container">
        <h2 className="story-title">✏️ AI 여행 스토리 작성</h2>

        {/* 입력 영역 */}
        <div className="story-inputs">
          <input
            className="story-input"
            placeholder="제목"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="story-input"
            placeholder="지역 (예: 제주, 부산, 강릉)"
            value={form.region}
            onChange={e => setForm({ ...form, region: e.target.value })}
          />
          <input
            className="story-input"
            placeholder="분위기 (예: 감성, 힐링, 활기찬)"
            value={form.mood}
            onChange={e => setForm({ ...form, mood: e.target.value })}
          />
          <input
            className="story-input"
            placeholder="키워드 (쉼표로 구분)"
            value={form.keywords.join(',')}
            onChange={e => setForm({
              ...form,
              keywords: e.target.value.split(',').filter(k => k.trim())
            })}
          />
          <button
            className="story-btn"
            onClick={handleSubmit}
            disabled={loading || !user}
          >
            {loading ? '✨ AI가 스토리 작성 중... (30~60초)' : 'AI 스토리 생성 & 저장'}
          </button>
        </div>

        {/* 결과 영역 */}
        {story && (
          <div className="story-result">
            <div className="story-card">
              <h3>{story.title}</h3>
              
              {/* ✅ 이미지 표시 */}
              {(story.imageUrl || story.image_url) && (
                <img
                  src={getImageUrl(story.imageUrl || story.image_url)}
                  alt="AI 생성 이미지"
                  className="story-image"
                />
              )}
              
              <div className="story-text">
                {story.content.split('\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="story-actions">
                <button className="story-btn-secondary" onClick={handleRegenerate}>
                  🔁 다시 생성
                </button>
                <button className="story-btn-post" onClick={handleConfirm}>
                  ✅ 확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ 스타일 */}
      <style jsx="true">{`
        .story-write {
          background: linear-gradient(135deg, #eef5ff, #fdfcff);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 60px;
        }
        .story-container {
          width: 90%;
          max-width: 800px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          padding: 40px 30px;
          text-align: center;
          transition: 0.3s ease;
        }
        .story-container:hover { transform: translateY(-2px); }
        .story-title { font-size: 26px; font-weight: 700; margin-bottom: 30px; }
        .story-inputs {
          display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 24px;
        }
        .story-input {
          flex: 1 1 200px; padding: 10px 14px; border: 1px solid #ccc;
          border-radius: 8px; font-size: 14px; transition: border-color 0.2s;
        }
        .story-input:focus { border-color: #4a90e2; outline: none; }
        .story-btn {
          background: #007bff; color: white; border: none;
          border-radius: 8px; padding: 10px 18px; cursor: pointer;
          transition: 0.3s ease; font-weight: 600;
        }
        .story-btn:hover { background: #005fcc; }
        .story-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .story-card {
          text-align: left;
          margin-top: 40px;
          padding: 20px;
          border-radius: 12px;
          background: #f9fbff;
          box-shadow: 0 3px 10px rgba(0,0,0,0.05);
          animation: fadeIn 0.5s ease;
        }
        .story-image {
          width: 100%; border-radius: 10px; margin: 15px 0;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        .story-text p { line-height: 1.7; margin: 10px 0; color: #333; }
        .story-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        .story-btn-secondary {
          background: #f0f0f0; border: none; border-radius: 8px;
          padding: 8px 14px; cursor: pointer; transition: 0.2s;
        }
        .story-btn-secondary:hover { background: #e0e0e0; }
        .story-btn-post {
          background: #28a745; color: #fff; border: none; border-radius: 8px;
          padding: 8px 14px; cursor: pointer; transition: 0.2s;
        }
        .story-btn-post:hover { background: #218838; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default TripStoryWrite;
