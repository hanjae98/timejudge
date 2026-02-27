import { createClient } from '@/lib/supabase/server'
import { estimateTaskTime } from '@/lib/gemini-estimate'
import { analyzeTaskIntent } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'INBOX')
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(tasks)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { title } = await req.json()

        // 1. Create Inbox Item First (Instant gratification)
        const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
                title,
                user_id: user.id,
                status: 'INBOX',
                estimated_time_minutes: 0,
                proficiency: '보통',
                deadline: null
            })
            .select()
            .single()

        if (taskError) throw taskError

        return NextResponse.json({ success: true, task })

    } catch (error: any) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
