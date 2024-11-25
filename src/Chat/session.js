class CounselingSession {
    constructor(clientName, mainIssue) {
        this.clientName = clientName;
        this.mainIssue = mainIssue;
        this.sessionCount = 0;
        this.conversationHistory = [];
        this.lastSessionDate = null;
    }

    async startSession() {
        this.sessionCount++;
        this.lastSessionDate = new Date();
        
        const initialMessage = this.sessionCount === 1 
            ? `새로운 내담자 ${this.clientName}님과의 첫 상담입니다. 주호소문제: ${this.mainIssue}`
            : `${this.clientName}님과의 ${this.sessionCount}번째 상담 세션입니다. 이전 세션 리뷰: ${this.getLastSessionSummary()}`;

        return await conductCounseling(initialMessage);
    }

    getLastSessionSummary() {
        // 이전 세션 요약 로직
        if (this.conversationHistory.length === 0) return '';
        
        const lastSession = this.conversationHistory[this.conversationHistory.length - 1];
        return lastSession.summary || '이전 세션 기록이 없습니다.';
    }
}