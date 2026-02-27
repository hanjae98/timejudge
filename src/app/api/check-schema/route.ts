import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    try {
        const { data: tasks } = await supabase.from('tasks').select('*').limit(1)
        const { data: blocks } = await supabase.from('time_blocks').select('*').limit(1)

        return NextResponse.json({
            tasks: tasks && tasks.length > 0 ? Object.keys(tasks[0]) : 'empty',
            blocks: blocks && blocks.length > 0 ? Object.keys(blocks[0]) : 'empty'
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message })
    }
}
