// TripStoryFeed.js (최종 수정본 - 여행기록 불러오기 추가)
import React, { useEffect, useState } from "react";
import { fetchStories } from "../../assets/api/tripStoryApi";
import mytripService from "../../services/mytripService";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import StoryCard from "./StoryCard";
import MyTripSelectModal from "./Mytripselectmodal";

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  padding: 30px;
  background: #f8fafc;
`;

// ✅ 버튼 그룹 추가 (가로로 배치)
const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin: 20px 30px;
`;

const WriteButton = styled.button`
  display: inline-block;
  padding: 10px 16px;
  background: #4f46e5;
  color: white;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;

  &:hover {
    background: #3730a3;
  }
`;

// ✅ 검색 버튼 스타일 추가 (다른 색상)
const SearchButton = styled.button`
  display: inline-block;
  padding: 10px 16px;
  background: #10b981;  /* 초록색 */
  color: white;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;

  &:hover {
    background: #059669;
  }
`;

// ✅ 여행기록 불러오기 버튼 (주황색)
const MyTripButton = styled.button`
  display: inline-block;
  padding: 10px 16px;
  background: #f59e0b;  /* 주황색 */
  color: white;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;

  &:hover {
    background: #d97706;
  }
`;

function TripStoryFeed({ user }) {
  const [stories, setStories] = useState([]);
  const [myTrips, setMyTrips] = useState([]); // 내 여행기록 상태
  const [showMyTripModal, setShowMyTripModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 스토리 목록 가져오기
    fetchStories().then(data => setStories(Array.isArray(data) ? data : []));

    // 내 여행기록 가져오기
    if (user) {
      mytripService.getTrips().then(setMyTrips).catch(console.error);
    }
  }, [user, location.state]);

  return (
    <div>
      {/* ✅ ButtonGroup으로 감싸서 가로 배치 */}
      <ButtonGroup>
        <MyTripButton onClick={() => setShowMyTripModal(true)}>
          🎒 내 여행기록 불러오기
        </MyTripButton>
        <SearchButton onClick={() => navigate("/tripstory/search")}>
          🔍 스토리 검색
        </SearchButton>
      </ButtonGroup>

      <Container>
        {stories.map((story) => (
          <StoryCard 
            key={story._id} 
            story={story} 
            user={user}
          />
        ))}
      </Container>

      {/* ✅ 여행기록 선택 모달 */}
      {/* TODO: 여행기록 담당자가 trips 데이터를 전달해야 합니다 */}
      {showMyTripModal && (
        <MyTripSelectModal
          user={user}
          trips={myTrips} // ✅ 내 여행기록 데이터 전달
          onClose={() => setShowMyTripModal(false)}
        />
      )}
    </div>
  );
}

export default TripStoryFeed;