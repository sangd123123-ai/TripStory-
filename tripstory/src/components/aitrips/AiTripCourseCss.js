// AiTripCourseCss.js
import styled from 'styled-components';

export const Container = styled.div`
  background: linear-gradient(180deg, #e0f7fa 0%, #f3e8ff 40%, #fff 100%);
  background-attachment: fixed;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 60px 20px;

  @media (max-width: 768px) {
    padding: 24px 12px;
  }
`;

export const MaxWidthContainer = styled.div`
  max-width: 960px;
  width: 100%;
`;

export const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

export const HeaderIconContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
`;

export const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #9333ea;

  @media (max-width: 480px) {
    font-size: 1.4rem;
  }
`;

export const Subtitle = styled.p`
  color: #6b7280;
  font-size: 1rem;
  margin-top: 8px;
`;
