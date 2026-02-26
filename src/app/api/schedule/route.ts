import { createClient } from '@/lib/supabase/server'
import { estimateTaskTime } from '@/lib/gemini-estimate'
import { autoSchedule } from '@/lib/scheduler'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // 1. Rate Limiting Check
        const { data: profile } = await supabase
            .from('users')
            .select('api_calls_left, timezone, fixed_routines')
            .eq('id', user.id)
            .single()

        if (!profile || profile.api_calls_left <= 0) {
            return NextResponse.json({ error: 'API 호출 횟수가 초과되었습니다. (남은 횟수: 0)' }, { status: 429 })
        }

        const { title, deadline, proficiency, priority, dynamicData, searchRangeStart, timezone: clientTimezone } = await req.json()

        // 2. AI Time Estimation (with 10s Timeout)
        const estimationPromise = estimateTaskTime(title, proficiency, dynamicData)
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 12000))

        let estimatedMinutes: number
        try {
            estimatedMinutes = await Promise.race([estimationPromise, timeoutPromise]) as number

            // Priority Weight: Higher priority tasks get a small time buffer (+10%) to ensure quality
            if (priority === '높음') estimatedMinutes = Math.ceil(estimatedMinutes * 1.1)
        } catch (err: any) {
            if (err.message === 'TIMEOUT') {
                return NextResponse.json({ error: 'AI 분석 시간이 너무 오래 걸립니다. 다시 시도해 주세요.' }, { status: 504 })
            }
            throw err
        }

        // 3. Fetch existing blocks
        const { data: existingBlocks } = await supabase
            .from('time_blocks')
            .select('start_time, end_time, task:tasks(priority)')
            .eq('user_id', user.id)
            .gte('end_time', new Date().toISOString())

        // Sort existing blocks - if we were doing re-scheduling, we'd use this.
        // For now, we block all existing ones.
        const blockedSlots = (existingBlocks || []).map(b => ({
            start: new Date(b.start_time),
            end: new Date(b.end_time)
        }))

        // 4. Run Scheduling Algorithm (With Timezone & Fixed Routines)
        const schedule = autoSchedule(
            estimatedMinutes,
            new Date(deadline),
            blockedSlots,
            searchRangeStart ? new Date(searchRangeStart) : new Date(),
            clientTimezone || profile.timezone || 'Asia/Seoul',
            profile.fixed_routines || []
        )

        if (schedule.length === 0) {
            return NextResponse.json({
                error: '가용 시간이 부족합니다. 마감일을 미루거나 고정 루틴을 조정해 주세요.',
                estimatedMinutes
            }, { status: 400 })
        }

        // 5. Atomic Update Task & Deduct API Count
        // (For a production app, use a RPC/Transaction, but here we do simple sequence)
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                title,
                deadline,
                proficiency,
                priority,
                category: 'AI_GENERATED',
                estimated_time_minutes: estimatedMinutes
            })
            .select()
            .single()

        if (taskError) throw taskError

        const blocksToInsert = schedule.map(block => ({
            task_id: task.id,
            user_id: user.id,
            start_time: block.start.toISOString(),
            end_time: block.end.toISOString()
        }))

        const { error: blockError } = await supabase.from('time_blocks').insert(blocksToInsert)
        if (blockError) throw blockError

        // Deduct API call
        await supabase
            .from('users')
            .update({ api_calls_left: profile.api_calls_left - 1 })
            .eq('id', user.id)

        return NextResponse.json({ success: true, task, blocks: blocksToInsert, callsLeft: profile.api_calls_left - 1 })

    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
