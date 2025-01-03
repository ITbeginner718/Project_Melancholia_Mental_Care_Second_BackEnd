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
    model: 'gpt-4o',
    // messages: messages,
    temperature: 0.6,  // 적절한 공감과 창의성을 위해 0.7 정도 권장
    max_tokens: 2000,
    presence_penalty: 0.6,  // 다양한 응답을 위해 약간의 페널티 부여
    frequency_penalty: 0.4  // 반복적인 응답 방지
};

// ChatGPT에 대화식으로 요청을 보내는 함수
export async function callChatGptFirst_ing(userName, topic, key, counselKeywordRecord, pastFeedback) {

    //console.log(message)
    //해당 분야를 처음 상담 프롬프트
    const prompt = createPromptCounselFirst_ing(userName, topic, counselKeywordRecord, pastFeedback);
    
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


//상담 내용 요약
export async function summaryCounseling(key)
{
    //데이터 로드
    const messages = await redisLoad(key);

    console.log("result: ",messages);

    const responseSummary = await openai.chat.completions.create(
        {
            ...chatConfig,
            messages:[
                {role:"system", content:`
                    다음 JSON 형식으로만 정확히 응답해줘. 다른 어떤 텍스트도 포함하지 마세요:
                    {
                        "summary": "여기에는 상담 내용의 핵심 요약과 다음 상담이 어떤식으로 진행됐으면 하는지 계획을 작성",
                        "feedback": "여기에는 상담 내용을 토대로 user가 가지고 있는 심리 마음 상태에 대한 피드백 작성",
                        "counselKeywordRecord": "여기에는 각 assistant 와  user 문장구조를 그대로 유지하고 각 문장들을 순서대로 키워드 중심으로 요약" 
                    }
                    형식을 절대 벗어나지 말고 JSON으로만 응답하세요.`
                },
                ...messages //... => spread로 배열 펼치기
            ],
      }
    );

    // 모델의 응답에서 답변 가져오기
    const answer = responseSummary.choices[0].message.content;
    let answerObject = null;
    if(answer)
    {
        answerObject = JSON.parse(answer);
    }

    return answerObject;
}

const createPromptCounselFirst_ing = (userName, topic, counselKeywordRecord, pastFeedback)=>{
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
            content: `과거 상담 기록이 있는 내담자와의 상담입니다. 
         
             \n내담자 이름: ${userName}\n주요 호소: ${topic}
            지난 상담 기록: ${counselKeywordRecord}
            지난 상담 피드백: ${pastFeedback}
            지난 상담 기록과 피드백을 통해 지난 대화에 어떤식으로 상담을 했는지 간단하게 요약해서 얘기해주고 상담을 계속 이어갔으면 좋겠어.
            내담자 이름은 텍스트 그대로 사용하세요.`
        }
        
    ];
        return prompt;
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
                When conversation begins, analyze the flow and respond accordingly using these techniques. 
                `
    },

    { 
        role: 'user',
        content: `처음 시작하는 내담자와의 상담입니다. 내담자 이름: ${userName}, 주요 호소: ${topic}  내담자 이름은 텍스트 그대로 사용하세요.`
    }
    
];
    return prompt;
}
