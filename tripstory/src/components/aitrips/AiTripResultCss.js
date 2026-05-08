// ✅ AiTripResultCss.js (TripStory 컬러 타임라인 스타일)
import styled from "styled-components";

export const ResultContainer = styled.div`
  max-width: 900px;
  margin: 40px auto;
  padding: 20px;
  background: linear-gradient(to bottom right, #e0f2ff, #faf5ff);
  border-radius: 20px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    margin: 16px auto;
    padding: 14px 12px;
    border-radius: 14px;
  }
`;

export const TimelineDay = styled.div`
  margin: 40px 0;
  padding: 24px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.08);

  @media (max-width: 768px) {
    margin: 20px 0;
    padding: 16px 12px;
  }
`;

export const DayHeader = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #2563eb;
  border-left: 5px solid #9333ea;
  padding-left: 12px;
  margin-bottom: 20px;
`;

export const TripTimelineItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  box-shadow: 0 4px 10px rgba(147, 51, 234, 0.08);
  transition: all 0.25s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15);
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

export const TimeBadge = styled.div`
  min-width: 70px;
  text-align: center;
  background: linear-gradient(90deg, #60a5fa, #a78bfa);
  color: white;
  border-radius: 8px;
  padding: 6px 10px;
  font-weight: 600;
`;

export const TripImage = styled.img`
  width: 160px;
  height: 110px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.03);
  }

  @media (max-width: 768px) {
    width: 100%;
    height: 180px;
    flex-shrink: unset;
  }
`;

export const TripContent = styled.div`
  flex: 1;
  h3 {
    color: #1e3a8a;
    font-weight: 700;
    margin-bottom: 6px;
  }
  p {
    color: #374151;
    font-size: 14px;
    line-height: 1.5;
    margin: 2px 0;
  }
  a {
    color: #2563eb;
    font-weight: 600;
    text-decoration: none;
    &:hover {
      color: #9333ea;
      text-decoration: underline;
    }
  }
`;

export const CostBox = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(to right, #eef2ff, #fdf4ff);
  border-radius: 12px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);

  h4 {
    color: #3b82f6;
    margin-bottom: 10px;
  }
  ul {
    margin: 0;
    padding-left: 20px;
  }
  li {
    color: #374151;
    font-size: 14px;
    margin: 4px 0;
  }
`;

export const ActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 30px;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const ActionButton = styled.button`
  padding: 12px 24px;
  background: linear-gradient(to right, #60a5fa, #a78bfa);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.25s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 14px;
  }
`;
