import { createClient } from '@/lib/supabase/server'
import { estimateTaskTime } from '@/lib/gemini-estimate'
import { autoSchedule } from '@/lib/scheduler'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { taskId, deadline, proficiency, priority, timezone: clientTimezone } = await req.json()

        // 1. Fetch the existing task from Inbox
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single()

        if (fetchError || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

        // 2. Rate Limiting Check
        const { data: profile } = await supabase
            .from('users')
            .select('api_calls_left, timezone, fixed_routines')
            .eq('id', user.id)
            .single()

        if (!profile || profile.api_calls_left <= 0) {
            return NextResponse.json({ error: 'API 호출 횟수가 초과되었습니다.' }, { status: 429 })
        }

        // 3. AI Time Estimation (if not already estimated)
        let estimatedMinutes = task.estimated_time_minutes
        if (!estimatedMinutes) {
            estimatedMinutes = await estimateTaskTime(task.title, proficiency || '보통', {})
        }

        // Priority Weight
        const finalPriority = priority || task.priority || '보통'
        if (finalPriority === '높음') estimatedMinutes = Math.ceil(estimatedMinutes * 1.1)

        // 4. Fetch existing blocks
        const { data: existingBlocks } = await supabase
            .from('time_blocks')
            .select('start_time, end_time')
            .eq('user_id', user.id)
            .gte('end_time', new Date().toISOString())

        const blockedSlots = (existingBlocks || []).map(b => ({
            start: new Date(b.start_time),
            end: new Date(b.end_time)
        }))

        // 5. Run Scheduling Algorithm
        const schedule = autoSchedule(
            estimatedMinutes,
            new Date(deadline),
            blockedSlots,
            new Date(), // Start from now
            clientTimezone || profile.timezone || 'Asia/Seoul',
            profile.fixed_routines || []
        )

        if (schedule.length === 0) {
            return NextResponse.json({ error: '가용 시간이 부족합니다.' }, { status: 400 })
        }

        // 6. Update Task Status and Save Blocks
        await supabase
            .from('tasks')
            .update({
                status: 'SCHEDULED',
                deadline,
                estimated_time_minutes: estimatedMinutes,
                priority: finalPriority
            })
            .eq('id', taskId)

        const blocksToInsert = schedule.map(block => ({
            task_id: taskId,
            user_id: user.id,
            start_time: block.start.toISOString(),
            end_time: block.end.toISOString()
        }))

        await supabase.from('time_blocks').insert(blocksToInsert)

        // Deduct API call
        await supabase
            .from('users')
            .update({ api_calls_left: profile.api_calls_left - 1 })
            .eq('id', user.id)

        return NextResponse.json({ success: true, blocks: blocksToInsert })

    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
