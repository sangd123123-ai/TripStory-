import React, { useState, useEffect } from 'react';
import './ThemeTravel.css';

const ThemeTravelCard = ({ travel }) => {
  return (
    <div className="theme-card">
      <div className="theme-image">
        <img
          src={travel.imageUrl || 'https://via.placeholder.com/400x250?text=Travel'}
          alt={travel.title}
          loading="lazy"
        />
        <span className="theme-category-badge">{travel.category}</span>
      </div>

      <div className="theme-content">
        <h3 className="theme-title">{travel.title}</h3>
        
        <div className="theme-info">
          <p>📍 {travel.location}</p>
          {travel.bestSeason && <p>🌸 {travel.bestSeason}</p>}
          {travel.duration && <p>⏱️ {travel.duration}</p>}
        </div>

        <p className="theme-description">{travel.description}</p>

        {travel.tags && travel.tags.length > 0 && (
          <div className="theme-tags">
            {travel.tags.map((tag, idx) => (
              <span key={idx} className="theme-tag">#{tag}</span>
            ))}
          </div>
        )}

        {travel.activities && travel.activities.length > 0 && (
          <div className="theme-activities">
            <strong>추천 활동:</strong>
            <p>{travel.activities.join(', ')}</p>
          </div>
        )}

        <div className="theme-extra">
          {travel.difficulty && <p>🎯 난이도: {travel.difficulty}</p>}
          {travel.budget && <p>💰 예상 예산: {travel.budget}</p>}
        </div>

        {travel.tips && (
          <div className="theme-tips">
            <strong>💡 여행 팁:</strong>
            <p>{travel.tips}</p>
          </div>
        )}

        {travel.website && (
          <a
            href={travel.website}
            target="_blank"
            rel="noopener noreferrer"
            className="theme-link"
          >
            🔗 자세히 보기 →
          </a>
        )}
      </div>
    </div>
  );
};

function ThemeTravelList() {
  const [travels, setTravels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('인생샷 감성 여행');

  const API_BASE = process.env.REACT_APP_API_URL || '';

  useEffect(() => {
    const loadTravels = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `${API_BASE}/api/theme-travel/category/${encodeURIComponent(selectedCategory)}`;
        
        console.log('🔍 테마여행 요청 URL:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 응답 상태:', response.status);

        if (!response.ok) {
          throw new Error(`서버 응답 오류: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('❌ 잘못된 Content-Type:', contentType);
          throw new Error('JSON 형식이 아닌 응답을 받았습니다.');
        }

        const result = await response.json();
        console.log('✅ 응답 데이터:', result);

        if (!result.success) {
          throw new Error(result.message || '데이터를 불러오는데 실패했습니다.');
        }

        console.log('📊 데이터 출처:', result.source);
        
        setTravels(result.data);
        
      } catch (err) {
        console.error('❌ 테마여행 데이터 로딩 오류:', err);
        setError(err.message || '테마여행 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadTravels();
  }, [selectedCategory]);

  const categories = [
    { icon: '✨', name: '인생샷 감성 여행' },
    { icon: '🐶', name: '반려견과 함께하는 여행' },
    { icon: '🌿', name: '힐링 자연여행' },
    { icon: '🌊', name: '바다 감성 여행' },
    { icon: '⛺', name: '캠핑 & 차박 여행' },
    { icon: '🍜', name: '로컬 맛집 탐방 여행' },
    { icon: '🏝️', name: '섬 여행' },
    { icon: '🏡', name: '감성 숙소 여행' },
    { icon: '🚴‍♀️', name: '액티브 어드벤처 여행' },
    { icon: '🌆', name: '도심 속 감성 여행' }
  ];

  if (loading) {
    return (
      <div className="theme-loading-container">
        <div className="theme-loading-spinner"></div>
        <p>테마여행 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="theme-error-container">
        <p>⚠️ {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="theme-retry-btn"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="theme-container">
      <header className="theme-header">
        <h1>🗺️ 테마별 여행 추천</h1>
        <p>나만의 스타일로 떠나는 특별한 여행</p>
      </header>

      <div className="theme-category-filter">
        {categories.map((category) => (
          <button
            key={category.name}
            className={`theme-category-btn ${
              selectedCategory === category.name ? 'active' : ''
            }`}
            onClick={() => setSelectedCategory(category.name)}
          >
            <span className="category-icon">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      <div className="theme-grid">
        {travels.length === 0 ? (
          <div className="theme-no-data">
            <p>등록된 테마여행이 없습니다.</p>
          </div>
        ) : (
          travels.map((travel, idx) => (
            <ThemeTravelCard key={travel._id || travel.id || idx} travel={travel} />
          ))
        )}
      </div>
    </div>
  );
}

export default ThemeTravelList;