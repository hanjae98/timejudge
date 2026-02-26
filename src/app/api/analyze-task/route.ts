import { createClient } from '@/lib/supabase/server'
import { analyzeTaskIntent } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: profile } = await supabase
            .from('users')
            .select('api_calls_left')
            .eq('id', user.id)
            .single()

        if (!profile || profile.api_calls_left <= 0) {
            return NextResponse.json({ error: 'API 호출 횟수가 초과되었습니다.' }, { status: 429 })
        }

        const { title } = await req.json()

        // Timeout handling
        const analysisPromise = analyzeTaskIntent(title)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000))

        let analysis: any
        try {
            analysis = await Promise.race([analysisPromise, timeoutPromise])
        } catch (err: any) {
            if (err.message === 'TIMEOUT') {
                return NextResponse.json({
                    isAmbiguous: true,
                    suggestedFields: [{ label: "세부 내용", key: "details", type: "text" }],
                    reason: "분석 중 시간이 지연되었습니다. 수동 작성을 권장합니다."
                })
            }
            throw err
        }

        return NextResponse.json(analysis)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
