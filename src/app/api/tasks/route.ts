import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { title, description, priority, timeRanges, memo, dimensions } = await req.json()

        // 1. Create Task
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
                user_id: user.id,
                title,
                priority: priority || 'MEDIUM',
                category: 'MANUAL',
            })
            .select()
            .single()

        if (taskError) throw taskError

        // 2. Create Blocks from timeRanges
        const blocksToInsert = timeRanges.map((tr: any) => {
            const start = new Date(tr.date)
            start.setHours(tr.startHour, tr.startMinute)
            const end = new Date(tr.date)
            end.setHours(tr.endHour, tr.endMinute)

            return {
                user_id: user.id,
                task_id: task.id,
                start_time: start.toISOString(),
                end_time: end.toISOString()
            }
        })

        const { error: blockError } = await supabase
            .from('time_blocks')
            .insert(blocksToInsert)

        if (blockError) throw blockError

        return NextResponse.json({ success: true, task })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
