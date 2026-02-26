'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Clock, Tag } from 'lucide-react'

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        const fetchTasks = async () => {
            const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
            setTasks(data || [])
        }
        fetchTasks()
    }, [])

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-8">내 할 일 목록</h1>
            <div className="grid gap-4">
                {tasks.map(task => (
                    <div key={task.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{task.category || '분류 없음'}</span>
                            <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                            <div className="flex items-center gap-3 mt-2 text-gray-400 text-sm">
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {task.estimated_time_minutes || 0}분</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${task.status === 'SCHEDULED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {task.status}
                                </span>
                            </div>
                        </div>
                        <CheckCircle2 className={`w-6 h-6 ${task.status === 'SCHEDULED' ? 'text-green-500' : 'text-gray-200'}`} />
                    </div>
                ))}
            </div>
        </div>
    )
}
