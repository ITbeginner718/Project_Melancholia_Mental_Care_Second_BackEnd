import express from "express"
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import axios from "axios";
import { v4 } from 'uuid';
import {callChatGPT, callChatGptFirst, callChatGptFirst_ing, summaryCounseling} from "./Chat/GPT_API.js"  //확장자까지 작성해줘야 함
import { redisDelete, redisInit, redisLoad } from "./Cache/redis.js";
import { saveConseling } from "./DB/db.js";

const app = express();
const handleListen = ()=>console.log(`Listening on http://localhost:3002`);

// const cors = require('cors');
// const axios = require('axios'); // Axios 모듈 추가

app.use(cors());

//WS를 express에 합칠 것, express는 http, ws: socket 통신
//express는 ws을 지원하지 않음=> 함수를 사용하여 합칠 것

//서버 생성, requsetListener 경로 설정 
// express aplication 서버(http) 생성
const httpServer = http.createServer(app);
//websocket과 똑같이 http서버를 만들고 Socket io서버에 http서버를 등록
const SocketIoServer = new Server(httpServer,{
    // cors 설정 특정 IP만 허용
    cors: {
        //http://localhost:5174 : 리액트(UI) url 
         origin: ["https://localhost:5173"], // 허용할 출처 목록
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});


// SocketIO 연결
// Socket이 연결될 때마다 SocketIoServer.on()은 각 소켓에 대해 
// 독립적으로 작동(socket마다 인스턴스 작동)
SocketIoServer.on("connection",(socket)=>{
    
    console.log("Socket이 연결되었습니다.",socket.id);
    socket.emit('socket connect',`통신 연결되었습니다.`);

    try {

        // 채팅 초기 셋팅
        // 클라이언트에서 socket.emit('start chat', ``, {userName}, {topic}, callBack_setRoomName);
        // userName와 topic을 {} (객체 리터럴) 형태로 전송하기 때문에 서버에서 받을 때 구조 분해를 해줘야 함 => 받을 때도 {}로 받아야 함
        // 객체 리터럴 형태 Ex) {userName:"권순호"} {topic:"우울"}
        socket.on("start chat", async (msg, {userName}, {topic}, callBack_setRoomName)=>{
        console.log(socket.id, msg);
        // SocketIO는 기본적으로 room을 제공 
        //room:예를 들어 채팅room이 될 수도 있고, 카지노 도박 room이 될 수도 있음 
        socket["userName"]=userName;
        socket["topic"]= topic;

        //chatbot key값 생성
        const chatKey= v4();
        
        socket["key"] = chatKey;
        
        console.log(socket["userName"], socket["topic"], socket["key"]);

        //callback: roomName 전송
        callBack_setRoomName(socket["userName"], socket["topic"], socket["key"]);

        const gpt= await callChatGptFirst(socket["userName"], socket["topic"], socket["key"] );
        console.log("result:",gpt);
        //상담 시작
        socket.emit("AI-chat-message", gpt);
    });
        
    } catch (error) {
        console.log("start chat error:", error);
    }
    

    // 채팅 진행
    socket.on('AI-chat-message', async(userMessage)=>{
        const responseGpt= await callChatGPT( socket["key"], userMessage );
        socket.emit("AI-chat-message", responseGpt );
    });
    
    //상담 시작(이어서 시작)
    socket.on('start chat_ing', async({msg},{userName}, {topic}, {counselKeywordRecord},{pastFeedback},callBack_setStartChat_ing )=>{

        console.log(socket.id, msg, counselKeywordRecord);
        // SocketIO는 기본적으로 room을 제공 
        //room:예를 들어 채팅room이 될 수도 있고, 카지노 도박 room이 될 수도 있음 
        socket["userName"]=userName;
        socket["topic"]= topic;

        //chatbot key값 생성
        const chatKey= v4();
        
        socket["key"] = chatKey;
        
        console.log(socket["userName"], socket["topic"], socket["key"]);

        //callback: roomName 전송
        callBack_setStartChat_ing(socket["userName"], socket["topic"], socket["key"]);

        
        const gpt= await callChatGptFirst_ing(socket["userName"], socket["topic"], socket["key"],counselKeywordRecord,pastFeedback );
        console.log("result:",gpt);
        //상담 시작
        socket.emit("AI-chat-message", gpt);
    
    
    });


    //채팅 시작

    //채팅 종류 시 데이터 저장
    socket.on('end chat', async(userId, callBack_setFeedbackSummary)=>{
        console.log("챗봇 종료");

    try {
        //데이터 요약 및 피드백
        const summaryAndFeedback = await summaryCounseling(socket["key"]);

        if(summaryAndFeedback)
        {

            //데이터 저장
            const counselSummary= summaryAndFeedback.summary;
            const counselFeedback =summaryAndFeedback.feedback;
            const counselKeywordRecord = summaryAndFeedback.counselKeywordRecord;
            const topic = socket["topic"];

            console.log("gpt summary:",counselSummary);
            console.log("gpt feedback:",counselFeedback);
            console.log("gpt counselRecord:",counselKeywordRecord);

            //Load Counsel
            const counselingRecord = await redisLoad(socket["key"]);

            //처음 명령 프롬프트 값 삭제 후 저장
            const filteredCounselingRecord = counselingRecord
            .filter(item => item.role !== 'system');

            
            //callback 전송
            callBack_setFeedbackSummary(counselFeedback,counselSummary, counselKeywordRecord );

            //firebase 저장
            saveConseling(userId, filteredCounselingRecord, counselFeedback,counselSummary,counselKeywordRecord, topic);
        }

    } catch (error) {
        console.log("error:", error);
    }
     
        
    })

    //상담 나가기
    socket.on("disconnect", ()=>{
        console.log("연결이 Disconnected 되었습니다.", socket.id,);

        //데이터 삭제
        redisDelete(socket["key"]);
    })
})

//redis connect
redisInit();

// 포트 번호: 3002
// @ts-ignore
SocketIoServer.listen(3002, handleListen);