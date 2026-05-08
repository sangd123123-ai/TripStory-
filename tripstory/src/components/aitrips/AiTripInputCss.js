// ✅ AiTripInputCss.js (TripStory 통합 스타일)
import styled from 'styled-components';

// 전체 카드
export const Card = styled.div`
  background: linear-gradient(to bottom right, #eef2ff, #faf5ff);
  border-radius: 24px;
  padding: 36px;
  max-width: 880px;
  margin: 40px auto;
  box-shadow: 0 12px 30px rgba(147, 51, 234, 0.08);
  backdrop-filter: blur(8px);

  @media (max-width: 768px) {
    padding: 20px 16px;
    margin: 16px auto;
    border-radius: 16px;
  }
`;

// 섹션 헤더
export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`;

// 입력창 영역
export const InputContainer = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0;
  background: #ffffff;
  border-radius: 16px;
  padding: 12px 18px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
  border: 1px solid #ede9fe;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 14px;
  }
`;

export const Input = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #374151;
  background: transparent;

  &::placeholder {
    color: #9ca3af;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

// 버튼
export const Button = styled.button`
  padding: 10px 22px;
  background: linear-gradient(90deg, #9333ea, #14b8a6);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.25s ease;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(147, 51, 234, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 12px;
  }
`;

// 로딩 스피너
export const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// 에러 박스
export const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef2f2;
  color: #991b1b;
  padding: 12px 16px;
  border-radius: 10px;
  margin-top: 12px;
  border: 1px solid #fecaca;
`;

// 인기 여행지
export const PopularSection = styled.div`
  margin-top: 20px;
`;

export const PopularLabel = styled.p`
  font-size: 15px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 10px;
`;

export const PopularButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const PopularButton = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
  background: #f5f3ff;
  color: #7c3aed;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(to right, #a78bfa, #c084fc);
    color: white;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

// 필터 영역
export const FilterSection = styled.div`
  margin-top: 28px;
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
`;

export const FilterGroup = styled.div`
  margin-bottom: 24px;
`;

export const FilterLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
`;

export const FilterOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const FilterOption = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  border: 2px solid ${props => props.$active ? '#9333ea' : '#e5e7eb'};
  background: ${props => props.$active ? 'linear-gradient(90deg, #9333ea, #14b8a6)' : 'white'};
  color: ${props => props.$active ? 'white' : '#374151'};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover:not(:disabled) {
    border-color: #9333ea;
    background: ${props => props.$active ? 'linear-gradient(90deg, #9333ea, #14b8a6)' : '#f5f3ff'};
    color: ${props => props.$active ? 'white' : '#7c3aed'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 13px;
  }
`;
