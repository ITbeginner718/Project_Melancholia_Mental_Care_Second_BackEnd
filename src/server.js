import express from "express"
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import axios from "axios";
import { v4 as uuidv4 } from "uuid"; // ES Modules

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
    socket.emit('socket connect',`연결되었습니다.`);

    // 채팅 셋팅
    socket.on("start chat", (msg, userName, topic, callBack_setRoomName)=>{
        console.log(socket.id, msg);
        // SocketIO는 기본적으로 room을 제공 
        //room:예를 들어 채팅room이 될 수도 있고, 카지노 도박 room이 될 수도 있음 
        socket["userName"]=userName;
        socket["topic"]= topic;

        // roomName 설정
        const roomName = `Room-${uuidv4()}`;

        socket.join(roomName); //=> roomname으로 room에 참가

        //누가 어디 room에 들어왔는지 알려줌
        console.log(socket.rooms); //{GBx19_-JAy-RDODvAAAD(해당 소켓 id), room 이름1, room 이름2, room 이름3} => 해당 소켓이 어떤 room에 있는지 알려줌
        
        // 현재 room list 
        const Rooms = SocketIoServer.sockets.adapter.rooms;

        // room 정보 순회
        Rooms.forEach((value, room) => {
            console.log('Room:', room);
        });

        //callback: roomName 전송
        callBack_setRoomName(roomName);
    });

    //채팅 종류 시 룸방 나가기
    socket.on("end chat", (roomName)=>{
        console.log("room leave:", roomName);

        // 채팅 종류 시 룸방 나가기
        socket.leave(roomName);
    })

    //채팅 룸방 나가기
    socket.on("disconnect", ()=>{
        console.log("연결이 Disconnected 되었습니다.", socket.id,);
    })

    //채팅 시작
})

// 포트 번호: 3002
SocketIoServer.listen(3002, handleListen);