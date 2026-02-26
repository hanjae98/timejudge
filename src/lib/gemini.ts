import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
});

export interface AnalysisResponse {
    isAmbiguous: boolean;
    category: string;
    suggestedFields: {
        label: string;
        key: string;
        type: 'number' | 'text' | 'select';
        options?: string[];
    }[];
    reason?: string;
}

export async function analyzeTaskIntent(taskTitle: string): Promise<AnalysisResponse> {
    const prompt = `
    Analyze the following task title for a productivity app: "${taskTitle}"
    
    1. Determine if the task is too ambiguous (e.g., "Study", "Work", "Exercise" without details).
    2. Categorize the task.
    3. Generate a set of detailed fields required to estimate professional time for this task.
    
    Return the result as a JSON object with the following structure:
    {
      "isAmbiguous": boolean,
      "category": string,
      "suggestedFields": [
        { "label": string, "key": string, "type": "number" | "text" | "select", "options": string[] (optional) }
      ],
      "reason": string
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("AI Analysis Error:", error);
        return {
            isAmbiguous: true,
            category: "Unknown",
            suggestedFields: [
                { label: "구체적인 작업 내용", key: "details", type: "text" },
                { label: "예상 분량(페이지/개수 등)", key: "amount", type: "number" }
            ],
            reason: "AI 분석에 실패했습니다. 수동으로 입력해 주세요."
        };
    }
}
export async function estimateTaskTime(taskTitle: string, proficiency: string, dynamicData: Record<string, any>): Promise<number> {
    const prompt = `
    Estimate how many minutes a professional task "${taskTitle}" will take.
    User Proficiency: ${proficiency}
    Extra Context: ${JSON.stringify(dynamicData)}
    
    Guidelines:
    - Return ONLY a single number representing minutes.
    - Be realistic. If it's a small task, 30-60 mins. If complex, 120-300 mins.
    - Do not include text, only the number.
  `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const minutes = parseInt(text.replace(/[^0-9]/g, ''));
        return isNaN(minutes) ? 60 : minutes;
    } catch (error) {
        console.error("AI Estimation Error:", error);
        return 60;
    }
}
