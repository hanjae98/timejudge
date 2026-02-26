'use client'

import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import FullCalendar from '@fullcalendar/react'
import { Calendar, Loader2, RefreshCw, Plus, Check } from 'lucide-react'
import { useTaskModalStore } from '@/store/calendar'
import { useState, useEffect, useRef } from 'react'
import TaskModal from '@/components/calendar/TaskModal'
import TaskInbox from '@/components/calendar/TaskInbox'

export default function DashboardPage() {
    const { isOpen, openModal } = useTaskModalStore()
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSelecting, setIsSelecting] = useState(false)
    const mousePosRef = useRef({ x: 0, y: 0 })
    const hoverRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchEvents()
    }, [])

    useEffect(() => {
        const attachListeners = () => {
            const body = document.querySelector('.fc-timegrid-body')
            if (!body) return

            let rafId: number

            const updateHover = () => {
                const { x: clientX, y: clientY } = mousePosRef.current

                if ((isSelecting || isOpen) && hoverRef.current) {
                    hoverRef.current.style.opacity = '0'
                    return
                }

                // Don't show if over an event box
                const target = document.elementFromPoint(clientX, clientY)
                if (target?.closest('.fc-event')) {
                    if (hoverRef.current) hoverRef.current.style.opacity = '0'
                    return
                }

                const slots = document.querySelector('.fc-timegrid-slots')
                const cols = document.querySelectorAll('.fc-timegrid-col')
                const firstSlot = document.querySelector('.fc-timegrid-slot')
                if (!slots || cols.length === 0 || !hoverRef.current || !firstSlot) return

                const sRect = firstSlot.getBoundingClientRect()
                const slotHeight = sRect.height

                // Fine-tuned relativeY calculation from the exact first slot
                const relativeY = clientY - sRect.top

                let activeColRect: DOMRect | null = null
                cols.forEach(col => {
                    const r = col.getBoundingClientRect()
                    if (clientX >= r.left && clientX <= r.right) activeColRect = r
                })

                if (activeColRect) {
                    const centerX = (activeColRect as DOMRect).left + (activeColRect as DOMRect).width / 2
                    // Since relativeY starts from the first slot, slotIndex 0 is 07:00
                    const slotIndex = Math.floor(relativeY / slotHeight)
                    const snappedY = sRect.top + (slotIndex * slotHeight)

                    const hour = 7 + Math.floor(slotIndex / 4)
                    const min = (slotIndex % 4) * 15

                    if (hour >= 7 && hour < 25) {
                        hoverRef.current.innerText = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
                        hoverRef.current.style.transform = `translate3d(${centerX}px, ${snappedY}px, 0) translate(-50%, -100%)`
                        hoverRef.current.style.opacity = '1'
                    } else {
                        hoverRef.current.style.opacity = '0'
                    }
                } else {
                    hoverRef.current.style.opacity = '0'
                }
            }

            const handleMouseMove = (e: MouseEvent) => {
                mousePosRef.current = { x: e.clientX, y: e.clientY }
                cancelAnimationFrame(rafId)
                rafId = requestAnimationFrame(updateHover)
            }

            const handleScroll = () => {
                cancelAnimationFrame(rafId)
                rafId = requestAnimationFrame(updateHover)
            }

            const handleMouseDown = () => setIsSelecting(true)
            const handleMouseUp = () => setIsSelecting(false)

            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('scroll', handleScroll, true)
            body.addEventListener('mousedown', handleMouseDown)
            window.addEventListener('mouseup', handleMouseUp)

            return () => {
                cancelAnimationFrame(rafId)
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('scroll', handleScroll, true)
                body.removeEventListener('mousedown', handleMouseDown)
                window.removeEventListener('mouseup', handleMouseUp)
            }
        }

        const cleanup = attachListeners()
        return () => cleanup && cleanup()
    }, [isSelecting, isOpen, loading])

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events')
            const data = await res.json()
            if (Array.isArray(data)) {
                const formatted = data.map(block => {
                    const title = block.task?.title || '할 일'
                    const colors = [
                        { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' },
                        { bg: '#F3E8FF', text: '#6B21A8', border: '#A855F7' },
                        { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
                        { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
                        { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
                    ]
                    const hash = title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                    const colorScheme = colors[hash % colors.length]

                    return {
                        id: block.id,
                        title,
                        start: block.start_time,
                        end: block.end_time,
                        extendedProps: { ...block, colorScheme }
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
        const isToday = headerInfo.isToday
        return (
            <div className="flex flex-col items-center py-4 group/header w-full relative">
                <div className={`text-[10px] font-black tracking-[0.2em] uppercase mb-1 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                    {headerInfo.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-black tracking-tighter transition-all ${isToday ? 'text-blue-600 scale-110' : 'text-slate-900'}`}>
                    {headerInfo.date.getDate()}
                </div>
                {isToday && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />}
            </div>
        )
    }

    function renderEventContent(eventInfo: any) {
        const isCompleted = eventInfo.event.extendedProps.is_completed
        const color = eventInfo.event.extendedProps.colorScheme || { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }
        const isMirror = eventInfo.isMirror
        const isSelection = isMirror && !eventInfo.event.id

        const durationMs = (eventInfo.event.end?.getTime() || 0) - (eventInfo.event.start?.getTime() || 0)
        const isShort = durationMs <= 30 * 60 * 1000

        let displayStart = eventInfo.event.start
        let displayEnd = eventInfo.event.end

        if (isSelection && displayStart && displayEnd) {
            const ms15 = 15 * 60 * 1000
            let s = new Date(Math.round(displayStart.getTime() / ms15) * ms15)
            let e = new Date(Math.round(displayEnd.getTime() / ms15) * ms15)
            if (s.getTime() === e.getTime()) e = new Date(s.getTime() + ms15)
            displayStart = s; displayEnd = e
        }

        const startTime = displayStart?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        const endTime = displayEnd?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

        return (
            <div className={`
                group/event relative h-full w-full rounded-xl transition-all duration-300
                flex flex-col justify-start overflow-visible border-none
                ${isCompleted ? 'grayscale opacity-80' : 'shadow-sm'}
                ${isSelection ? 'bg-blue-400/20' : ''}
                ${isShort ? 'p-1.5' : 'p-3'}
            `}
                style={{
                    backgroundColor: isCompleted ? '#E2E8F0' : isMirror ? 'rgba(37, 99, 235, 0.2)' : color.bg,
                }}>

                {isMirror && (
                    <>
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-[300]">
                            <div className="bg-blue-600 text-white px-2.5 py-1 rounded-lg text-[9px] font-black shadow-lg whitespace-nowrap">
                                {startTime}
                            </div>
                        </div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-[300]">
                            <div className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[9px] font-black shadow-lg whitespace-nowrap">
                                {endTime}
                            </div>
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-1 min-h-0 w-full">
                    <div className="flex items-start justify-between gap-2">
                        <div
                            className={`
                                font-black leading-[1.2] tracking-tight break-words line-clamp-2
                                ${isShort ? 'text-[11px]' : 'text-[13px]'}
                            `}
                            style={{ color: isCompleted ? '#94A3B8' : color.text }}
                        >
                            {isSelection ? '' : eventInfo.event.title}
                        </div>

                        {!isMirror && !isSelection && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleAction(eventInfo.event.id, 'COMPLETE') }}
                                className={`
                                    absolute top-1 right-1 transition-all duration-300 flex items-center justify-center
                                    ${isCompleted
                                        ? 'text-emerald-500 scale-110 opacity-100'
                                        : 'text-slate-400 opacity-20 group-hover/event:opacity-100 hover:text-emerald-500 hover:scale-125'
                                    }
                                `}
                            >
                                <Check className={isShort ? 'w-3 h-3' : 'w-4 h-4'} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col relative bg-slate-50 text-slate-900 selection:bg-blue-500/20">
            {/* Ultra-Smooth Hover Preview */}
            <div
                ref={hoverRef}
                className="fixed pointer-events-none z-[9999] bg-white border border-blue-200 px-2.5 py-1.5 rounded-xl text-[10px] font-black text-blue-600 shadow-2xl opacity-0 will-change-transform"
                style={{ left: 0, top: 0, transition: 'opacity 0.1s ease-out' }}
            />

            <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 p-6 md:p-10 gap-8 z-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500/80">Active Session</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">
                            My Universe
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-all group shadow-sm"
                        >
                            <RefreshCw className="w-5 h-5 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        <button
                            onClick={() => openModal(new Date(), new Date(Date.now() + 3600000))}
                            className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all active:scale-95 group"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="text-lg">Add Event</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
                    <div className="flex-1 glass rounded-[40px] overflow-hidden flex flex-col relative border-white shadow-2xl">
                        {loading && (
                            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            </div>
                        )}
                        <div className="flex-1 p-4 md:p-6 overflow-auto custom-scrollbar">
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
                                slotLabelFormat={{ hour: 'numeric', meridiem: false, hour12: false }}
                                select={(info) => {
                                    const ms15 = 15 * 60 * 1000
                                    let s = new Date(Math.round(new Date(info.start).getTime() / ms15) * ms15)
                                    let e = new Date(Math.round(new Date(info.end).getTime() / ms15) * ms15)
                                    if (s.getTime() === e.getTime()) e = new Date(s.getTime() + ms15)
                                    openModal(s, e)
                                    info.view.calendar.unselect()
                                }}
                                eventDrop={async (info) => {
                                    try {
                                        await fetch('/api/reschedule', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                blockId: info.event.id,
                                                action: 'MOVE',
                                                newStart: info.event.start?.toISOString(),
                                                newEnd: info.event.end?.toISOString()
                                            })
                                        })
                                    } catch (err) { info.revert() }
                                }}
                                eventResize={async (info) => {
                                    try {
                                        await fetch('/api/reschedule', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                blockId: info.event.id,
                                                action: 'MOVE',
                                                newStart: info.event.start?.toISOString(),
                                                newEnd: info.event.end?.toISOString()
                                            })
                                        })
                                    } catch (err) { info.revert() }
                                }}
                                eventContent={renderEventContent}
                                dayHeaderContent={renderDayHeader}
                            />
                        </div>
                    </div>

                    <div className="w-full lg:w-[360px] glass rounded-[40px] overflow-hidden shadow-2xl flex flex-col">
                        <TaskInbox />
                    </div>
                </main>
            </div>

            <TaskModal />

            <style dangerouslySetInnerHTML={{
                __html: `
                .fc .fc-toolbar-title { font-size: 1.5rem !important; font-weight: 1000 !important; color: #0f172a; tracking: -0.05em; }
                .fc .fc-button-primary { 
                    background: #ffffff !important; 
                    border: 1px solid #e2e8f0 !important; 
                    color: #64748b !important; 
                    font-size: 11px !important;
                    font-weight: 900 !important; 
                    text-transform: uppercase !important;
                    padding: 8px 16px !important;
                    border-radius: 12px !important;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                }
                .fc .fc-button-primary:hover { border-color: #cbd5e1 !important; color: #0f172a !important; background: #f8fafc !important; }
                .fc .fc-button-active { background: #0f172a !important; color: white !important; border-color: #0f172a !important; }
                
                .fc-timegrid-slot-label-cushion { color: #94a3b8 !important; font-size: 11px !important; font-weight: 800 !important; }
                .fc-col-header-cell { border-bottom: 2px solid #f1f5f9 !important; }
                
                .fc-v-event { background: transparent !important; border: none !important; box-shadow: none !important; border-radius: 12px !important; }
                .fc-event-main { padding: 0 !important; border-radius: 12px !important; background: transparent !important; }
                
                .fc-highlight { 
                    background: rgba(37, 99, 235, 0.1) !important; 
                    border: none !important;
                    border-radius: 12px !important;
                }

                .fc-v-event .fc-event-resizer { height: 12px !important; bottom: -6px !important; }
                .fc-v-event .fc-event-resizer::after {
                    content: ""; position: absolute; left: 50%; bottom: 5px; width: 24px; height: 4px;
                    background: rgba(0, 0, 0, 0.1); border-radius: 2px; transform: translateX(-50%);
                }

                .fc-now-indicator-line {
                    border-color: #3b82f6 !important;
                    border-top-width: 2px !important;
                }
                .fc-now-indicator-arrow {
                    border-color: #3b82f6 !important;
                    border-width: 5px 0 5px 6px !important;
                    border-top-color: transparent !important;
                    border-bottom-color: transparent !important;
                }
                `}} />
        </div>
    )
}
