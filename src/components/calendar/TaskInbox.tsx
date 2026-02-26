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
        <div className="w-80 bg-white border-l border-gray-100 flex flex-col h-full shadow-sm">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                    <h2 className="font-bold text-gray-900">Inbox</h2>
                    <p className="text-[10px] text-gray-400 font-medium">머릿속 생각을 툭 던지세요</p>
                </div>
                {tasks.length > 0 && (
                    <button
                        onClick={handleBatchSchedule}
                        disabled={loading}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                        AI 전체 배치
                    </button>
                )}
            </div>

            {/* Input & Templates */}
            <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="툭 던져보세요 (Enter)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleAdd}
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium bg-white shadow-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                </div>

                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                    {['☕ 아침 루틴', '📧 메일 확인', '📝 데일리 리포트'].map(tmpl => (
                        <button
                            key={tmpl}
                            onClick={() => addTask(tmpl)}
                            className="bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all whitespace-nowrap text-[9px] font-bold shadow-sm active:scale-95"
                        >
                            {tmpl}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Task List */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
                {tasks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <Plus className="w-8 h-8 mb-2 text-gray-300" />
                        <p className="text-xs font-medium">아직 할 일이 없습니다.<br />위에서 툭 던져보세요!</p>
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
                                className={`group p-4 bg-white rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden ${isStale ? 'border-red-200 bg-red-50/20' : 'border-gray-100'
                                    }`}
                                data-event={JSON.stringify(task)}
                            >
                                {isStale && (
                                    <div className="absolute top-0 right-0 p-1">
                                        <div className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg animate-pulse shadow-sm">
                                            STALE
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start justify-between gap-3 relative z-10">
                                    <div className="flex-1">
                                        {task.category && task.category !== 'Unknown' && (
                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                                                {task.category}
                                            </span>
                                        )}
                                        <h4 className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-700 transition-colors">{task.title}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[9px] text-gray-400 flex items-center gap-1 font-bold">
                                                <Clock className="w-2.5 h-2.5" />
                                                {task.estimated_time_minutes ? `${task.estimated_time_minutes}분` : '분석 전'}
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-all translate-x-1" />
                                </div>
                                {isStale && (
                                    <div className="mt-3 text-[9px] text-red-500 font-bold border-t border-red-100 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        방치된 지 7일이 넘었습니다! 😱
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
