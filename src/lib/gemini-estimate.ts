import { model } from './gemini'

export async function estimateTaskTime(taskTitle: string, proficiency: string, dynamicData: any): Promise<number> {
    const prompt = `
    Based on the following task details, estimate the TOTAL minutes a professional would take to complete it.
    
    Task: ${taskTitle}
    Additional Info: ${JSON.stringify(dynamicData)}
    User Proficiency: ${proficiency}
    
    Return ONLY the estimated number of minutes as an integer.
  `

    try {
        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()
        const minutes = parseInt(text.replace(/[^0-9]/g, ''))

        // Apply proficiency weight
        let weight = 1.0
        if (proficiency === '초보') weight = 1.5
        if (proficiency === '능숙') weight = 0.7

        return Math.ceil((minutes || 60) * weight)
    } catch (error) {
        return 60 // Fallback
    }
}
