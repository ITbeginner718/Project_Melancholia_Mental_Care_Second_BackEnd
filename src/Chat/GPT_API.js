import OpenAI from "openai";
import 'dotenv/config';
import { redisDelete, redisLoad, redisSaveMsg } from "../Cache/redis.js";


const openai = new OpenAI({
    // @ts-ignore
    api_key: 'process.env.OPENAI_API_KEY'
});

const ROLE_USER="user";
const ROLE_ASSISTANT="assistant";

const chatConfig = {
    model: 'gpt-4o-mini',
    // messages: messages,
    temperature: 0.7,  // 적절한 공감과 창의성을 위해 0.7 정도 권장
    max_tokens: 2000,
    presence_penalty: 0.6,  // 다양한 응답을 위해 약간의 페널티 부여
    frequency_penalty: 0.4  // 반복적인 응답 방지
};

// ChatGPT에 대화식으로 요청을 보내는 함수
export async function callChatGptFirst(userName, topic, key) {

    //console.log(message)
    //해당 분야를 처음 상담 프롬프트
    const prompt = createPromptCounselFirst(userName, topic);
    
    //redis save
    prompt.map( async (data)=>(
        await redisSaveMsg(key,data.role, data.content)
    ));


    try {

        //redis gpt 세션 데이터 가져오기
        const conversationHistory = await redisLoad(key);

        console.log("대화 내용:", conversationHistory);
        const response = await openai.chat.completions.create(
            {
                ...chatConfig,
                messages:conversationHistory,
          }
        );

        // 모델의 응답에서 답변 가져오기
        const answer = response.choices[0].message.content;
        console.log('ChatGPT 답변:', answer);

        // 상담사 응답 저장
        await redisSaveMsg(key, 'assistant', answer);

        return answer;

    } catch (error) {
        console.error('ChatGPT 요청 중 오류:', error);
        throw error;
    }
}

//상담 진행
export async function callChatGPT(key, userMessage)
{
    //redis 사용자 데이터 저장
    try {
        if(userMessage)
        {
            //데이터 저장
            await redisSaveMsg(key,ROLE_USER, userMessage);
        }
        
    } catch (error) {
        console.log("redis error:", error);
    } 

    //gpt api 호출
    try {
        //대화 내용 가져오기
        const conversationHistory = await redisLoad(key);
 
        console.log("Data All Load:", conversationHistory);

        const response = await openai.chat.completions.create(
            {
                ...chatConfig,
                messages:conversationHistory,
          }
        );

        // 모델의 응답에서 답변 가져오기
        const answer = response.choices[0].message.content;
        console.log('ChatGPT 답변:', answer);

        // 상담사 응답 저장
        await redisSaveMsg(key, ROLE_ASSISTANT, answer);

        return answer;

    } catch (error) {
        console.error('ChatGPT 요청 중 오류:', error);
        await redisDelete(key);
        throw error;
    }
}



//처음 상담을 시작할 때 프롬프트 
function createPromptCounselFirst(userName, topic)
{

const prompt = [
    {
        role: 'system',
        content: `You are a CBT counselor. Follow these therapeutic steps using Socratic questioning to help clients reconstruct their thought patterns:

                Role: Empathetic CBT counselor using Socratic questioning
                Goal: Guide clients to identify and restructure maladaptive thoughts

                Process:
                1. Problem Identification
                "What specific situation triggered these thoughts?" (Clarifying)

                2. Thought Analysis
                "What thoughts came to mind then?" (Clarifying)
                "Why do you think that way?" (Assumption exploration)

                3. Cognitive Restructuring
                "What evidence supports this thought?" (Evidence seeking)
                "Could there be another way to view this?" (Alternative perspective)

                4. Action Planning
                "What might happen if this thinking continues?" (Consequence prediction)
                "What could you do differently?" (Alternative behavior)

                5. Reflection
                "What insights have you gained?" (Metacognitive)

                Core Guidelines:
                - Maintain empathetic, non-judgmental stance
                - Let clients reach their own conclusions
                - Validate emotions while challenging thoughts
                - Adapt questioning pace to client needs
                - Summarize insights gained

                Consultation is conducted in Korean.
                When conversation begins, analyze the flow and respond accordingly using these techniques. `
    },

    {
        role: 'user',
        content: `처음 시작하는 내담자와의 상담입니다.\n내담자 이름: ${userName}\n주요 호소: ${topic}`
    }
    
];
    return prompt
}
