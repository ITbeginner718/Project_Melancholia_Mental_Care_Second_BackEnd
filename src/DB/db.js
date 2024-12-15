

import { db } from "../firebase.js";

// 상담 데이터 저장 
export const saveConseling= async(Id, counselingRecord, conuselingFeedback, counselingSummary,counselKeywordRecord, topic)=>{
    
    if (!Id) return;

    try {
        // // 데이터 저장
        // // 데이터 생성 시 규칙 생성
        // const doc = await addDoc(collection(db, "counseling"), {

        //     // 사용자 ID 
        //     userId: Id,

        //     // 게시판 ID
        //     Credential: Date.now(),

        //     //날짜 
        //     diagnoseDate: (date.getFullYear() + "/" +
        //         ("0" + (date.getMonth() + 1)).slice(-2) + "/" +
        //         ("0" + (date.getDate())).slice(-2) + "-" +
        //         ("0" + (date.getHours())).slice(-2) + ":" +
        //         ("0" + (date.getMinutes())).slice(-2) +
        //         ":" + ("0" + (date.getSeconds())).slice(-2)),

        //     //상담 내역
        //     counselingRecord,

        //     //상담 피드백
        //     conuselingFeedback,

        //     //상담 요약
        //     counselingSummary
        // });
        
        const date = new Date();
        const formattedDate = `${date.getFullYear()}/${
            String(date.getMonth() + 1).padStart(2, '0')}/${
            String(date.getDate()).padStart(2, '0')}-${
            String(date.getHours()).padStart(2, '0')}:${
            String(date.getMinutes()).padStart(2, '0')}:${
            String(date.getSeconds()).padStart(2, '0')}`;

        const counselingData = {
            userId: Id,
            Credential: Date.now(),
            counselingDate: formattedDate,
            counselingRecord,
            conuselingFeedback,
            counselingSummary,
            counselKeywordRecord,
            topic
        };

        //admin-firestore save 
        const docRef = await db.collection('counseling').add(counselingData);
        console.log('Document written with ID: ', docRef.id);
        return docRef.id;
    }

    catch (e) {
        console.log("firebase error:", e);
    }
}
