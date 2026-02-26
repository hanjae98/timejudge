'use client'

import { useTaskModalStore, TaskRange } from '@/store/calendar'
import { useState, useEffect } from 'react'
import { BrainCircuit, X, Clock, Calendar as CalendarIcon, Loader2, ArrowRight, Save, Anchor, Plus, Minus, ChevronRight, Timer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RangeWithTime extends TaskRange {
    hasTime: boolean
}

export default function TaskModal() {
    const { isOpen, closeModal, ranges: initialRanges } = useTaskModalStore()
    const [title, setTitle] = useState('')
    const [ranges, setRanges] = useState<RangeWithTime[]>([])
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<any>(null)
    const [dynamicData, setDynamicData] = useState<Record<string, any>>({})
    const [scheduling, setScheduling] = useState(false)

    const [proficiency, setProficiency] = useState('보통')
    const [priority, setPriority] = useState('보통')
    const [deadline, setDeadline] = useState('')

    useEffect(() => {
        if (isOpen) {
            // Default: All-day (no time)
            setRanges(initialRanges.map(r => ({ ...r, hasTime: false })))
        } else {
            setTitle('')
            setAnalysis(null)
            setDynamicData({})
        }
    }, [isOpen, initialRanges])

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

    const updateRangeTime = (index: number, field: 'start' | 'end', value: string) => {
        const newRanges = [...ranges]
        const current = new Date(newRanges[index][field])
        const [hours, minutes] = value.split(':')
        current.setHours(parseInt(hours), parseInt(minutes))
        newRanges[index][field] = current
        setRanges(newRanges)
    }

    const toggleTime = (index: number) => {
        const newRanges = [...ranges]
        newRanges[index].hasTime = !newRanges[index].hasTime
        if (newRanges[index].hasTime) {
            // Set default times if enabled
            newRanges[index].start.setHours(9, 0, 0)
            newRanges[index].end.setHours(10, 0, 0)
        }
        setRanges(newRanges)
    }

    const handleManualBlock = async () => {
        if (!title) return alert('일정 이름을 입력해주세요.')
        if (ranges.length === 0) return alert('지정된 시간이 없습니다.')

        setScheduling(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const totalMinutes = ranges.reduce((acc, r) => acc + (r.end.getTime() - r.start.getTime()) / 60000, 0)

            const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    user_id: user.id,
                    title,
                    status: 'SCHEDULED',
                    estimated_time_minutes: Math.round(totalMinutes),
                    deadline: ranges[ranges.length - 1].end.toISOString()
                })
                .select()
                .single()

            if (taskError) throw taskError

            const blocks = ranges.map(r => ({
                task_id: task.id,
                user_id: user.id,
                start_time: r.start.toISOString(),
                end_time: r.end.toISOString(),
                is_all_day: !r.hasTime
            }))

            await supabase.from('time_blocks').insert(blocks)

            closeModal()
            window.location.reload()
        } catch (err) {
            alert('일정 저장 실패')
        } finally {
            setScheduling(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white rounded-[48px] w-full max-w-2xl shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
                <div className="p-1">
                    <div className="px-10 py-8 flex items-center justify-between border-b border-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
                                <BrainCircuit className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Universe Event</h2>
                                <p className="text-xs font-bold text-slate-400">Bundle your tasks into a single universe</p>
                            </div>
                        </div>
                        <button onClick={closeModal} className="p-4 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-3xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="px-10 py-10 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                        <div className="relative group">
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                placeholder="What's the plan?"
                                className="w-full px-8 py-6 text-2xl font-black rounded-[32px] border-2 border-slate-100 focus:border-blue-500 focus:ring-[12px] focus:ring-blue-500/5 outline-none transition-all placeholder-slate-200"
                            />
                            {analyzing && (
                                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Multi-Range Configuration */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Universe Ranges</span>
                                <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-2xl text-[10px] font-black shadow-sm">
                                    {ranges.length} Ranges Configured
                                </span>
                            </div>
                            <div className="space-y-3">
                                {ranges.map((range, idx) => (
                                    <div key={idx} className="bg-slate-50/50 hover:bg-slate-50 p-6 rounded-[32px] border border-slate-100 transition-all group/range flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm text-xs font-black text-blue-600">
                                                    #{idx + 1}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-black text-slate-900 flex items-center gap-2">
                                                        <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                                                        {range.start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                                                        {range.start.getTime() !== range.end.getTime() && (
                                                            <>
                                                                <ChevronRight className="w-3 h-3 text-slate-300" />
                                                                {range.end.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                                                            </>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">Period Configuration</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleTime(idx)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border ${range.hasTime
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-500'
                                                        }`}
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    {range.hasTime ? 'Time Set' : 'All-day'}
                                                </button>
                                                <button
                                                    onClick={() => setRanges(ranges.filter((_, i) => i !== idx))}
                                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {range.hasTime && (
                                            <div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 pt-2 border-t border-slate-100">
                                                <div className="flex-1 flex items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                                                    <Timer className="w-4 h-4 text-slate-300 ml-2 mr-3" />
                                                    <input
                                                        type="time"
                                                        value={`${range.start.getHours().toString().padStart(2, '0')}:${range.start.getMinutes().toString().padStart(2, '0')}`}
                                                        onChange={(e) => updateRangeTime(idx, 'start', e.target.value)}
                                                        className="w-full bg-transparent border-none text-sm font-black p-2 rounded-lg focus:ring-0 outline-none"
                                                    />
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-slate-200 shrink-0" />
                                                <div className="flex-1 flex items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                                                    <Timer className="w-4 h-4 text-slate-300 ml-2 mr-3" />
                                                    <input
                                                        type="time"
                                                        value={`${range.end.getHours().toString().padStart(2, '0')}:${range.end.getMinutes().toString().padStart(2, '0')}`}
                                                        onChange={(e) => updateRangeTime(idx, 'end', e.target.value)}
                                                        className="w-full bg-transparent border-none text-sm font-black p-2 rounded-lg focus:ring-0 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {analysis && (
                            <div className="p-8 bg-blue-50/50 rounded-[40px] border border-blue-100/50 space-y-6 animate-in slide-in-from-top-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">AI Dimension Analysis</span>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {analysis?.suggestedFields?.map((field: any) => (
                                        <div key={field.key} className="flex flex-col gap-2">
                                            <label className="text-[11px] font-black text-slate-500 px-1 ml-1">{field.label}</label>
                                            {field.type === 'select' ? (
                                                <select
                                                    className="w-full px-7 py-5 rounded-[24px] border-2 border-blue-100 text-sm font-bold focus:ring-[12px] focus:ring-blue-500/5 outline-none bg-white/80 transition-all"
                                                    onChange={(e) => setDynamicData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                >
                                                    <option value="">Select Option</option>
                                                    {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            ) : (
                                                <input
                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                    placeholder="Enter details..."
                                                    className="w-full px-7 py-5 rounded-[24px] border-2 border-blue-100 text-sm font-bold focus:ring-[12px] focus:ring-blue-500/5 outline-none bg-white/80 transition-all"
                                                    onChange={(e) => setDynamicData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-10 bg-slate-50/80 border-t border-slate-100 space-y-5">
                        <button
                            onClick={handleManualBlock}
                            disabled={scheduling || !title || ranges.length === 0}
                            className="w-full py-6 bg-slate-900 hover:bg-black text-white font-black rounded-[28px] shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)] transition-all active:scale-[0.97] flex items-center justify-center gap-4 group"
                        >
                            <Anchor className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            <span className="text-lg">Deploy to Schedule</span>
                        </button>

                        <div className="grid grid-cols-2 gap-5">
                            <button
                                disabled={scheduling}
                                className="py-5 bg-white hover:bg-slate-100 text-slate-600 font-bold rounded-[24px] border border-slate-200 transition-all flex items-center justify-center gap-3"
                            >
                                <Save className="w-5 h-5" />
                                Draft Dimension
                            </button>
                            <button
                                disabled={scheduling || !title}
                                className="py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-[24px] shadow-xl shadow-blue-600/20 transition-all active:scale-[0.97] flex items-center justify-center gap-3 group"
                            >
                                <BrainCircuit className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                AI Auto-Pilot
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
