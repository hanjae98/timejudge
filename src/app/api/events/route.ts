import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { data: blocks, error } = await supabase
            .from('time_blocks')
            .select(`
        id,
        start_time,
        end_time,
        is_completed,
        task:tasks(title, category)
      `)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json(blocks)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
