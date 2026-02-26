'use client'

import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import FullCalendar from '@fullcalendar/react'
import { Calendar, Loader2, RefreshCw, Plus, Check, Clock, ArrowUp, ArrowDown, Sparkles, X, MousePointer2, Layers, Lock, Unlock, CalendarRange } from 'lucide-react'
import { useTaskModalStore, TaskRange } from '@/store/calendar'
import { useState, useEffect, useRef, useMemo } from 'react'
import TaskModal from '@/components/calendar/TaskModal'
import TaskInbox from '@/components/calendar/TaskInbox'

export default function DashboardPage() {
    const { isOpen, openModal } = useTaskModalStore()
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSelecting, setIsSelecting] = useState(false)
    const mousePosRef = useRef({ x: 0, y: 0 })
    const hoverRef = useRef<HTMLDivElement>(null)
    const calendarRef = useRef<FullCalendar>(null)
    const [completedBadgeId, setCompletedBadgeId] = useState<string | null>(null)
    const [showScrollToNow, setShowScrollToNow] = useState(false)
    const [scrollAlignment, setScrollAlignment] = useState<'up' | 'down'>('up')

    // UI Transformation States
    const [isLocked, setIsLocked] = useState(true)
    const [selectedRanges, setSelectedRanges] = useState<TaskRange[]>([])
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

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

    // Combine Real Events + Selection Highlights
    const allEvents = useMemo(() => {
        const selectionHighlights = selectedRanges.map((range, idx) => ({
            id: `selection-${idx}`,
            start: range.start,
            end: range.end,
            display: 'block',
            backgroundColor: 'rgba(59, 130, 246, 0.4)',
            borderColor: '#3B82F6',
            textColor: '#fff',
            title: `Selection ${idx + 1}`,
            classNames: ['selection-highlight-event'],
            editable: false
        }))
        return [...events, ...selectionHighlights]
    }, [events, selectedRanges])

    const scrollToNow = () => {
        const api = calendarRef.current?.getApi()
        if (api) {
            const now = new Date()
            const scrollHour = Math.max(0, now.getHours() - 2)
            api.scrollToTime(`${scrollHour.toString().padStart(2, '0')}:00:00`)
            setShowScrollToNow(false)
        }
    }

    async function handleAction(blockId: string, action: 'COMPLETE' | 'RESCHEDULE') {
        if (action === 'COMPLETE') {
            setCompletedBadgeId(blockId)
            setTimeout(() => setCompletedBadgeId(null), 1500)
        }
        const res = await fetch('/api/reschedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blockId, action })
        })
        if (res.ok) fetchEvents()
    }

    useEffect(() => {
        fetchEvents()
    }, [])

    useEffect(() => {
        const body = document.querySelector('.fc-timegrid-body')
        if (!body || loading) return

        let rafId: number

        const handleCalendarScroll = (e: any) => {
            const scrollEl = e.target as HTMLElement
            if (!scrollEl.classList.contains('fc-scroller') || scrollEl.clientHeight < 300) return

            const nowIndicator = scrollEl.querySelector('.fc-now-indicator-line') as HTMLElement
            if (nowIndicator) {
                const scrollerRect = scrollEl.getBoundingClientRect()
                const indicatorRect = nowIndicator.getBoundingClientRect()
                const isVisible = (indicatorRect.top >= scrollerRect.top + 20 && indicatorRect.bottom <= scrollerRect.bottom - 20)
                setShowScrollToNow(!isVisible)
                if (!isVisible) {
                    setScrollAlignment(indicatorRect.top < scrollerRect.top ? 'up' : 'down')
                }
            }
        }

        const updateHover = () => {
            const { x: clientX, y: clientY } = mousePosRef.current
            if ((isOpen || isMultiSelectMode) && hoverRef.current) {
                hoverRef.current.style.opacity = '0'
                return
            }

            const target = document.elementFromPoint(clientX, clientY)
            const eventBox = target?.closest('.fc-event')
            if (eventBox && !eventBox.classList.contains('fc-event-mirror') && !eventBox.classList.contains('fc-highlight')) {
                if (hoverRef.current) hoverRef.current.style.opacity = '0'
                return
            }

            const firstSlot = document.querySelector('.fc-timegrid-slot')
            const cols = document.querySelectorAll('.fc-timegrid-col')
            if (cols.length === 0 || !hoverRef.current || !firstSlot) {
                if (hoverRef.current) hoverRef.current.style.opacity = '0'
                return
            }

            const sRect = firstSlot.getBoundingClientRect()
            const slotHeight = sRect.height
            const relativeY = clientY - sRect.top

            let activeColRect: DOMRect | null = null
            cols.forEach(col => {
                const r = col.getBoundingClientRect()
                if (clientX >= r.left && clientX <= r.right) activeColRect = r
            })

            if (activeColRect) {
                const centerX = (activeColRect as DOMRect).left + (activeColRect as DOMRect).width / 2
                const slotIndex = Math.floor(relativeY / slotHeight)
                const snappedY = sRect.top + (slotIndex * slotHeight)
                const hour = Math.floor(slotIndex / 4)
                const min = (slotIndex % 4) * 15

                if (hour >= 0 && hour < 24) {
                    hoverRef.current.innerText = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
                    hoverRef.current.style.transform = `translate3d(${centerX}px, ${snappedY}px, 0) translate(-50%, -100%)`
                    hoverRef.current.style.opacity = '1'
                } else { hoverRef.current.style.opacity = '0' }
            } else { hoverRef.current.style.opacity = '0' }
        }

        window.addEventListener('mousemove', (e) => {
            mousePosRef.current = { x: e.clientX, y: e.clientY }
            cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(updateHover)
        })
        window.addEventListener('scroll', updateHover, true)
        window.addEventListener('scroll', handleCalendarScroll, true)

        return () => {
            cancelAnimationFrame(rafId)
            window.removeEventListener('mousemove', updateHover)
        }
    }, [isOpen, loading, isMultiSelectMode])

    useEffect(() => {
        if (loading) return;
        const timer = setTimeout(() => {
            const api = calendarRef.current?.getApi()
            if (api) {
                const now = new Date()
                const scrollHour = Math.max(0, now.getHours() - 2)
                api.scrollToTime(`${scrollHour.toString().padStart(2, '0')}:00:00`)
            }
        }, 800)
        return () => clearTimeout(timer)
    }, [loading])

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
        const isSelectionHighlight = eventInfo.event.id.toString().startsWith('selection-')
        if (isSelectionHighlight) {
            return (
                <div className="h-full w-full bg-blue-500/30 border-2 border-dashed border-blue-500 rounded-xl flex items-center justify-center">
                    <Check className="w-4 h-4 text-blue-600" />
                </div>
            )
        }

        const now = new Date()
        const start = new Date(eventInfo.event.start)
        const end = new Date(eventInfo.event.end)
        const isCurrent = start <= now && end >= now
        const isCompleted = eventInfo.event.extendedProps.is_completed
        const color = eventInfo.event.extendedProps.colorScheme || { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }
        const isMirror = eventInfo.isMirror
        const isSelection = isMirror && !eventInfo.event.id

        // Month view unified styling
        const isMonthView = eventInfo.view.type === 'dayGridMonth'
        const durationMs = end.getTime() - start.getTime()
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
                ${isMonthView ? 'month-event-fixed' : ''}
                ${!isLocked ? 'anim-shake' : ''}
                ${isMultiSelectMode && !isSelectionHighlight ? 'grayscale-[0.8] opacity-40' : ''}
                ${isCurrent && !isCompleted ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : ''}
            `}
                style={{
                    backgroundColor: isCurrent && !isCompleted ? '#ECFDF5' : (isCompleted ? '#E2E8F0' : (isMirror ? 'rgba(37, 99, 235, 0.2)' : color.bg)),
                }}>

                {isCurrent && !isCompleted && !isMonthView && (
                    <div className="absolute top-0 right-0 p-1">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>
                )}

                {!isMonthView && completedBadgeId === eventInfo.event.id && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="animate-in fade-in zoom-in-50 duration-500 ease-out flex items-center justify-center">
                            <Check className="w-12 h-12 text-emerald-500/90 stroke-[1.5px] drop-shadow-[0_0_20px_rgba(16,185,129,0.3)] anim-checking" />
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1 min-h-0 w-full">
                    <div className="flex items-start justify-between gap-2">
                        <div
                            className={`
                                font-black leading-[1.2] tracking-tight break-words line-clamp-2
                                ${isMonthView ? 'text-[10px]' : (isShort ? 'text-[11px]' : 'text-[13px]')}
                            `}
                            style={{ color: isCompleted ? '#94A3B8' : color.text }}
                        >
                            {isSelection ? '' : eventInfo.event.title}
                        </div>

                        {!isMonthView && !isMirror && !isSelection && (
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

    const resetSelection = () => {
        setSelectedRanges([])
        setIsMultiSelectMode(false)
    }

    const confirmSelection = () => {
        if (selectedRanges.length > 0) {
            openModal(selectedRanges)
            resetSelection()
        }
    }

    const toggleLock = () => {
        setIsLocked(!isLocked)
    }

    return (
        <div className="min-h-screen flex flex-col relative bg-slate-50 text-slate-900 selection:bg-blue-500/20">
            <div
                ref={hoverRef}
                className="fixed pointer-events-none z-[9999] bg-white border border-blue-200 px-2.5 py-1.5 rounded-xl text-[10px] font-black text-blue-600 shadow-2xl opacity-0 will-change-transform"
                style={{ left: 0, top: 0, transition: 'opacity 0.1s ease-out' }}
            />

            <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 p-6 md:p-10 gap-8 z-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-500/80">Active Session</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter">
                            My Universe
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleLock}
                            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all shadow-sm border ${isLocked
                                    ? 'bg-white text-slate-400 border-slate-200 hover:text-blue-600'
                                    : 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse ring-4 ring-amber-500/10'
                                }`}
                        >
                            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            {isLocked ? 'Locked' : 'Unlocked'}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition-all group shadow-sm text-slate-400"
                        >
                            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        <button
                            onClick={() => openModal([{ start: new Date(), end: new Date(Date.now() + 3600000) }])}
                            className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all active:scale-95 group"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="text-lg">Add Event</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
                    <div className="flex-1 glass rounded-[40px] overflow-hidden flex flex-col relative border-white shadow-2xl h-[700px]">
                        {loading && (
                            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center">
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            </div>
                        )}

                        {/* Selection Hub UI - Prettier & Better Aligned */}
                        {isMultiSelectMode && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[45] animate-in slide-in-from-top-4 duration-500 w-[90%] max-w-xl">
                                <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/20 p-6 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col gap-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                <Sparkles className="w-6 h-6 text-white animate-pulse" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-white tracking-tight leading-none mb-1">Do you want more?</p>
                                                <p className="text-xs font-bold text-slate-400">Drag to bundle multiple time ranges!</p>
                                            </div>
                                        </div>
                                        <button onClick={resetSelection} className="p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar scroll-smooth">
                                        {selectedRanges.map((range, i) => (
                                            <div key={i} className="bg-white/5 hover:bg-white/10 text-white pl-4 pr-2 py-2 rounded-2xl text-[11px] font-black border border-white/10 shrink-0 flex items-center gap-3 transition-colors group/pill">
                                                <span className="text-blue-400 font-black">#{i + 1}</span>
                                                <span className="opacity-80">
                                                    {range.start.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                                                    {range.start.getTime() !== range.end.getTime() &&
                                                        ` ~ ${range.end.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`}
                                                </span>
                                                <button
                                                    onClick={() => setSelectedRanges(selectedRanges.filter((_, idx) => idx !== i))}
                                                    className="w-6 h-6 rounded-lg hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all opacity-40 group-hover/pill:opacity-100"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 pt-1">
                                        <button
                                            onClick={confirmSelection}
                                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-[24px] font-black text-base transition-all active:scale-[0.98] shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 group/btn"
                                        >
                                            <Layers className="w-5 h-5 group-hover/btn:translate-y-[-2px] transition-transform" />
                                            Combine {selectedRanges.length} Universes
                                        </button>
                                        <button
                                            onClick={resetSelection}
                                            className="px-8 bg-white/10 hover:bg-white/20 text-white py-4 rounded-[24px] font-black text-base transition-all active:scale-[0.98]"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showScrollToNow && (
                            <button
                                onClick={scrollToNow}
                                className="absolute bottom-6 right-6 z-[40] bg-blue-600 text-white w-12 h-12 rounded-full font-black shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 animate-in fade-in zoom-in slide-in-from-bottom-4 flex items-center justify-center group"
                                title="Return to Now"
                            >
                                {scrollAlignment === 'up' ? (
                                    <ArrowUp className="w-6 h-6 animate-bounce" />
                                ) : (
                                    <ArrowDown className="w-6 h-6 animate-bounce" />
                                )}
                            </button>
                        )}

                        <div className="flex-1 p-4 md:p-6 overflow-auto custom-scrollbar fc-viewport-mask h-full">
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="timeGridWeek"
                                firstDay={1}
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                                }}
                                height="100%"
                                stickyHeaderDates={true}
                                events={allEvents}
                                editable={!isLocked}
                                eventResizableFromStart={!isLocked}
                                selectable={true}
                                selectMirror={true}
                                dayMaxEvents={3}
                                nowIndicator={true}
                                allDaySlot={true}
                                allDayMaintainDuration={true}
                                slotMinTime="00:00:00"
                                slotMaxTime="24:00:00"
                                slotDuration="00:15:00"
                                slotLabelInterval="01:00:00"
                                snapDuration="00:05:00"
                                selectMinDistance={1}
                                eventMinHeight={20}
                                eventOverlap={false}
                                slotLabelFormat={{ hour: 'numeric', meridiem: false, hour12: false }}
                                select={(info) => {
                                    const ms15 = 15 * 60 * 1000
                                    let s = new Date(Math.round(new Date(info.start).getTime() / ms15) * ms15)
                                    let e = new Date(Math.round(new Date(info.end).getTime() / ms15) * ms15)
                                    if (s.getTime() === e.getTime()) {
                                        if (info.view.type === 'dayGridMonth') {
                                            e = new Date(s.getTime() + 86400000 - 1000)
                                        } else {
                                            e = new Date(s.getTime() + ms15)
                                        }
                                    }

                                    const newRange = { start: s, end: e }
                                    setSelectedRanges(prev => [...prev, newRange])
                                    setIsMultiSelectMode(true)
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
                
                /* Month view unified styling */
                .month-event-fixed {
                    height: 24px !important;
                    max-height: 24px !important;
                    padding-top: 2px !important;
                    padding-bottom: 2px !important;
                    margin-bottom: 2px !important;
                }

                @keyframes shake {
                  0% { transform: rotate(0.4deg); }
                  25% { transform: rotate(-0.4deg); }
                  50% { transform: rotate(0.4deg); }
                  75% { transform: rotate(-0.4deg); }
                  100% { transform: rotate(0.4deg); }
                }
                .anim-shake {
                  animation: shake 0.25s infinite ease-in-out;
                  cursor: grab !important;
                }

                .fc-timegrid-allday {
                    background: #f8fafc !important;
                    border-bottom: 2px solid #f1f5f9 !important;
                }
                .fc-timegrid-allday-frame {
                    min-height: 60px !important;
                    max-height: 100px !important;
                    overflow-y: auto !important;
                }

                .fc-highlight { 
                    background: rgba(37, 99, 235, 0.1) !important; 
                    border: none !important;
                    border-radius: 12px !important;
                }

                .fc-now-indicator-line {
                    border-color: #10b981 !important;
                    border-top-width: 3px !important;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
                    z-index: 100 !important;
                }
                .fc-viewport-mask {
                    mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
                    -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
                }

                .fc-scroller { scrollbar-width: none !important; scroll-behavior: smooth !important; overscroll-behavior: contain; }
                .fc-scroller::-webkit-scrollbar { display: none !important; }

                .no-scrollbar::-webkit-scrollbar { display: none !important; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @keyframes check-pop {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                .anim-checking {
                    animation: check-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                `}} />
        </div>
    )
}
