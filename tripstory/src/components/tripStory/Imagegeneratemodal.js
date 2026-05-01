import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// ===================================
// 🎨 Styled Components
// ===================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 20px;
  padding: 40px 35px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  position: relative;

  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(30px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 28px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #64748b;
  }
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #64748b;
  margin-bottom: 30px;
`;

const InfoBox = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  border: 2px solid #e2e8f0;
`;

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.span`
  font-weight: 600;
  color: #475569;
  min-width: 70px;
`;

const Value = styled.span`
  color: #1e293b;
  flex: 1;
`;

const Divider = styled.div`
  height: 1px;
  background: #e2e8f0;
  margin: 25px 0;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 15px;
`;

const InputGroup = styled.div`
  margin-bottom: 20px;
`;

const InputLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 8px;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4f46e5;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #1e293b;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4f46e5;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 30px;
`;

const Button = styled.button`
  flex: 1;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.$primary ? `
    background: #4f46e5;
    color: white;

    &:hover {
      background: #4338ca;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }

    &:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  ` : `
    background: #f1f5f9;
    color: #475569;

    &:hover {
      background: #e2e8f0;
    }
  `}
`;

const LoadingText = styled.div`
  text-align: center;
  color: #64748b;
  font-size: 14px;
  margin-top: 15px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const PreviewBox = styled.div`
  margin-top: 30px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
`;

const PreviewImage = styled.img`
  width: 100%;
  border-radius: 10px;
  margin-bottom: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const PreviewTitle = styled.h4`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
`;

const PreviewMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const Badge = styled.span`
  background: #e0e7ff;
  color: #4338ca;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const CutsMessage = styled.p`
  font-size: 14px;
  color: #64748b;
  margin-bottom: 30px;
  text-align: center;
  background: #f1f5f9;
  padding: 10px;
  border-radius: 8px;
`;

// ===================================
// 🎨 ImageGenerateModal Component
// ===================================

function ImageGenerateModal({ tripData, onClose, user }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    mood: '',
    companion: '',
    budget: '',
    purpose: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedStory, setGeneratedStory] = useState(null);

  const numCuts = Math.min(Math.max(4, Math.ceil((tripData.content || '').length / 100)), 5);


  // 이미지 URL 자동 보정
  const getImageUrl = (url) => {
    if (!url) return '/img/noimage.png';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_URL || ''}${url}`;
  };

  // AI 이미지 생성 및 트립스토리 미리보기
  const handleGenerate = async () => {
    if (!user) {
      alert('로그인 후 이용 가능합니다.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        mood: form.mood || '일반',
        companion: form.companion,
        budget: form.budget,
        purpose: form.purpose
      };

      // 미리보기 API 엔드포인트 사용
      const apiUrl = `/api/tripstory/ai/preview-webtoon-from-mytrip/${tripData._id}`;
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errData = await response.json();
          throw new Error(errData.error || '사용 횟수를 초과했습니다.');
        }
        throw new Error('웹툰 미리보기 생성 실패');
      }

      const result = await response.json();
      setGeneratedStory(result); // 미리보기 데이터 저장
      alert('✅ 웹툰 미리보기가 생성되었습니다. 확인 후 게시해주세요!');
      
    } catch (err) {
      console.error('웹툰 미리보기 생성 실패:', err);
      alert(`웹툰 미리보기 생성에 실패했습니다: ${err.message}. 다시 시도해주세요.`);
    } finally {
      setLoading(false);
    }
  };

  // 트립스토리 게시
  const handlePublish = async () => {
    if (!user || !generatedStory) {
      alert('로그인 정보가 없거나 생성된 스토리가 없습니다.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      
      const response = await fetch('/api/tripstory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          title: generatedStory.title,
          region: generatedStory.region,
          mood: generatedStory.mood,
          keywords: generatedStory.keywords,
          content: generatedStory.content,
          imageUrls: generatedStory.imageUrls,
          travelDate: generatedStory.travelDate,
        })
      });

      if (!response.ok) {
        throw new Error('트립스토리 게시 실패');
      }

      const result = await response.json();
      alert('✅ 트립스토리가 성공적으로 게시되었습니다!');
      navigate('/tripstory/feed', { state: { refetch: true } }); // 피드로 이동 및 새로고침
      onClose(); // 모달 닫기

    } catch (err) {
      console.error('트립스토리 게시 실패:', err);
      alert(`트립스토리 게시 실패: ${err.message}. 다시 시도해주세요.`);
    } finally {
      setLoading(false);
    }
  };

  // 트립스토리로 이동 (이전 기능, 이제 사용 안 함)
  const handleViewInFeed = () => {
    navigate('/tripstory/feed', { state: { refetch: true } });
    onClose();
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>×</CloseButton>
        
        <Title>🎨 AI 이미지 생성</Title>
        <Subtitle>여행기록을 바탕으로 감성적인 이미지를 만들어드려요</Subtitle>
        <CutsMessage>여행 기록 길이에 따라 자동으로 **{numCuts}컷**의 웹툰이 생성됩니다.</CutsMessage>

        {/* 여행기록 정보 */}
        <InfoBox>
          <InfoRow>
            <Label>📍 지역:</Label>
            <Value>{tripData.location}</Value>
          </InfoRow>
          <InfoRow>
            <Label>📝 제목:</Label>
            <Value>{tripData.title}</Value>
          </InfoRow>
          <InfoRow>
            <Label>📅 날짜:</Label>
            <Value>{tripData.date}</Value>
          </InfoRow>
          {tripData.hashtags && tripData.hashtags.length > 0 && (
            <InfoRow>
              <Label>🏷️ 태그:</Label>
              <Value>{tripData.hashtags.join(', ')}</Value>
            </InfoRow>
          )}
        </InfoBox>

        <Divider />

        {/* 추가 옵션 */}
        {!generatedStory && (
          <>
            <SectionTitle>✨ 이미지 스타일 선택 (선택사항)</SectionTitle>
            
            <InputGroup>
              <InputLabel>분위기</InputLabel>
              <Select 
                value={form.mood} 
                onChange={(e) => setForm({ ...form, mood: e.target.value })}
              >
                <option value="">선택하세요</option>
                <option value="감성">감성적인</option>
                <option value="힐링">힐링</option>
                <option value="활기찬">활기찬</option>
                <option value="낭만">낭만적인</option>
                <option value="모험">모험적인</option>
              </Select>
            </InputGroup>

            <InputGroup>
              <InputLabel>동행 타입</InputLabel>
              <Select 
                value={form.companion} 
                onChange={(e) => setForm({ ...form, companion: e.target.value })}
              >
                <option value="">선택하세요</option>
                <option value="혼자">혼자</option>
                <option value="친구">친구</option>
                <option value="가족">가족</option>
                <option value="연인">연인</option>
              </Select>
            </InputGroup>

            <InputGroup>
              <InputLabel>여행 목적</InputLabel>
              <Select 
                value={form.purpose} 
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              >
                <option value="">선택하세요</option>
                <option value="휴양">휴양 (힐링)</option>
                <option value="관광">관광 (명소투어)</option>
                <option value="맛집">맛집 (미식)</option>
                <option value="액티비티">액티비티 (체험)</option>
              </Select>
            </InputGroup>

            <InputGroup>
              <InputLabel>예산</InputLabel>
              <Select 
                value={form.budget} 
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              >
                <option value="">선택하세요</option>
                <option value="저렴">저렴 (가성비)</option>
                <option value="보통">보통 (일반)</option>
                <option value="럭셔리">럭셔리 (고급)</option>
              </Select>
            </InputGroup>
          </>
        )}

        {/* 생성 결과 미리보기 */}
        {generatedStory && (
          <PreviewBox>
            <PreviewTitle>✅ 이미지 생성 완료!</PreviewTitle>
            <PreviewMeta>
              <Badge>📍 {generatedStory.region}</Badge>
              {generatedStory.mood && <Badge>✨ {generatedStory.mood}</Badge>}
              {generatedStory.companion && <Badge>👥 {generatedStory.companion}</Badge>}
            </PreviewMeta>
            {generatedStory.imageUrls && generatedStory.imageUrls.map((url, index) => (
              <PreviewImage 
                key={index}
                src={getImageUrl(url)} 
                alt={`${generatedStory.title} - cut ${index + 1}`}
              />
            ))}
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              트립스토리 커뮤니티에 자동으로 게시되었습니다!
            </p>
          </PreviewBox>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <LoadingText>
            ✨ AI가 이미지를 생성하고 있습니다... (30~60초 소요)
          </LoadingText>
        )}

        {/* 버튼 */}
        <ButtonGroup>
          {!generatedStory ? (
            <>
              <Button onClick={onClose}>취소</Button>
              <Button 
                $primary 
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? '생성 중...' : '🎨 웹툰 미리보기 생성'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose}>닫기</Button>
              <Button 
                $primary 
                onClick={handlePublish}
                disabled={loading}
              >
                {loading ? '게시 중...' : '✅ 트립스토리 게시하기'}
              </Button>
            </>
          )}
        </ButtonGroup>
      </ModalContainer>
    </Overlay>
  );
}

export default ImageGenerateModal;