const mongoose = require('mongoose')

//승인 대기 여행
const approvalSchema = new mongoose.Schema({
    //게시판 정보
    userId: {type:String,required:true,index:true},
    location:{type:String,required:true},//지역
    title:{type:String,required:true},//제목
    date:{type:String,required:true},//날짜
    content:{type:String,default:''},//내용
    hashtags:[{type:String}],//해시태그
    proofImage:{type:String,required:true},//증빙자료 이미지 url
    
    // 승인 데이터
    status:{type:String,enum:['pending','approved','rejected','completed'],default:'pending', index:true},    rejectionReason:{type:String,default:''},//거부 사유
    createdAt:{type:Date,default:Date.now, index:true},
    reviewedAt:{type:Date},//검토 완료 시간
    reviewedBy:{type:String}//검토한 관리자 Id
})

// status + createdAt 복합 인덱스 — pendingList 쿼리 최적화
approvalSchema.index({ status: 1, createdAt: -1 });

console.log('승인 대기 스키마 정의')

//모델 정의
mongoose.model('approvaldbs',approvalSchema)

console.log('승인 대기 모델 정의')
