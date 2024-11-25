import OpenAI from "openai";
import 'dotenv/config';

// 세션 관리
let conversationHistory = [];


const openai = new OpenAI({
    api_key: 'process.env.OPENAI_API_KEY'
});



const chatConfig = {
    model: 'gpt-4o-mini',
    // messages: messages,
    temperature: 0.7,  // 적절한 공감과 창의성을 위해 0.7 정도 권장
    max_tokens: 2000,
    presence_penalty: 0.6,  // 다양한 응답을 위해 약간의 페널티 부여
    frequency_penalty: 0.4  // 반복적인 응답 방지
};



// ChatGPT에 대화식으로 요청을 보내는 함수
export async function callChatGPT(userName, topic,userMessage) {

     // 초기 시스템 메시지 설정 (첫 대화시에만)
     if (conversationHistory.length === 0) {
        //console.log(message)
        const prompt = createPrompt(userName, topic);

        prompt.map((data)=>(
            conversationHistory.push(data)
        ))
    }

    if(userMessage)
    {
    // 새로운 사용자 메시지 추가
    conversationHistory.push({
        role: 'user',
        content: userMessage
    });
    }


    try {

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
        conversationHistory.push({
            role: 'assistant',
            content: answer
        });

        return answer;

    } catch (error) {
        console.error('ChatGPT 요청 중 오류:', error);
        throw error;
    }
}

function createPrompt(userName, topic)
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
