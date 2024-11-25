import { createClient } from "redis"
import 'dotenv/config';

let client = null;

//redis 초기화
export async function redisInit() {
    client = createClient({
        url: process.env.REDIS_URL,
        //비밀번호 설정
        //[ErrorReply: NOAUTH Authentication required.]
        password: process.env.REDIS_PASSWORD
    })
    // 연결 시도
    try {
        await client.connect();
        console.log('Redis에 연결되었습니다!')
    } catch (err) {
        console.error('Redis 연결 에러:', err)
    }
}

// 메세지 저장
export async function redisSaveMsg(key, gpt_role, msg) {
    try {
        //json 만들기
        const data = {
            role: gpt_role,
            content: msg
        }

        //rPush: 오른쪽 뒤에 추가
        await client.rPush(key, JSON.stringify(data));
    }

    catch (err) {
        console.log("Save Error:", err);
        return;
    }

}


export async function redisLoad(key) {
    try {
        //키 값에 해당되는 모든 데이터 가져오기
        const messages = await client.lRange(key, 0, -1);

        const parsedMessages =[];

        // 각 메시지를 개별적으로 파싱
         messages.map(msg => {
            try {
                console.log("msg:", msg);
                //object로 변환 
                parsedMessages.push(JSON.parse(msg));
            } catch (parseErr) {
                console.log('JSON 파싱 에러:', parseErr);
                return null;
            }
        }).filter(msg => msg !== null); // null 값 제거
        
        return parsedMessages;
    }
    catch (err) {
        console.log('Redis 로드 에러:', err);
    }
}

export async function redisEnd() {
    console.log("redis disconnect");
    await client.quit();
}

export async function redisDelete(key) {
    try {
        // 존재하지 않는 키 확인
        const beforeRemoveExists = await client.exists(key);
        console.log("키 존재 여부:", beforeRemoveExists); // 0 출력 (존재하지 않음)

        // 데이터 삭제
        // 리스트 데이터 삭제
        await client.del(key);

        // 삭제 후 데이터 확인
        console.log("삭제 후:", await client.get(key)); // null 출력

        // 존재하지 않는 키 확인
        const afterRemoveExists = await client.exists(key);
        console.log("키 존재 여부:", afterRemoveExists); // 0 출력 (존재하지 않음)
    } catch (err) {
        console.error('Redis 에러:', err);
    }
}

// await를 작성하지 않으면 해당 함수가 완료될 때까지 기다리지 않고 바로 다음 메소드 실행
