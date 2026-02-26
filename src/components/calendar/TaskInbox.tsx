'use client'

import { useState, useEffect } from 'react'
import { Plus, Clock, Loader2, BrainCircuit, ArrowRight, Stars } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function TaskInbox() {
    const supabase = createClient()
    const [tasks, setTasks] = useState<any[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchInbox()
    }, [])

    const fetchInbox = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'INBOX')
            .order('created_at', { ascending: false })

        setTasks(data || [])
    }

    const addTask = async (title: string) => {
        setLoading(true)
        try {
            await fetch('/api/inbox', {
                method: 'POST',
                body: JSON.stringify({ title })
            })
            fetchInbox()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && input.trim()) {
            const currentInput = input
            setInput('')
            await addTask(currentInput)
        }
    }

    const handleBatchSchedule = async () => {
        setLoading(true)
        try {
            await fetch('/api/batch-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskIds: tasks.map(task => task.id) })
            })
            fetchInbox()
        } catch (error) {
            console.error('Failed to batch schedule tasks:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full lg:w-80 flex flex-col h-full bg-white relative z-20">
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                    <h2 className="font-black text-slate-900 text-3xl tracking-tighter">Inbox</h2>
                    <p className="text-[11px] text-blue-600 font-black uppercase tracking-[0.2em]">Frequency</p>
                </div>
                {tasks.length > 0 && (
                    <button
                        onClick={handleBatchSchedule}
                        disabled={loading}
                        className="p-3 rounded-2xl bg-slate-900 hover:bg-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 group"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                    </button>
                )}
            </div>

            {/* Input Section */}
            <div className="px-8 mb-8">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="What's on your mind?"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleAdd}
                        className="w-full pl-5 pr-14 py-5 rounded-[24px] bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all text-[15px] font-bold text-slate-900 placeholder:text-slate-400 shadow-sm"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-blue-600 shadow-md">
                        <Plus className="w-4 h-4 text-white" />
                    </div>
                </div>
            </div>

            {/* Scrollable Task List */}
            <div className="flex-1 overflow-auto px-8 pb-8 space-y-4 custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <Stars className="w-10 h-10 mb-4 text-slate-100" />
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Inbox Empty</p>
                    </div>
                ) : (
                    tasks.map((task) => {
                        return (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(task))}
                                className="group p-5 rounded-[28px] bg-white border border-slate-100 hover:border-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                                data-event={JSON.stringify(task)}
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {task.category && task.category !== 'Unknown' && (
                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-wider mb-2 inline-block">
                                                    {task.category}
                                                </span>
                                            )}
                                            <h4 className="text-[14px] font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                                                {task.title}
                                            </h4>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-all mt-1" />
                                    </div>

                                    <div className="flex items-center gap-4 pt-1">
                                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 opacity-30" />
                                            {task.estimated_time_minutes ? `${task.estimated_time_minutes}m` : 'Analyzing'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
