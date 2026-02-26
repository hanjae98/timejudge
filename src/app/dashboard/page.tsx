'use client'

import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import FullCalendar from '@fullcalendar/react'
import { Calendar, CheckCircle2, Loader2, ArrowRight, Plus, Clock } from 'lucide-react'
import { useTaskModalStore } from '@/store/calendar'
import { useState, useEffect, useRef } from 'react'
import TaskModal from '@/components/calendar/TaskModal'
import TaskInbox from '@/components/calendar/TaskInbox'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
    const { isOpen, openModal } = useTaskModalStore()
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const hoverRef = useRef<HTMLDivElement>(null)
    const [isSelecting, setIsSelecting] = useState(false)

    useEffect(() => {
        fetchEvents()
    }, [])

    useEffect(() => {
        const body = document.querySelector('.fc-timegrid-body')
        if (!body) return

        const handleMouseMove = (e: MouseEvent) => {
            // Hide hover preview if currently selecting, dragging, or modal is open
            if ((isSelecting || isOpen) && hoverRef.current) {
                hoverRef.current.style.opacity = '0'
                return
            }

            const rect = body.getBoundingClientRect()
            const y = e.clientY - rect.top

            const cols = document.querySelectorAll('.fc-timegrid-col')
            let activeCol: HTMLElement | null = null
            cols.forEach(col => {
                const cRect = col.getBoundingClientRect()
                if (e.clientX >= cRect.left && e.clientX <= cRect.right) {
                    activeCol = col as HTMLElement
                }
            })

            if (activeCol && (activeCol as any).getBoundingClientRect && hoverRef.current) {
                const colRect = (activeCol as any).getBoundingClientRect()
                const centerX = colRect.left + colRect.width / 2

                // 15 mins = 24px
                const slotIndex = Math.floor(y / 24)
                const snappedY = rect.top + (slotIndex * 24)

                const hour = 7 + Math.floor(slotIndex / 4)
                const min = (slotIndex % 4) * 15

                if (hour >= 7 && hour < 25) {
                    hoverRef.current.innerText = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
                    hoverRef.current.style.left = `${centerX}px`
                    hoverRef.current.style.top = `${snappedY - 6}px`
                    hoverRef.current.style.opacity = '1'
                } else {
                    hoverRef.current.style.opacity = '0'
                }
            } else if (hoverRef.current) {
                hoverRef.current.style.opacity = '0'
            }
        }

        const handleMouseDown = () => setIsSelecting(true)
        const handleMouseUp = () => setIsSelecting(false)
        const handleMouseLeave = () => { if (hoverRef.current) hoverRef.current.style.opacity = '0' }

        const target = body as HTMLElement
        window.addEventListener('mousemove', handleMouseMove)
        target.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        target.addEventListener('mouseleave', handleMouseLeave)

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            target.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mouseup', handleMouseUp)
            target.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [isSelecting, isOpen])

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events')
            const data = await res.json()
            if (Array.isArray(data)) {
                const formatted = data.map(block => {
                    const title = block.task?.title || '할 일'
                    const colors = [
                        { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' },
                        { bg: '#F5F3FF', text: '#5B21B6', border: '#8B5CF6' },
                        { bg: '#ECFDF5', text: '#065F46', border: '#10B981' },
                        { bg: '#FFF7ED', text: '#9A3412', border: '#F97316' },
                        { bg: '#FFF1F2', text: '#9F1239', border: '#FB7185' },
                        { bg: '#FDF2F8', text: '#9D174D', border: '#F472B6' },
                    ]
                    const hash = title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                    const colorScheme = colors[hash % colors.length]

                    return {
                        id: block.id,
                        title,
                        start: block.start_time,
                        end: block.end_time,
                        backgroundColor: block.is_completed ? '#F8FAFC' : colorScheme.bg,
                        textColor: block.is_completed ? '#94A3B8' : colorScheme.text,
                        borderColor: block.is_completed ? '#E2E8F0' : colorScheme.border,
                        extendedProps: {
                            ...block,
                            colorScheme
                        }
                    }
                })
                setEvents(formatted)
            }
        } catch (err) {
            console.error('Failed to fetch events:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleAction(blockId: string, action: 'COMPLETE' | 'RESCHEDULE') {
        const res = await fetch('/api/reschedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blockId, action })
        })
        if (res.ok) fetchEvents()
    }

    function renderDayHeader(headerInfo: any) {
        return (
            <div className="flex flex-col items-center py-2 group/header w-full relative">
                <div className="flex items-center gap-2">
                    <div className="text-[13px] font-black tracking-tighter transition-colors group-hover/header:text-blue-400">
                        {headerInfo.text}
                    </div>
                </div>
            </div>
        )
    }

    function renderEventContent(eventInfo: any) {
        const isCompleted = eventInfo.event.extendedProps.is_completed
        const color = eventInfo.event.extendedProps.colorScheme || { bg: '#1e293b', text: '#cbd5e1', border: '#334155' }
        const isMirror = eventInfo.isMirror
        const isSelection = isMirror && !eventInfo.event.id

        let displayStart = eventInfo.event.start
        let displayEnd = eventInfo.event.end

        if (isSelection && displayStart && displayEnd) {
            const ms15 = 15 * 60 * 1000
            let s = new Date(Math.round(displayStart.getTime() / ms15) * ms15)
            let e = new Date(Math.round(displayEnd.getTime() / ms15) * ms15)
            if (s.getTime() === e.getTime()) {
                e = new Date(s.getTime() + ms15)
            }
            displayStart = s
            displayEnd = e
        }

        const durationMs = (eventInfo.event.end?.getTime() || 0) - (eventInfo.event.start?.getTime() || 0)
        const isShort = durationMs <= 30 * 60 * 1000 // 30 mins or less

        const startTime = displayStart?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        const endTime = displayEnd?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

        return (
            <div className={`
                group/event relative h-full w-full rounded-2xl transition-all duration-500
                flex flex-col justify-start overflow-visible border
                ${isMirror ? 'z-[200] ring-4 ring-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.5)]' : 'hover:scale-[1.01] hover:border-blue-500/50'}
                ${isCompleted ? 'grayscale opacity-40' : 'shadow-lg'}
                ${isSelection ? 'bg-blue-600/20 border-blue-500 border-dashed animate-pulse' : ''}
                ${isShort ? 'p-2' : 'p-3'}
            `}
                style={{
                    backgroundColor: isCompleted ? 'rgba(30, 41, 59, 0.4)' : isMirror ? 'rgba(59, 130, 246, 0.2)' : `${color.bg}33`,
                    borderColor: isCompleted ? 'rgba(71, 85, 105, 0.2)' : isMirror ? '#3b82f6' : `${color.border}66`,
                    backdropFilter: 'blur(12px)'
                }}>

                {isMirror && (
                    <>
                        <div className="time-floating-bubble absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-[300]">
                            <div className="rounded-full bg-blue-600 text-white px-4 py-1.5 text-[11px] font-black shadow-2xl flex items-center gap-2 whitespace-nowrap">
                                <Plus className="w-3 h-3" />
                                {startTime}
                            </div>
                        </div>

                        <div className="time-floating-bubble absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 text-white px-4 py-1.5 rounded-full text-[11px] font-black shadow-2xl flex items-center gap-2 whitespace-nowrap z-[300]">
                            <ArrowRight className="w-3 h-3 text-blue-400" />
                            {endTime}
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-1.5 min-h-0 w-full">
                    <div className="flex items-start justify-between">
                        <div className={`
                            font-bold leading-tight tracking-tight break-words line-clamp-2
                            ${isShort ? 'text-[11px]' : 'text-sm'}
                            ${isCompleted ? 'line-through text-slate-500' : 'text-white'}
                        `}>
                            {isSelection ? '' : eventInfo.event.title}
                        </div>
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                    </div>
                </div>

                {!isCompleted && !isMirror && !isShort && (
                    <div className="mt-auto flex items-center gap-2 opacity-0 group-hover/event:opacity-100 transition-all duration-300 translate-y-2 group-hover/event:translate-y-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAction(eventInfo.event.id, 'COMPLETE') }}
                            className="flex-1 bg-white/10 hover:bg-emerald-500 text-white py-1 rounded-xl transition-all flex items-center justify-center"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {!isCompleted && !isSelection && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/event:opacity-100 transition-opacity pointer-events-none" />
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col relative p-4 md:p-10 text-slate-200">
            {/* Ultra-High Performance Hover Bubble (Centering) */}
            <div
                ref={hoverRef}
                className="fixed pointer-events-none z-[9999] bg-slate-900 border border-blue-500/30 px-2 py-1 rounded-lg text-[10px] font-black text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)] -translate-x-1/2 -translate-y-full opacity-0 pointer-events-none transition-all duration-75 ease-out"
                style={{ left: 0, top: 0 }}
            />

            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        My Universe
                    </h1>
                    <p className="text-slate-400 font-medium text-lg">AI가 설계한 당신의 몰입을 위한 시간선</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="glass-card text-slate-300 px-6 py-3 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 border-white/5"
                    >
                        새로고침
                    </button>
                    <button
                        onClick={() => openModal(new Date(), new Date(Date.now() + 3600000))}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all active:scale-95 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        일정 추가
                    </button>
                </div>
            </div>

            <div className="flex-1 glass rounded-[40px] shadow-2xl border-white/10 flex overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-xl flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                            <p className="text-blue-400 font-black animate-pulse uppercase tracking-widest text-sm">Synchronizing...</p>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 p-4 md:p-8 overflow-auto custom-scrollbar">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            firstDay={1}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'timeGridWeek,timeGridDay'
                            }}
                            height="auto"
                            stickyHeaderDates={true}
                            events={events}
                            editable={true}
                            eventResizableFromStart={true}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            nowIndicator={true}
                            allDaySlot={false}
                            slotMinTime="07:00:00"
                            slotMaxTime="25:00:00"
                            slotDuration="00:15:00"
                            slotLabelInterval="01:00:00"
                            snapDuration="00:01:00"
                            selectMinDistance={1}
                            eventMinHeight={20}
                            eventOverlap={false}
                            slotLabelFormat={{
                                hour: 'numeric',
                                meridiem: false,
                                hour12: false
                            }}
                            select={(info) => {
                                const start = new Date(info.start)
                                const end = new Date(info.end)
                                const ms15 = 15 * 60 * 1000
                                let snappedStart = new Date(Math.round(start.getTime() / ms15) * ms15)
                                let snappedEnd = new Date(Math.round(end.getTime() / ms15) * ms15)

                                if (snappedStart.getTime() === snappedEnd.getTime()) {
                                    snappedEnd = new Date(snappedStart.getTime() + ms15)
                                }

                                openModal(snappedStart, snappedEnd)
                                info.view.calendar.unselect()
                            }}
                            eventDrop={async (info) => {
                                const { event } = info
                                try {
                                    const res = await fetch('/api/reschedule', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            blockId: event.id,
                                            action: 'MOVE',
                                            newStart: event.start?.toISOString(),
                                            newEnd: event.end?.toISOString()
                                        })
                                    })
                                    if (!res.ok) info.revert()
                                } catch (err) { info.revert() }
                            }}
                            eventResize={async (info) => {
                                const { event } = info
                                try {
                                    const res = await fetch('/api/reschedule', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            blockId: event.id,
                                            action: 'MOVE',
                                            newStart: event.start?.toISOString(),
                                            newEnd: event.end?.toISOString()
                                        })
                                    })
                                    if (!res.ok) info.revert()
                                } catch (err) { info.revert() }
                            }}
                            eventContent={renderEventContent}
                            dayHeaderContent={renderDayHeader}
                        />
                    </div>
                </div>

                <TaskInbox />
            </div>

            <TaskModal />

            <style dangerouslySetInnerHTML={{
                __html: `
                .fc { 
                    --fc-border-color: rgba(255, 255, 255, 0.03); 
                    --fc-today-bg-color: rgba(59, 130, 246, 0.03); 
                }
                .fc .fc-toolbar-title { font-size: 2rem; font-weight: 900; color: white; letter-spacing: -0.05em; }
                .fc .fc-button-primary { 
                    background: rgba(255, 255, 255, 0.05); 
                    border: 1px solid rgba(255, 255, 255, 0.05); 
                    color: rgba(255, 255, 255, 0.6); 
                    font-weight: 800; 
                    border-radius: 14px; 
                    padding: 8px 16px; 
                    transition: all 0.2s ease;
                }
                .fc .fc-button-primary:hover { background: rgba(255, 255, 255, 0.1); color: white; }
                .fc .fc-button-active { background: #3b82f6 !important; color: white !important; }
                
                .fc-day-sun .fc-col-header-cell-cushion { color: #f87171 !important; }
                .fc-day-sat .fc-col-header-cell-cushion { color: #60a5fa !important; }

                .fc-v-event { background: transparent !important; border: none !important; box-shadow: none !important; }
                
                /* Selection Highlight Styling */
                .fc-highlight { 
                    background: rgba(59, 130, 246, 0.15) !important; 
                    border-radius: 24px !important;
                    border: 1px dashed rgba(59, 130, 246, 0.4) !important;
                }
                
                .fc-timegrid-slot-minor { border-top-style: none !important; }
                .fc-timegrid-slot-lane { border-bottom: 2px solid rgba(255,255,255,0.08) !important; }
                
                .fc-timegrid-slot-label { font-size: 11px; font-weight: 900; color: rgba(255,255,255,0.2) !important; text-transform: uppercase; padding-right: 12px !important; }
                .fc-col-header-cell { padding: 12px 0 !important; background: transparent; border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
                .fc-col-header-cell-cushion { font-size: 11px; font-weight: 900; color: rgba(255,255,255,0.5); text-decoration: none !important; text-transform: uppercase; letter-spacing: 0.1em; }
                
                .fc-timegrid-now-indicator-line { border-color: #3b82f6; border-width: 2px; }
                .fc-timegrid-now-indicator-arrow { border-color: #3b82f6; border-width: 6px; }

                .time-floating-bubble {
                    animation: bubbleIn 0.3s cubic-bezier(0.23, 1, 0.32, 1);
                    pointer-events: none;
                }
                @keyframes bubbleIn {
                    from { transform: scale(0.8) translateY(10px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                /* Enhance Resize Handles */
                .fc-v-event .fc-event-resizer {
                    height: 12px !important;
                    bottom: -6px !important;
                    z-index: 10;
                    cursor: ns-resize !important;
                }
                .fc-v-event .fc-event-resizer::after {
                    content: "";
                    position: absolute;
                    left: 50%;
                    bottom: 4px;
                    width: 20px;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    transform: translateX(-50%);
                }
                `}} />
        </div>
    )
}
