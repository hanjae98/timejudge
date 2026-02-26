'use client'

import { useState, useEffect } from 'react'
import { Plus, Clock, Loader2, BrainCircuit, ArrowRight } from 'lucide-react'
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
        <div className="w-80 glass border-l border-white/5 flex flex-col h-full shadow-2xl relative z-20">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h2 className="font-black text-white text-xl tracking-tight">Inbox</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Unprocessed Thoughts</p>
                </div>
                {tasks.length > 0 && (
                    <button
                        onClick={handleBatchSchedule}
                        disabled={loading}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-xl text-[10px] font-black border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3 text-blue-400" />}
                        AI AUTO-SYNC
                    </button>
                )}
            </div>

            {/* Input Section */}
            <div className="p-5 border-b border-white/5 bg-white/5">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="툭 던져보세요"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleAdd}
                        className="w-full pl-4 pr-10 py-3.5 rounded-2xl bg-slate-900/50 border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-bold text-white placeholder:text-slate-600"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Plus className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                </div>

                <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                    {['☕ 아침 루틴', '📧 메일 확인', '📝 데일리 리포트'].map(tmpl => (
                        <button
                            key={tmpl}
                            onClick={() => addTask(tmpl)}
                            className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap text-[10px] font-black"
                        >
                            {tmpl}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Task List */}
            <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
                {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <BrainCircuit className="w-12 h-12 mb-4 text-slate-400" />
                        <p className="text-xs font-black uppercase tracking-widest leading-loose">No pending<br />frequency</p>
                    </div>
                ) : (
                    tasks.map((task) => {
                        const daysOld = Math.floor((new Date().getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24))
                        const isStale = daysOld >= 7

                        return (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(task))}
                                className={`
                                    group glass-card p-5 rounded-[24px] border border-white/5 transition-all cursor-grab active:cursor-grabbing 
                                    hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden
                                    ${isStale ? 'border-red-500/20 bg-red-500/5' : ''}
                                `}
                                data-event={JSON.stringify(task)}
                            >
                                <div className="flex flex-col gap-3 relative z-10">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            {task.category && task.category !== 'Unknown' && (
                                                <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2 inline-block">
                                                    {task.category}
                                                </span>
                                            )}
                                            <h4 className="text-[13px] font-bold text-slate-200 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                                                {task.title}
                                            </h4>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                    </div>

                                    <div className="flex items-center gap-3 border-t border-white/5 pt-3">
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase tracking-wide">
                                            <Clock className="w-3 h-3 text-blue-500/50" />
                                            {task.estimated_time_minutes ? `${task.estimated_time_minutes}M` : 'ANALYZING'}
                                        </span>
                                    </div>
                                </div>
                                {isStale && (
                                    <div className="absolute top-0 right-0 p-1">
                                        <div className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-xl shadow-lg">
                                            STALE
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
