'use client'

import { useTaskModalStore } from '@/store/calendar'
import { useState } from 'react'
import { BrainCircuit, X, Clock, Calendar as CalendarIcon, Loader2, ArrowRight, Save, Anchor } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function TaskModal() {
    const { isOpen, closeModal, start, end } = useTaskModalStore()
    const [title, setTitle] = useState('')
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<any>(null)
    const [dynamicData, setDynamicData] = useState<Record<string, any>>({})

    const [deadline, setDeadline] = useState('')
    const [proficiency, setProficiency] = useState('보통')
    const [priority, setPriority] = useState('보통')
    const [scheduling, setScheduling] = useState(false)

    const handleTitleBlur = () => {
        if (title.length > 3 && !analysis) {
            handleAnalyze()
        }
    }

    const handleAnalyze = async () => {
        if (!title.trim() || analyzing) return
        setAnalyzing(true)
        try {
            const res = await fetch('/api/analyze-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            })
            const data = await res.json()
            setAnalysis(data)
        } catch (err) {
            console.error(err)
        } finally {
            setAnalyzing(false)
        }
    }

    const handleSaveToInbox = async () => {
        if (!title) return alert('할 일을 입력해주세요.')
        setScheduling(true)
        try {
            await fetch('/api/inbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            })
            closeModal()
            window.location.reload()
        } catch (err) {
            console.error(err)
        } finally {
            setScheduling(false)
        }
    }

    const handleManualBlock = async () => {
        if (!title) return alert('일정 이름을 입력해주세요.')
        if (!start || !end) return alert('시간 정보가 없습니다.')

        setScheduling(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    title,
                    status: 'SCHEDULED',
                    estimated_time_minutes: Math.round((end.getTime() - start.getTime()) / 60000),
                    deadline: end.toISOString()
                })
                .select()
                .single()

            if (taskError) throw taskError

            await supabase.from('time_blocks').insert({
                task_id: task.id,
                user_id: user.id,
                start_time: start.toISOString(),
                end_time: end.toISOString()
            })

            closeModal()
            window.location.reload()
        } catch (err) {
            alert('일정 저장 실패')
        } finally {
            setScheduling(false)
        }
    }

    const handleSchedule = async () => {
        if (!title) return alert('할 일을 입력해주세요.')
        const finalDeadline = deadline || new Date(Date.now() + 86400000).toISOString().split('T')[0]

        setScheduling(true)
        try {
            const res = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    deadline: new Date(finalDeadline + 'T23:59:59').toISOString(),
                    proficiency,
                    priority,
                    dynamicData,
                    searchRangeStart: start?.toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })
            })

            const data = await res.json()
            if (data.error) alert(data.error)
            else {
                closeModal()
                window.location.reload()
            }
        } catch (err) {
            alert('스케줄링 중 오류가 발생했습니다.')
        } finally {
            setScheduling(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-1">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <BrainCircuit className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">할 일 추가</h2>
                        </div>
                        <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-6 pb-6 space-y-4">
                        <div className="relative">
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                placeholder="무엇을 하실 건가요?"
                                className="w-full px-5 py-4 text-lg font-medium rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder-gray-400"
                            />
                            {analyzing && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Three Buttons for Three Intentions */}
                        <div className="grid grid-cols-1 gap-2">
                            {/* Manual Fix Button */}
                            <button
                                onClick={handleManualBlock}
                                disabled={scheduling}
                                className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Anchor className="w-4 h-4" />
                                이 시간에 고정하기 (Manual)
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={handleSaveToInbox}
                                    disabled={scheduling}
                                    className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Inbox에 저장
                                </button>
                                <button
                                    onClick={handleSchedule}
                                    disabled={scheduling || !title}
                                    className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <BrainCircuit className="w-4 h-4" />
                                    AI 자동 배치
                                </button>
                            </div>
                        </div>

                        {analysis && (
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-3">
                                    {analysis?.suggestedFields?.map((field: any) => (
                                        <div key={field.key} className="flex items-center gap-3">
                                            <span className="text-xs font-semibold text-blue-700 shrink-0 w-24">{field.label}</span>
                                            {field.type === 'select' ? (
                                                <select
                                                    className="flex-1 px-3 py-1.5 rounded-lg border border-blue-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white/80"
                                                    onChange={(e) => setDynamicData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                >
                                                    <option value="">선택</option>
                                                    {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    placeholder="입력..."
                                                    className="flex-1 px-3 py-1.5 rounded-lg border border-blue-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white/80"
                                                    onChange={(e) => setDynamicData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
