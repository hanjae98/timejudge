import { createClient } from '@/lib/supabase/server'
import { autoSchedule } from '@/lib/scheduler'
import { NextResponse } from 'next/server'
import { addMinutes } from 'date-fns'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { blockId, action, newStart, newEnd } = body

        // 1. Fetch current block
        const { data: block, error: blockError } = await supabase
            .from('time_blocks')
            .select('*, task:tasks(*)')
            .eq('id', blockId)
            .single()

        if (blockError || !block) throw new Error('Block not found')

        if (action === 'COMPLETE') {
            await supabase.from('time_blocks').update({ is_completed: true }).eq('id', blockId)
            return NextResponse.json({ success: true })
        }

        if (action === 'RESCHEDULE') {
            // Push all future blocks for this user by 30 minutes
            const { data: futureBlocks } = await supabase
                .from('time_blocks')
                .select('*')
                .eq('user_id', user.id)
                .gt('start_time', block.end_time)
                .eq('is_completed', false)
                .order('start_time', { ascending: true })

            if (futureBlocks && futureBlocks.length > 0) {
                for (const fb of futureBlocks) {
                    await supabase
                        .from('time_blocks')
                        .update({
                            start_time: addMinutes(new Date(fb.start_time), 30).toISOString(),
                            end_time: addMinutes(new Date(fb.end_time), 30).toISOString()
                        })
                        .eq('id', fb.id)
                }
            }

            // Adjust current block to be finished now
            await supabase.from('time_blocks').update({
                end_time: new Date().toISOString(),
                is_completed: true
            }).eq('id', blockId)

            return NextResponse.json({ success: true, pushedCount: futureBlocks?.length || 0 })
        }

        if (action === 'MOVE') {
            if (!newStart || !newEnd) throw new Error('New times missing')

            // Update time block
            await supabase.from('time_blocks').update({
                start_time: newStart,
                end_time: newEnd
            }).eq('id', blockId)

            // Update task duration & deadline to keep it consistent
            const duration = Math.round((new Date(newEnd).getTime() - new Date(newStart).getTime()) / 60000)
            await supabase.from('tasks').update({
                estimated_time_minutes: duration,
                deadline: newEnd
            }).eq('id', block.task_id)

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
