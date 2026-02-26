import { createClient } from '@/lib/supabase/server'
import { analyzeTaskIntent } from '@/lib/gemini'
import { estimateTaskTime } from '@/lib/gemini-estimate'
import { autoSchedule } from '@/lib/scheduler'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { taskIds } = await req.json()
        if (!taskIds || !Array.isArray(taskIds)) {
            return NextResponse.json({ error: 'Invalid taskIds' }, { status: 400 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

        if (!profile || profile.api_calls_left <= 0) {
            return NextResponse.json({ error: 'API 호출 횟수가 초과되었습니다.' }, { status: 429 })
        }

        const scheduledTasks = []

        for (const taskId of taskIds) {
            // 1. Fetch Task
            const { data: task } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .single()

            if (!task || task.status === 'SCHEDULED') continue

            // 2. AI Analysis if needed
            let category = task.category
            let estimatedMinutes = task.estimated_time_minutes

            if (!category || category === 'Unknown' || !estimatedMinutes) {
                const [analysis, est] = await Promise.all([
                    analyzeTaskIntent(task.title),
                    estimateTaskTime(task.title, '보통', {})
                ])
                category = analysis.category
                estimatedMinutes = est

                await supabase.from('tasks').update({
                    category,
                    estimated_time_minutes: estimatedMinutes
                }).eq('id', taskId)
            }

            // 3. Fetch current blocked slots for this specific task iteration
            const { data: existingBlocks } = await supabase
                .from('time_blocks')
                .select('start_time, end_time')
                .eq('user_id', user.id)
                .gte('end_time', new Date().toISOString())

            const blockedSlots = (existingBlocks || []).map(b => ({
                start: new Date(b.start_time),
                end: new Date(b.end_time)
            }))

            // 4. Run Scheduling Algorithm
            const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            const schedule = autoSchedule(
                estimatedMinutes,
                deadline,
                blockedSlots,
                new Date(),
                profile.timezone || 'Asia/Seoul',
                profile.fixed_routines || []
            )

            if (schedule.length > 0) {
                // Insert blocks
                const blocksToInsert = schedule.map(block => ({
                    task_id: task.id,
                    user_id: user.id,
                    start_time: block.start.toISOString(),
                    end_time: block.end.toISOString()
                }))

                await supabase.from('time_blocks').insert(blocksToInsert)
                await supabase.from('tasks').update({ status: 'SCHEDULED' }).eq('id', taskId)
                scheduledTasks.push(task.title)
            }
        }

        // Deduct ONE API call for the batch
        await supabase
            .from('users')
            .update({ api_calls_left: profile.api_calls_left - 1 })
            .eq('id', user.id)

        return NextResponse.json({ success: true, scheduledCount: scheduledTasks.length })

    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
