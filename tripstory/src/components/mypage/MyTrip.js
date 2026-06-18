import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import mytripService from '../../services/mytripService';
import approvalService from '../../services/approvalService';
import stampService from '../../services/stampService';
import './MyTrip.css';

/* /mypage/main(summary) : 여행 통계만 표시 (총 여행 수,방문지역수,전체여행 보기)
  /mypage/trip(full) : 여행 통계,여행 기록 리스트, 추가/수정 모달 */

const MyTrip = ({mode='full',onTripUpdate,refetchKey}) => {
  const navigate = useNavigate()

// 🧭 여행 데이터
const [trips, setTrips] = useState([]);                // 승인 완료된 여행 목록
const [pendingTrips, setPendingTrips] = useState([]);  // 승인 대기 목록
// 📝 입력 폼 관련
const [proofImage, setProofImage] = useState(null);          // 증빙자료 파일 객체
const [proofImagePreview, setProofImagePreview] = useState(''); // 미리보기 (base64)
const [proofFileName, setProofFileName] = useState('');         // 파일명 표시
// 💬 모달 상태
const [showModal, setShowModal] = useState(false);            // 여행 추가/수정
const [showPendingModal, setShowPendingModal] = useState(false); // 승인 대기 여행
const [showDetailModal, setShowDetailModal] = useState(false);   // 여행 상세 보기
const [editingTrip, setEditingTrip] = useState(null);         // 수정 중인 여행 데이터
const [, setSelectedTrip] = useState(null);                   // 상세보기 닫기/초기화용
const [selectedLocation, setSelectedLocation] = useState(null); // 지역 필터 선택
const [showGuideModal, setShowGuideModal] = useState(false);   // 안내 모달
const [detailTrip, setDetailTrip] = useState(null);            // 상세보기용 데이터
// 🗺️ 방문 지역 / 스탬프
const [showVisitedModal, setShowVisitedModal] = useState(false); // 방문 지역 모달
const [showStampNoticeModal, setShowStampNoticeModal] = useState(false); // 승인 완료 알림
const [stampNoticeData, setStampNoticeData] = useState(null);    // 스탬프 정보 데이터
const [showBulkApprovalModal, setShowBulkApprovalModal] = useState(false); // 모두 승인 결과 모달
const [bulkApprovalResults, setBulkApprovalResults] = useState([]);        // 모두 승인 결과 데이터
// ✅ 승인 확인 / 재전송
const [showResendModal, setShowResendModal] = useState(false);   // 거부된 여행 재전송 모달
const [resendTrip, setResendTrip] = useState(null);              // 재전송 대상 여행
const [confirmedApprovals] = useState(()=>{// 승인 확인 완료 ID 목록
  const saved = localStorage.getItem('confirmedApprovals')
  return saved ? new Set(JSON.parse(saved)):new Set()
})
const [pendingFilter,setPendingFilter] = useState('all')//승인 대기 여행 필터

const [formData, setFormData] = useState({//여행 등록,수정폼
  location: '',
  title: '',
  date: '',
  content: '',
  hashtags:''
});
  
  const regions = [
    '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시','경기도', '강원도', '충청북도', '충청남도','전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도'
  ];

useEffect(()=>{
  window.scrollTo(0,0)//스크롤 항상 맨위 배치!
  localStorage.setItem('confirmedApprovals',JSON.stringify([...confirmedApprovals]))
},[confirmedApprovals])

// ✅  ============ 데이터 통신 api 기능 ============
//사용자 여행 기록
  const fetchTrips = async () => {
    try{
      const data = await mytripService.getTrips()
      setTrips(data)
    }catch(err){
      console.error('여행 목록 불러오기 실패:',err)
    }
  }
//관리자 승인 대기 여행
const fetchPendingTrips = async()=>{
  try{
    const data = await approvalService.getMyPending()

    //이미 여행 기록에 등록된 항목(승인 완료 여행) 제거
    const existingTripKeys = new Set(
      trips.map(t=> `${t.location}_${t.title}_${t.date}`)
    )
    const filtered = data.filter((trip) =>{//사용자가 확인 눌러서 승인 완료 처리된 항목제거
        const tripKey = `${trip.location}_${trip.title}_${trip.date}`;
        return !confirmedApprovals.has(trip._id) && !existingTripKeys.has(tripKey);
  });
    setPendingTrips(filtered)
  }catch(err){
    console.error('승인 대기 목록 불러오기 실패: ',err)
  }
}

//승인 완료 알림 모달
const closeStampModal = () =>{
  setShowStampNoticeModal(false)
  setStampNoticeData(null)
}

useEffect(() => {//페이지 실행 시 여행 기록 가져오기
  const loadData = async() => {
    await fetchTrips();//승인된 여행 목록
    await fetchPendingTrips()//승인 대기 목록
    }
    loadData();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [refetchKey]);

useEffect(()=>{//trips변경 시에도 pendingTrips 갱신
  fetchPendingTrips()
// 승인 대기 목록은 기존 fetchPendingTrips 흐름을 유지하기 위해 trips 변화에만 맞춰 갱신한다.
// eslint-disable-next-line react-hooks/exhaustive-deps
},[trips])

//방문 지역 수 계산
const visitedCount = new Set(trips.map(t => t.location)).size
//방문한 지역 목록
const visitedRegions = [...new Set(trips.map(t=>t.location))]

// ✅  ============ 사용자 인터페이스 UI 관련 기능 ============
  //입력 시 업데이트
  const handleInputChange = (e) => {
    const {name,value} = e.target
    setFormData(prev => ({ ...prev, [name]:value}))
  }

//증빙자료 파일 선택
const handleProofImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProofImage(file)
      setProofFileName(file.name)//파일명 저장
      const reader = new FileReader()
      reader.onloadend = () => {
        setProofImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

// ✅  ========== 해시태그 클릭 시 네이버 검색 ==========
const handleHashtagClick = (hashtag) =>{
  const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(hashtag)}`;
  window.open(searchUrl,'_blank')
}

//달력 - 미래 날짜 선택 불가능
const handleDateChange = (e) =>{
  const selectedDate = new Date(e.target.value)
  const today = new Date()
  today.setHours(0,0,0,0)

  if(selectedDate > today){
    alert('여행을 다녀온 후 일정을 선택해주세요.')
    return
  }
  setFormData(prev => ({...prev,date:e.target.value}))
}

//여행 저장
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.location || !formData.title || !formData.date) {
    alert('필수 항목을 모두 입력해주세요.');
    return;
  }
  //수정 모드일 때 증빙자료 체크 생략
  if (!editingTrip && !proofImage) {
    alert('증빙자료 이미지를 업로드해주세요.');
    return;
  }
//해시태그 문자열을 배열로 변환
const hashtagArray = formData.hashtags
    .split(' ')
    .filter(tag => tag.trim())
    .map(tag=> tag.startsWith('#')? tag.slice(1):tag)

  try{
      const payload = {
        ...formData,
        hashtags: hashtagArray,
        proofImage: proofImagePreview // Base64 인코딩된 이미지
      }
    
    //수정 모드일 때
    if (editingTrip) {
      const result = await mytripService.updateTrip(editingTrip._id, {
        content : formData.content,
        hashtags : hashtagArray,
        title:formData.title
      })
      if(!result.error){
        setTrips((prev)=> prev.map((t)=>(t._id === result.trip._id ? result.trip : t))
      );

        if(onTripUpdate) onTripUpdate()
          closeModal()
          alert('여행 기록이 수정되었습니다.')
      }else{
        alert('수정 중 오류가 발생했습니다.')
      }
      return
    }

    // 승인 요청으로 전송
    const result = await approvalService.submitTrip(payload)
  
    if (!result.error) {
      await fetchPendingTrips(); // 승인 대기 목록 갱신
      if (onTripUpdate) onTripUpdate();
      closeModal();
      alert ('승인 완료까지 약 1~3일이 소요됩니다.\n승인 완료 시 [승인 대기 여행] 목록에서 확인 가능 합니다.')
    }else{
      alert('데이터 저장에 실패했습니다.')
    }
  }catch(error){
    console.error('저장 실패: ',error)
    alert('저장에 실패했습니다.')
  }
}
  // ✅ ========== 여행 수정 ==========
  const handleEdit = (trip) => {
    setEditingTrip(trip)
    setFormData({
      location: trip.location,
      title: trip.title,
      date: trip.date,
      content: trip.content || '',
      hashtags: (trip.hashtags || []).join(' ')
    })
    setShowModal(true)//여행 추가수정 모달 표시
    setSelectedTrip(null)//상세보기
  }

  // ✅ ========== 여행 기록 삭제 ==========
  const handleDelete = async(id) =>{
    if(!window.confirm('정말 삭제하시겠습니까?')) return

    try{
      const result = await mytripService.deleteTrip(id)

      if(!result.error){
        await fetchTrips()//여행 목록 갱신
        setSelectedTrip(null)//상세보기 닫기
        setShowDetailModal(false)//상세 모달 닫기
        alert('여행 기록이 삭제되었습니다.')
      }else {
        alert('데이터 삭제에 실패하였습니다.')
      }
    }catch(error){
      console.error('삭제 실패: ',error)
      alert('데이터 삭제에 실패했습니다.')
    }
  }

  //여행 추가 모달창
  const openNewTripModal = () => {
    setEditingTrip(null)
    setFormData({location:'',title:'',date:'',content:'',hashtags:''})
    setProofImage(null)
    setProofImagePreview('')
    setProofFileName('')//파일명 초기화
    setShowModal(true)
  }

  //여행 모달창 닫기
  const closeModal = () => {
    setShowModal(false)
    setEditingTrip(null)
    setFormData({location:'',title:'',date:'',content:'',hashtags:''})
    setProofImage(null)
    setProofImagePreview('')
    setProofFileName('')//파일명 초기화
  }

  //카드 클릭 시 상세보기
  const handleTripClick = (trip) =>{
    setDetailTrip(trip)
    setShowDetailModal(true)
  }

  //승인 완료된 여행 클릭 처리
  const handleApprovedTripClick = async(trip) => {
    try{
      //현재 해당 지역 방문 횟수 조회
      const visitCountData = await stampService.getVisitCount()
      const currentCount = visitCountData[trip.location] || 0

      const noticeInfo = {//사용자에게 알림 표시
        tripId:trip._id,
        location: trip.location,
        currentCount:currentCount+1,
        requiredCount:5,
        canGetStamp:currentCount + 1>=5
      }
      setStampNoticeData(noticeInfo)
      setShowStampNoticeModal(true)
      //승인 대기 목록 갱신
      await fetchPendingTrips()
    }catch(error){
      console.error('스탬프 정보 조회 실패: ',error)
      alert('스탬프 정보를 불러오는데 실패했습니다.')
    }
  }
  //거부된 여행 재전송 처리
  const handleResendRejectedTrip = (trip) =>{
    setResendTrip(trip)
    setFormData({
      location:trip.location,
      title:trip.title,
      date:trip.date,
      content:trip.content || '',
      hashtags:(trip.hashtags || []).join(' ')
    })
    setProofImage(null)
    setProofImagePreview('')
    setProofFileName('')
    setShowPendingModal(false)
    setShowResendModal(true)
  }

  //재전송 제출
  const handleResendSubmit = async(e) => {
    e.preventDefault()

    if(!proofImage){
      alert('새로운 증빙자료를 업로드해주세요.')
      return
    }
    const hashtagArray = formData.hashtags
    .split(' ')
    .filter(tag => tag.trim())
    .map(tag => tag.startsWith('#') ? tag.slice(1) : tag)

    try{//거부된 여행 데이터 삭제
      if(resendTrip && resendTrip._id){
        await approvalService.deleteRejectedTrip(resendTrip._id)
      }
      
      //새로운 승인 요청으로 재전송
      const payload = {
        ...formData,
        hashtags: hashtagArray,
        proofImage:proofImagePreview
      }
      const result = await approvalService.submitTrip(payload)

      if(!result.error){
        await fetchPendingTrips()//대기 목록 갱신
        if(onTripUpdate) onTripUpdate()
          setShowResendModal(false)
          setResendTrip(null)
          alert('재전송이 완료되었습니다. \n관리자 승인까지 약 1~3일이 소요됩니다.')
      }
    }catch(error) {
      console.error('재전송 실패:',error)
      alert('재전송에 실패했습니다.')
    }
  }

  //여행 기록 확인 버튼 -> 승인 완료 시
  const handleConfirmApproval = async (goToStamp = false) => {
  if (!stampNoticeData?.tripId) return console.error('DATA가 없습니다.')

  try {
    //1. 승인된 여행 데이터를 사용자 여행 기록에 추가
    const approvedTrip = pendingTrips.find(t => t._id === stampNoticeData.tripId);
    if (!approvedTrip) return alert('승인 정보를 찾을 수 없습니다.');
    //2. 중복 확인
      const alreadyExists = trips.some(
        t =>
          t.location === approvedTrip.location &&
          t.title === approvedTrip.title &&
          t.date === approvedTrip.date
      );
      //3. 여행 기록 추가(중복이 아닐 경우)
        if (!alreadyExists) {
          await mytripService.addTrip({
            location: approvedTrip.location,
            title: approvedTrip.title,
            date: approvedTrip.date,
            content: approvedTrip.content,
            hashtags: approvedTrip.hashtags,
          });
        }
    //4. 승인 완료 처리(백엔드에서 상태변경)
    await mytripService.completeTrip(stampNoticeData.tripId)
    
    closeStampModal()//모달창 먼저 닫기
    
    // 약간의 지연 후 최신 데이터 다시 불러오기 (UI 자동 갱신)
    setTimeout(async () => {
      await fetchTrips();
      await fetchPendingTrips();
    }, 1000);
    
    if (goToStamp)
      navigate('/mypage/stamp', { state: { triggerRefetch: Date.now() } });

  } catch (error) {
    console.error('스탬프 승인 완료 처리 중 오류 발생:', error);
    alert('스탬프 승인 완료 처리 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
  }
};

  const handleBulkApproval = async () => {
    const approvedTrips = pendingTrips.filter(t => t.status === 'approved');
    
    if (approvedTrips.length === 0) {
      alert('승인 완료된 여행이 없습니다.');
      return;
    }

    if (!window.confirm(`총 ${approvedTrips.length}개의 승인 완료된 여행을 모두 확인하시겠습니까?`)) {
      return;
    }

    try {
      const results = [];
      
      for (const trip of approvedTrips) {
        try {
          // 중복 확인
          const alreadyExists = trips.some(
            t =>
              t.location === trip.location &&
              t.title === trip.title &&
              t.date === trip.date
          );

          // 여행 기록 추가 (중복이 아닐 경우)
          if (!alreadyExists) {
            await mytripService.addTrip({
              location: trip.location,
              title: trip.title,
              date: trip.date,
              content: trip.content,
              hashtags: trip.hashtags,
            });
          }

          // 승인 완료 처리
          await mytripService.completeTrip(trip._id);

          // 현재 해당 지역 방문 횟수 조회
          const visitCountData = await stampService.getVisitCount();
          const currentCount = visitCountData[trip.location] || 0;

          results.push({
            location: trip.location,
            title: trip.title,
            currentCount: currentCount + 1,
            requiredCount: 5,
            canGetStamp: currentCount + 1 >= 5
          });
        } catch (error) {
          console.error(`여행 ${trip.title} 처리 실패:`, error);
        }
      }

      // 승인 대기 목록 닫기
      setShowPendingModal(false);

      // 결과 모달 표시
      setBulkApprovalResults(results);
      setShowBulkApprovalModal(true);

      // 약간의 지연 후 목록 갱신
      setTimeout(async () => {
        await fetchTrips();
        await fetchPendingTrips();
        }, 1000);

    } catch (error) {
      console.error('모두 승인 처리 중 오류 발생:', error);
      alert('모두 승인 처리 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  //사용자가 클릭한 지역
  const handleLocationFilter = (location) => {
    setSelectedLocation(selectedLocation === location ? null : location);
  }

  //승인된 여행만 필터링
  const filteredTrips = selectedLocation 
    ? trips.filter(trip => trip.location === selectedLocation)
    : trips

  // 승인 대기 여행 필터링 함수
  const getFilteredPendingTrips = () => {
    if (pendingFilter === 'all') return pendingTrips;
    if (pendingFilter === 'approved') return pendingTrips.filter(t => t.status === 'approved');
    if (pendingFilter === 'pending') return pendingTrips.filter(t => t.status === 'pending');
    if (pendingFilter === 'rejected') return pendingTrips.filter(t => t.status === 'rejected');
    return pendingTrips;
  };
  
  //지역에 따른 이모지 표시
  const getRegionEmoji = (location) => {
    const emojiMap = {
      '서울특별시': '🏙️', '부산광역시': '🌊', '제주특별자치도': '🏝️', '강원도': '⛰️',
      '경기도': '🏘️', '인천광역시': '✈️', '대전광역시': '🌆', '광주광역시': '🎨',
      '대구광역시': '🍎', '울산광역시': '🏭', '세종특별자치시': '🏛️', '충청북도': '🌳',
      '충청남도': '🌾', '전라북도': '🍚', '전라남도': '🦐', '경상북도': '🏰', '경상남도': '🌸'
    }
    return emojiMap[location] || '📍';
  }

// ✅✅✅ ============ summary 모드일 경우 여행 요약 정보 확인 가능 ✅✅✅ ============
//총 여행수, 방문한 지역 수 확인
if(mode==='summary') {
  return (
      <div className="mytrip-container">
        <div className='trip-summary-section'>
        <h2 className="trip-title">✈️ 나의 여행 통계</h2>
        <div className="trip-stats">
          <div className="stat-box">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">{trips.length}</div>
              <div className="stat-label">총 여행 기록</div>
            </div>
          </div>
        {/* 방문 지역 클릭 시 모달 표시 */}
          <div className="stat-box clickable" onClick={() => setShowVisitedModal(true)}>
            <div className="stat-icon">🗺️</div>
            <div className="stat-content">
              <div className="stat-value">{visitedCount}</div>
              <div className="stat-label">방문한 지역</div>
            </div>
          </div>
        </div>

        <button className="btn-empty-add2" onClick={() => navigate('/mypage/mytrip')}>
          📖 나의 여행 기록 보기
        </button>
      {/* 방문한 지역 목록 */}
      {showVisitedModal && (
          <div className='modal-overlay' onClick={() => setShowVisitedModal(false)}>
            <div className='visited-modal-content' onClick={(e) => e.stopPropagation()}>
              <div className='visited-modal-header'>
                <h3>🗺️ 방문한 지역</h3>
                <button className='modal-close' onClick={() => setShowVisitedModal(false)}>×</button>
              </div>
              <div className='visited-regions-grid'>
                {visitedRegions.map((region) => (
                  <div key={region} className='visited-region-item'>
                    <span className='region-emoji-large'>{getRegionEmoji(region)}</span>
                    <span className='region-name-text'>{region}</span>
                    <span className='region-visit-count'>{trips.filter(t => t.location === region).length}회</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div> 
    </div>
  )
}
// ✅✅✅ ============ full 모드일 경우 다양한 정보 확인 가능 ✅✅✅ ============
//여행 통계 박스(여행수,방문지역수)/지역필터 버튼, 여행 카드 목록/승인대기,여행추가,상세,승인관련
return (
      <div className="mytrip-container">
        <div className='trip-summary-section'>
        <h2 className="trip-title">✈️ 나의 여행 통계</h2>
        <div className="trip-stats">
          <div className="stat-box">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">{trips.length}</div>
              <div className="stat-label">총 여행 기록</div>
            </div>
          </div>
          <div className="stat-box clickable" onClick={() => setShowVisitedModal(true)}>
            <div className="stat-icon">🗺️</div>
            <div className="stat-content">
              <div className="stat-value">{visitedCount}</div>
              <div className="stat-label">방문한 지역</div>
            </div>
          </div>
        </div>
      </div>

    {/* 여행 기록 리스트 헤더 */}
      <div className="trip-header">
        <h2 className="trip-title">나의 여행 기록</h2>
        <div className="header-buttons">
          <button className='btn-guide' onClick={() => setShowGuideModal(true)}>
            ℹ️ 여행 추가 방법
          </button>
          {/* 승인 대기 여행 버튼 */}
          <button className='btn-pending' onClick={()=> setShowPendingModal(true)}>
            ⏳ 승인 대기 여행 ({pendingTrips.length})
          </button>
          <button className='btn-empty-add' onClick={openNewTripModal}>
            + 새 여행 추가
          </button>
        </div>
      </div>

  {/* 지역 필터 버튼 */}
  {trips.length > 0 && (
      <div className='location-filter-container'>
        <button 
          className={`filter-btn ${!selectedLocation ? 'active' : ''}`}
          onClick={() => setSelectedLocation(null)}>
          전체보기
        </button>
        {visitedRegions.map((region) => (
          <button key={region} className={`filter-btn ${selectedLocation === region ? 'active' : ''}`} onClick={() => handleLocationFilter(region)} >
            {getRegionEmoji(region)} {region}
          </button>
        ))}
      </div>
    )}

{/*  ============ 여행 데이터 없을 경우 ============ */}
      {trips.length === 0 ? (
        <div className="empty-trips">
          <div className="empty-icon">🧳</div>
          <p className="empty-text">아직 기록된 여행이 없습니다.</p>
          <p className="empty-subtext">첫 여행을 기록해보세요!</p>
          <button className='btn-empty-add' onClick={openNewTripModal}>
          + 새 여행 추가
          </button>
        </div>
      ) : (
        <div className='trip-grid'>
        {/* ========== 필터링 된 여행만 표시 ========== */}
          {filteredTrips.map((trip)=>(
            <div key={trip._id} className='trip-card' onClick={()=>handleTripClick(trip)}>
              <div className='trip-card-header'>
                <span className='trip-location'>{getRegionEmoji(trip.location)} {trip.location}</span>
              </div>
              <h4 className='trip-card-title'>{trip.title}</h4>
              <p className='trip-date'>📅 {trip.date}</p>
            {/* 해시태그 표시 */}
            {trip.hashtags && trip.hashtags.length>0 && (
              <div className='hashtag-container'>
                {trip.hashtags.map((tag,idx) =>(
                  <span key={idx} className='hashtag' onClick={(e)=>{e.stopPropagation()
                    handleHashtagClick(tag) }}>
                    #{tag}
                  </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* 승인 대기 여행 모달 */}
      {showPendingModal && (
        <div className='modal-overlay' onClick={()=>setShowPendingModal(false)}>
          <div className='pending-list-modal-content' onClick={(e)=>e.stopPropagation()}>
            <div className='pending-list-modal-header'>
              <h3>⏳ 승인 대기 여행</h3>
              <button className='modal-close' onClick={()=>setShowPendingModal(false)}>×</button>
            </div>
            {/* 필터 버튼 영역 */}
            <div className='pending-filter-buttons'>
              <button 
                className={`pending-filter-btn ${pendingFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPendingFilter('all')}
              >
                전체 ({pendingTrips.length})
              </button>
              <button className={`pending-filter-btn approved ${pendingFilter === 'approved' ? 'active' : ''}`} onClick={() => setPendingFilter('approved')}
              >
                ✅ 승인완료 ({pendingTrips.filter(t => t.status === 'approved').length})
              </button>
              <button className={`pending-filter-btn pending ${pendingFilter === 'pending' ? 'active' : ''}`} onClick={() => setPendingFilter('pending')}
              >
                ⏳ 승인대기 ({pendingTrips.filter(t => t.status === 'pending').length})
              </button>
              <button className={`pending-filter-btn rejected ${pendingFilter === 'rejected' ? 'active' : ''}`} onClick={() => setPendingFilter('rejected')}
              >
                ❌ 승인거부 ({pendingTrips.filter(t => t.status === 'rejected').length})
              </button>
            </div>
            {(pendingFilter === 'all' || pendingFilter === 'approved') &&
              pendingTrips.filter(t => t.status === 'approved').length > 0 && (
                <div className='bulk-approval-section'>
                  <button className='btn-bulk-approval' onClick={handleBulkApproval}>
                    🎉 모두 승인 ({pendingTrips.filter(t => t.status === 'approved').length}개)
                  </button>
                </div>
              )}
             <div className='pending-list-body'>
               {getFilteredPendingTrips().length === 0 ? (
                <div className='pending-empty'>
                  <p>
                    {pendingFilter === 'all' && '승인 대기 중인 여행이 없습니다.'}
                    {pendingFilter === 'approved' && '승인 완료된 여행이 없습니다.'}
                    {pendingFilter === 'pending' && '승인 대기 중인 여행이 없습니다.'}
                    {pendingFilter === 'rejected' && '거부된 여행이 없습니다.'}
                  </p>
                </div>
              ) : (
                <div className='pending-item-grid'>
                  {getFilteredPendingTrips().map((trip)=>(
                    <div key={trip._id} className='pending-item'onClick={()=>{if(trip.status==='approved'){ handleApprovedTripClick(trip)
                    }}}>
                      {trip.status === 'approved' ? (
                        <div className='approved-overlay'>
                          <button className='btn-approved'>✅ 승인 완료</button>
                        </div>
                      ):trip.status === 'rejected' ? (
                        <div className='rejected-overlay'>
                          <div className='rejected-content'>
                            <span className='rejected-status-text'>❌승인 거부</span>
                            <p className='rejected-reason'>사유: {trip.rejectReason || '관리자에 의해 거부되었습니다.'}</p>
                            <button className='btn-resend' onClick={(e)=>{
                              e.stopPropagation();handleResendRejectedTrip(trip)}}>🔄 재전송하기</button>
                          </div>
                        </div>  
                    ):(
                      <div className='pending-item-overlay'>
                        <span className='pending-status-text'>승인 대기 중</span>
                      </div>
                      )}
                      <div className='pending-item-content'>
                        <span className='pending-item-location'>
                          {getRegionEmoji(trip.location)} {trip.location}
                        </span>
                      <h4 className='pending-item-title'>{trip.title}</h4>
                      <p className='pending-item-date'>📅 {trip.date}</p>
                     </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBulkApprovalModal && (
        <div className='modal-overlay' onClick={() => setShowBulkApprovalModal(false)}>
          <div className='bulk-approval-modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='bulk-approval-modal-header'>
              <h3>🎉 모두 승인 완료!</h3>
              <button className='modal-close' onClick={() => setShowBulkApprovalModal(false)}>×</button>
            </div>
            <div className='bulk-approval-modal-body'>
              <p className='bulk-approval-summary'>
                총 <strong>{bulkApprovalResults.length}개</strong>의 여행이 승인 처리되었습니다.
              </p>
              <div className='bulk-approval-results'>
                {bulkApprovalResults.map((result, index) => (
                  <div key={index} className='bulk-result-item'>
                    <div className='bulk-result-header'>
                      <span className='bulk-result-emoji'>{getRegionEmoji(result.location)}</span>
                      <span className='bulk-result-location'>{result.location}</span>
                    </div>
                    <div className='bulk-result-progress'>
                      <div className='progress-bar-container'>
                        <div 
                          className='progress-bar-fill' 
                          style={{width: `${(result.currentCount / result.requiredCount) * 100}%`}}
                        />
                      </div>
                      <p className='bulk-result-text'>
                        <strong>{result.currentCount}</strong> / {result.requiredCount} 회 방문
                      </p>
                    </div>
                    {result.canGetStamp && (
                      <div className='bulk-result-stamp-badge'>
                        🌟 스탬프 획득 가능!
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className='bulk-approval-actions'>
                <button 
                  className='btn-go-stamp' 
                  onClick={() => {
                    setShowBulkApprovalModal(false);
                    navigate('/mypage/stamp', { state: { triggerRefetch: Date.now() } });
                  }}
                >
                  🌟 스탬프 페이지로 이동
                </button>
                <button 
                  className='btn-confirm-bulk' 
                  onClick={() => setShowBulkApprovalModal(false)}
                >
                  ✅ 확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 재전송 모달창 */}
      {showResendModal && (
        <div className='modal-overlay' onClick={()=>setShowResendModal(false)}>
          <div className='modal-content-new' onClick={(e)=>e.stopPropagation()}>
            <div className='modal-header-new'>
              <h3>🔄 여행 재전송</h3>
              <button className='modal-close' onClick={()=>setShowResendModal(false)}>×</button>
            </div>
            <form onSubmit={handleResendSubmit} className='trip-form'>
              <div className='form-group'>
                <label>📍 지역 </label>
                <input type='text' value={formData.location} disabled style={{background:'#f0f0f0'}}/>
              </div>
              <div className='form-group'>
                <label>📝 제목<span className='required'>*</span> </label>
                <input type='text' name='title' value={formData.title} onChange={handleInputChange} placeholder='여행 제목을 입력하세요.'rows='4'/>
              </div>
              <div className='form-group'>
                <label>📅 날짜</label>
                <input type='date' value={formData.date} disabled style={{background:'#f0f0f0'}}/>
              </div>
              <div className='form-group'>
                <label>💭 내용 <span className='required'>*</span></label>
                <textarea name='content' value={formData.content} onChange={handleInputChange} placeholder='여행의 추억을 기록해보세요...' rows='4'/>
              </div>
              <div className='form-group'>
                <label>🏷️ 해시태그 <span className='required'>*</span></label>
                <input type='text' name='hashtags' value={formData.hashtags} onChange={handleInputChange} placeholder='#여행지 #관광지 #맛집'/>
              </div>
              <div className='form-group'>
                <label>🔎 새로운 증빙자료 <span className='required'>*</span></label>
                <input 
                  type='file' 
                  accept='image/*'
                  onChange={handleProofImageChange}
                  className='proof-file-input'
                  required
                />
                {proofFileName && (
                  <div className='proof-file-name'>
                    📄 {proofFileName}
                  </div>
                )}
              </div>
              <div className='form-actions'>
                <button type='submit' className='btn-submit'>재전송하기</button>
                <button type='button' className='btn-cancel-form' onClick={() => setShowResendModal(false)}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 스탬프 적립 안내 모달 */}
      {showStampNoticeModal && stampNoticeData && (
        <div className='modal-overlay' onClick={()=>setShowStampNoticeModal(false)}>
          <div className='stamp-notice-modal-content' onClick={(e)=>e.stopPropagation()}>
            <div className='stamp-notice-header'>
              <h3>🎊 여행 승인 완료!</h3>
              <button className='modal-close' onClick={()=>setShowStampNoticeModal(false)}>×</button>
            </div>
            <div className='stamp-notice-body'>
              <div className='stamp-notice-icon'>
                {getRegionEmoji(stampNoticeData.location)}
              </div>
              <h4 className='stamp-notice-location'>{stampNoticeData.location}</h4>
              <div className='stamp-notice-progress'>
                <div className='progress-bar-container'>
                  <div className='progress-bar-fill' style={{width:`${(stampNoticeData.currentCount / stampNoticeData.requiredCount) * 100}%`}}/>
                </div>
                <p className='progress-text'>
                  <strong>{stampNoticeData.currentCount}</strong> / {stampNoticeData.requiredCount} 회 방문
                </p>
              </div>
              {stampNoticeData.canGetStamp ? (
          <div className='stamp-notice-success'>
            <p className='success-message'>🎉 축하합니다!</p>
            <p className='success-detail'>
              {stampNoticeData.location} 지역을 총 {stampNoticeData.currentCount}회 방문했습니다!<br />스탬프 페이지에서 확인해보세요.
            </p>
            <div className='stamp-button-group'>
              <button className='btn-go-stamp' onClick={() => handleConfirmApproval(true)}>
                🌟 스탬프 페이지로 이동
              </button>
              <button className='btn-confirm-only' onClick={() => handleConfirmApproval(false)}>
                ✅ 확인
              </button>
            </div>
          </div>
        ) : (
          <div className='stamp-notice-info'>
            <p className='info-message'>
              앞으로 <strong>{stampNoticeData.requiredCount - stampNoticeData.currentCount}번</strong> 더 방문하시면<br />스탬프를 획득할 수 있습니다!
            </p>
            <div className='stamp-button-group'>
              <button className='btn-confirm-only' onClick={() => handleConfirmApproval(false)}>
                ✅ 확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}

      {/* 여행 상세보기 모달 */}
      {showDetailModal && detailTrip && (
        <div className='modal-overlay' onClick={()=>setShowDetailModal(false)}>
          <div className='detail-modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='detail-modal-header'>
              <h3>✈️ 여행 상세 정보</h3>
              <button className='modal-close' onClick={()=>setShowDetailModal(false)}>×</button>
            </div>
            <div className='detail-modal-body'>
              <div className='detail-location'>
                {getRegionEmoji(detailTrip.location)} {detailTrip.location}
              </div>
              <h2 className='detail-title'>{detailTrip.title}</h2>
              <p className='detail-date'>📅 {detailTrip.date}</p>

              {detailTrip.content && (
                <div className='detail-content-improved'>
                  <div className='detail-content-header'>
                    <span className='content-icon'>📖</span>
                    <h4>여행 이야기</h4>
                  </div>
                  <div className='content-text'>{detailTrip.content}</div>
                </div>
              )}
              {detailTrip.hashtags && detailTrip.hashtags.length > 0 && (
                <div className='detail-hashtags'>
                  <h4>🏷️ 해시태그</h4>
                  <div className='hashtag-container'>
                    {detailTrip.hashtags.map((tag, idx) => (
                      <span key={idx} className='hashtag' onClick={() => handleHashtagClick(tag)}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className='detail-actions'>
                <button className='btn-edit' onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(detailTrip);
                }}>✏️ 수정</button>
                <button className='btn-delete' onClick={() => {
                  handleDelete(detailTrip._id);
                }}>🗑️ 삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* 추가 수정 모달 */}
     {showModal && (
        <div className='modal-overlay' onClick={closeModal}>
          <div className='modal-content-new' onClick={(e)=>e.stopPropagation()}>
            <div className='modal-header-new'>
              <h3>{editingTrip?'✏️ 여행 수정' : '✨ 새 여행 추가'}</h3>
              <button className='modal-close' onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className='trip-form'>
              <div className='form-group'>
                <label>📍 지역<span className='required'>*</span> </label>
                <select name='location' value={formData.location} onChange={handleInputChange} 
                  disabled={!!editingTrip} style={editingTrip ? {background:'#f0f0f0', cursor:'not-allowed'} : {}} required>
                  <option value="">지역을 선택해주세요</option>
                  {regions.map(r=> <option key={r} value={r}>{getRegionEmoji(r)} {r}</option>)}
                </select>
                {editingTrip && <small className='form-hint disabled-hint'>* 승인 완료된 여행은 지역을 수정할 수 없습니다.</small>}
              </div>
              <div className='form-group'>
                <label>📝 제목 <span className='required'>*</span></label>
                <input type='text' name='title' value={formData.title} onChange={handleInputChange} 
                  placeholder='여행 제목을 입력하세요' rows='4'/>
              </div>
              <div className='form-group'>
                <label>📅 날짜 <span className='required'>*</span></label>
                <input type='date' name='date' value={formData.date} onChange={handleDateChange}
                  disabled={!!editingTrip} style={editingTrip ? {background:'#f0f0f0', cursor:'not-allowed'} : {}}
                  max={new Date().toISOString().split('T')[0]}
                  required/>
                {editingTrip && <small className='form-hint disabled-hint'>* 승인 완료된 여행은 날짜를 수정할 수 없습니다.</small>}
              </div>
              <div className='form-group'>
                <label>💭 내용 <span className='required'>*</span></label>
                <textarea name='content' value={formData.content} onChange={handleInputChange} placeholder='여행의 추억을 기록해보세요...' rows='4'/>
              </div>
              <div className='form-group'>
                <label>🏷️ 해시태그<span className='required'>*</span></label>
                <input type='text' name='hashtags' value={formData.hashtags} onChange={handleInputChange} placeholder='#여행지 #관광지 #맛집'/>
                <small className='form-hint'>공백 및 #을 통해 입력가능합니다. (예: #제주도 #한라산 #흑돼지)</small>
              </div>
              {/* 수정 모드일 때 증빙자료 칸 숨김 */}
              {!editingTrip && (
                <div className='form-group'>
                  <label>🔎 증빙자료 (영수증, 티켓 등) <span className='required'>*</span></label>
                  <input 
                    type='file' 
                    accept='image/*'
                    onChange={handleProofImageChange}
                    className='proof-file-input'
                    required
                  />
                  {proofFileName &&(
                    <div className='proof-file-name'>
                      📄 {proofFileName}
                    </div>
                  )}
                  <small className='form-hint'>관리자 승인을 위한 증빙자료입니다. 영수증, 입장권, 티켓 등을 업로드해주세요.</small>
                </div>
              )}
              <div className='form-actions'>
                <button type='submit' className='btn-submit'>{editingTrip ? '수정하기' : '추가하기'}</button>
                <button type='button' className='btn-cancel-form' onClick={closeModal}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

    {/* ========== 안내 모달 ========== */}
      {showGuideModal && (
        <div className='modal-overlay' onClick={() => setShowGuideModal(false)}>
          <div className='guide-modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='guide-modal-header'>
              <h3>ℹ️ 여행 추가 방법 안내</h3>
              <button className='modal-close' onClick={() => setShowGuideModal(false)}>×</button>
            </div>
            <div className='guide-modal-body'>
              <div className='guide-item'>
                <div className='guide-icon'>🔒</div>
                <div className='guide-text'>
                  <h4>남용 방지 시스템</h4>
                  <p>여행 기록의 신뢰성을 위해 관리자 승인 시스템을 운영합니다.</p>
                  <p>허위 정보 또는 중복 등록을 방지를 위해 정확한 정보를 입력해주세요.</p>
                </div>
              </div>
              <div className='guide-item'>
                <div className='guide-icon'>📸</div>
                <div className='guide-text'>
                  <h4>증빙자료 필수</h4>
                  <p>여행 사실을 확인할 수 있는 영수증, 입장권, 티켓, 여행지 사진 등 <br/>증빙자료를 업로드해주세요.</p>
                </div>
              </div>
              <div className='guide-item'>
                <div className='guide-icon'>⏰</div>
                <div className='guide-text'>
                  <h4>승인 소요 시간</h4>
                  <p>제출된 자료 검토에는 평균 1~3일이 소요됩니다.<br/>승인 완료 시 [승인 대기 여행] 목록에서 확인 가능 합니다.</p>
                </div>
              </div>
              <div className='guide-item'>
                <div className='guide-icon'>❌</div>
                <div className='guide-text'>
                  <h4>승인 거부 시</h4>
                  <p>제출된 증빙자료가 불충분하거나 부정확할 경우<br/>승인이 거부될 수 있습니다.</p>
                </div>
              </div>
            </div>
            <button className='btn-guide-close' onClick={() => setShowGuideModal(false)}>
              이해했습니다.
            </button>
          </div>
        </div>
      )}
      
    {/* 방문한 지역 모달 */}
      {showVisitedModal && (
        <div className='modal-overlay' onClick={() => setShowVisitedModal(false)}>
          <div className='visited-modal-content' onClick={(e) => e.stopPropagation()}>
            <div className='visited-modal-header'>
              <h3>🗺️ 방문한 지역</h3>
              <button className='modal-close' onClick={() => setShowVisitedModal(false)}>×</button>
            </div>
            <div className='visited-regions-grid'>
              {visitedRegions.map((region) => (
                <div key={region} className='visited-region-item'>
                  <span className='region-emoji-large'>{getRegionEmoji(region)}</span>
                  <span className='region-name-text'>{region}</span>
                  <span className='region-visit-count'>{trips.filter(t => t.location === region).length}회</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTrip;
