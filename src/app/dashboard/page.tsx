'use client'

import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import FullCalendar from '@fullcalendar/react'
import { Calendar, CheckCircle2, Loader2, ArrowRight, Plus, Clock } from 'lucide-react'
import { useTaskModalStore } from '@/store/calendar'
import { useState, useEffect } from 'react'
import TaskModal from '@/components/calendar/TaskModal'
import TaskInbox from '@/components/calendar/TaskInbox'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
    const { openModal } = useTaskModalStore()
    const [events, setEvents] = useState<any[]>([])
    const [dayMetadata, setDayMetadata] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events')
            const data = await res.json()
            if (Array.isArray(data)) {
                const formatted = data.map(block => {
                    const title = block.task?.title || '할 일'
                    const colors = [
                        { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' }, // Blue
                        { bg: '#F5F3FF', text: '#5B21B6', border: '#8B5CF6' }, // Indigo
                        { bg: '#ECFDF5', text: '#065F46', border: '#10B981' }, // Emerald
                        { bg: '#FFF7ED', text: '#9A3412', border: '#F97316' }, // Orange
                        { bg: '#FFF1F2', text: '#9F1239', border: '#FB7185' }, // Rose
                        { bg: '#FDF2F8', text: '#9D174D', border: '#F472B6' }, // Pink
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

    // Handle Drag / Select
    const handleSelect = (info: any) => {
        openModal(info.start, info.end)
        info.view.calendar.unselect()
    }

    return (
        <div className="h-full flex flex-col relative p-4 md:p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">My Schedule</h1>
                    <p className="text-gray-500 font-medium">실시간 AI 코칭으로 완성하는 오늘의 몰입</p>
                </div>
                {/* New Header Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-white border border-gray-200 text-gray-600 px-4 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                        새로고침
                    </button>
                    <button
                        onClick={() => openModal(new Date(), new Date(Date.now() + 3600000))}
                        className="bg-blue-600 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-2xl shadow-blue-600/20 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        새 일정 만들기
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-gray-100 flex overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                )}

                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 p-4 md:p-8 overflow-auto">
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
                            eventResizableFromStart={true} // Allow resizing from both top and bottom
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            nowIndicator={true}
                            allDaySlot={false}
                            slotMinTime="07:00:00"
                            slotMaxTime="25:00:00"
                            slotDuration="00:15:00"
                            snapDuration="00:01:00" // 1-min ultra precision
                            selectMinDistance={10}  // Prevent accidental quick clicks
                            eventMinHeight={20}
                            eventOverlap={false}
                            slotLabelFormat={{
                                hour: 'numeric',
                                minute: '2-digit',
                                omitZeroMinute: true,
                                meridiem: 'short'
                            }}
                            eventDragMinDistance={5}
                            dragRevertDuration={200}
                            select={(info) => {
                                // Start selection snapping: Snap to 30 mins for easier starting
                                const start = new Date(info.start)
                                const msIn30Min = 30 * 60 * 1000
                                const snappedStart = new Date(Math.round(start.getTime() / msIn30Min) * msIn30Min)

                                openModal(snappedStart, info.end);
                                info.view.calendar.unselect();
                            }}
                            eventDrop={async (info) => {
                                // Handle moving existing events to different times/days
                                const { event } = info;
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
                                    });
                                    if (!res.ok) {
                                        info.revert();
                                        alert('일정 이동 실패');
                                    }
                                } catch (err) {
                                    info.revert();
                                    alert('오류가 발생했습니다.');
                                }
                            }}
                            eventResize={async (info) => {
                                // Handle resizing existing events
                                const { event } = info;
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
                                    });
                                    if (!res.ok) {
                                        info.revert();
                                        alert('길이 조절 실패');
                                    }
                                } catch (err) {
                                    info.revert();
                                    alert('오류가 발생했습니다.');
                                }
                            }}
                            droppable={true}
                            drop={async (info) => {
                                const taskData = info.draggedEl.getAttribute('data-event');
                                if (!taskData) return;
                                const task = JSON.parse(taskData);
                                const dropDate = info.date;
                                setLoading(true);
                                try {
                                    const res = await fetch('/api/schedule-inbox', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            taskId: task.id,
                                            deadline: new Date(dropDate.getTime() + 86400000 - 1000).toISOString(),
                                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                        })
                                    });
                                    if (res.ok) window.location.reload();
                                    else {
                                        const err = await res.json();
                                        alert(err.error || '스케줄링 실패');
                                    }
                                } catch (err) {
                                    console.error(err);
                                    alert('스케줄링 실패');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            eventContent={renderEventContent}
                            dayHeaderContent={renderDayHeader}
                            dayCellDidMount={(info) => {
                                const dateStr = info.date.toISOString().split('T')[0]
                                if (dayMetadata[dateStr]?.color) {
                                    info.el.style.backgroundColor = dayMetadata[dateStr].color
                                }
                            }}
                            // Real-time feedback for drag/resize will be handled in CSS & renderEventContent
                            eventMouseEnter={() => { }} // Can add hover effects
                        />
                    </div>
                </div>

                {/* Task Inbox Sidebar */}
                <TaskInbox />
            </div>

            <TaskModal />

            <style dangerouslySetInnerHTML={{
                __html: `
                .fc { --fc-border-color: #f1f5f9; --fc-today-bg-color: #f8fafc; font-family: inherit; }
                .fc .fc-toolbar-title { font-size: 1.8rem; font-weight: 900; color: #010409; letter-spacing: -0.05em; }
                .fc .fc-button-primary { background: white; border: 1px solid #e2e8f0; color: #475569; font-weight: 800; border-radius: 16px; text-transform: none; padding: 10px 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .fc .fc-button-primary:hover { background: #f8fafc; color: #0f172a; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .fc .fc-button-active { background: #010409 !important; color: white !important; border-color: #010409 !important; }
                
                /* Weekend Colors */
                .fc-day-sun .fc-col-header-cell-cushion { color: #ef4444 !important; }
                .fc-day-sat .fc-col-header-cell-cushion { color: #3b82f6 !important; }
                .fc-day-sun { background-color: rgba(239, 68, 68, 0.02); }
                .fc-day-sat { background-color: rgba(59, 130, 246, 0.02); }

                .fc-v-event { background: transparent !important; border: none !important; box-shadow: none !important; overflow: visible !important; }
                .fc-v-event.fc-event-mirror { z-index: 100 !important; transition: none !important; overflow: visible !important; }
                .fc-timegrid-event-harness { overflow: visible !important; }
                
                .fc-timegrid-slot { height: 70px !important; border-bottom: 1px solid #f8fafc !important; }
                .fc-timegrid-slot-label { font-size: 11px; font-weight: 700; color: #94a3b8; padding-right: 16px !important; }
                .fc-col-header-cell { padding: 8px 0 !important; background: #ffffff; border-bottom: 2px solid #f1f5f9 !important; overflow: visible !important; }
                .fc-col-header-cell-cushion { font-size: 14px; font-weight: 800; color: #1e293b; text-decoration: none !important; }
                
                .fc-timegrid-header { overflow: visible !important; z-index: 10 !important; }
                .fc-col-header { overflow: visible !important; }
                .fc-timegrid-header-adapter { overflow: visible !important; }
                .fc-timeGridWeek-view { overflow: visible !important; }
                .fc-view-harness { overflow: visible !important; }
                .fc-scroller-harness { overflow: visible !important; }
                
                .fc-timegrid-now-indicator-line { border-color: #3b82f6; border-width: 2px; }
                .fc-timegrid-now-indicator-arrow { border-color: #3b82f6; border-width: 6px; }

                /* Floating Bubble Animation - Simplified Centering */
                .time-floating-bubble {
                    animation: bubbleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    white-space: nowrap;
                }
                @keyframes bubbleIn {
                    from { transform: scale(0.5) translateY(10px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }

                .fc-scroller::-webkit-scrollbar { width: 8px; }
                .fc-scroller::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid white; }
                `}} />
        </div>
    )

    function renderDayHeader(headerInfo: any) {
        const dateStr = headerInfo.date.toISOString().split('T')[0]
        const memos = dayMetadata[dateStr]?.notes || []

        const handleAddMemo = (e: React.MouseEvent) => {
            e.stopPropagation()
            const note = prompt('이 날의 메모를 입력하세요 (예: 누구의 생일, 승진일):')
            if (note) {
                setDayMetadata(prev => ({
                    ...prev,
                    [dateStr]: {
                        ...prev[dateStr],
                        notes: [...(prev[dateStr]?.notes || []), note]
                    }
                }))
            }
        }

        const handleDeleteMemo = (e: React.MouseEvent, index: number) => {
            e.stopPropagation()
            setDayMetadata(prev => {
                const newNotes = [...(prev[dateStr]?.notes || [])]
                newNotes.splice(index, 1)
                return {
                    ...prev,
                    [dateStr]: {
                        ...prev[dateStr],
                        notes: newNotes
                    }
                }
            })
        }

        return (
            <div className="flex flex-col items-center py-2 group/header cursor-default w-full relative">
                <div className="flex items-center gap-1.5 px-2">
                    <div className="text-[14px] font-black">{headerInfo.text}</div>
                    <button
                        onClick={handleAddMemo}
                        className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[12px] font-bold opacity-0 group-hover/header:opacity-100 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                    >
                        +
                    </button>
                </div>

                <div className="mt-1 flex flex-col items-center gap-0.5 w-full px-2 text-center">
                    {memos.slice(0, 2).map((memo: string, idx: number) => (
                        <div key={idx} className="group/memo text-[9px] bg-blue-50/50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-100/50 flex items-center justify-between gap-1 w-full max-w-[120px]">
                            <div className="truncate flex items-center gap-1 min-w-0">
                                <span className="w-1 h-1 bg-blue-400 rounded-full shrink-0" />
                                <span className="truncate">{memo}</span>
                            </div>
                            <button
                                onClick={(e) => handleDeleteMemo(e, idx)}
                                className="opacity-0 group-hover/memo:opacity-100 hover:text-red-500 transition-opacity font-bold shrink-0"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {memos.length > 2 && (
                        <div className="text-[8px] text-blue-400 font-bold text-center mt-0.5 bg-blue-50/30 py-0.5 rounded">
                            외 {memos.length - 2}개 더보기...
                        </div>
                    )}
                    {memos.length === 0 && <div className="h-4" />}
                </div>

                {/* Expanded Hover View Overlay - Positioned ABOVE to avoid grid clipping */}
                {memos.length > 2 && (
                    <div className="absolute bottom-[105%] left-1/2 -translate-x-1/2 w-[180px] bg-white rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border border-slate-100 p-3 z-[10000] opacity-0 pointer-events-none group-hover/header:opacity-100 group-hover/header:pointer-events-auto transition-all duration-200 -translate-y-2 group-hover/header:translate-y-0 flex flex-col gap-2">
                        <div className="absolute -bottom-6 left-0 w-full h-8" /> {/* Hover bridge below */}

                        <div className="text-[11px] font-black text-slate-800 mb-1 px-1 border-b border-slate-50 pb-2 flex justify-between items-center">
                            <span>전체 메모 ({memos.length})</span>
                        </div>
                        <div className="max-h-[200px] overflow-auto flex flex-col gap-1.5 pr-1 custom-scrollbar">
                            {memos.map((memo: string, idx: number) => (
                                <div key={idx} className="group/memo-full text-[10px] bg-slate-50 text-slate-700 px-2.5 py-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 transition-all hover:bg-blue-50 hover:border-blue-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                                        <span className="truncate select-none font-semibold text-slate-700">{memo}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteMemo(e, idx)}
                                        className="text-slate-300 hover:text-red-500 transition-colors font-bold px-1 text-[14px]"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    async function handleAction(blockId: string, action: 'COMPLETE' | 'RESCHEDULE') {
        const res = await fetch('/api/reschedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blockId, action })
        })
        if (res.ok) window.location.reload()
    }

    function renderEventContent(eventInfo: any) {
        const isCompleted = eventInfo.event.extendedProps.is_completed
        const color = eventInfo.event.extendedProps.colorScheme || { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' }
        const isMirror = eventInfo.isMirror

        // Format time with 'Magnifying Glass' logic:
        // If it's a mirror (active drag), we show a more prominent badge
        const startTime = eventInfo.event.start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        const endTime = eventInfo.event.end?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

        // Check if time is a "round" hour for visual feedback
        const isRoundTime = eventInfo.event.start?.getMinutes() === 0

        return (
            <div className={`
                group/event relative h-full w-full p-3 rounded-2xl border-l-[4px] transition-all duration-300
                flex flex-col justify-start overflow-visible
                ${isMirror ? 'opacity-90 scale-[1.02] z-[200] pointer-events-none ring-2 ring-blue-500 shadow-2xl' : 'shadow-sm hover:shadow-lg'}
                ${isCompleted ? 'border-slate-300 bg-slate-100/50 text-slate-400' : ''}
            `}
                style={{
                    backgroundColor: isCompleted ? '#F1F5F9' : color.bg,
                    borderColor: isCompleted ? '#CBD5E1' : color.border,
                    color: isCompleted ? '#94A3B8' : color.text
                }}>
                {/* Floating Time Bubbles - Perfectly Centered Above/Below the visual box */}
                {isMirror && (
                    <>
                        {/* Top Bubble */}
                        <div className="time-floating-bubble absolute -top-8 left-0 right-0 flex justify-center z-[9999]">
                            <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-black shadow-2xl border border-white/20 whitespace-nowrap flex items-center gap-1">
                                <span>{startTime}</span>
                                <span className="text-white/30 px-1">→</span>
                                <span>{endTime}</span>
                            </div>
                        </div>
                        {/* Bottom Bubble */}
                        <div className="time-floating-bubble absolute -bottom-8 left-0 right-0 flex justify-center z-[9999]">
                            <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-black shadow-2xl border border-white/20 whitespace-nowrap flex items-center gap-1">
                                <span>{startTime}</span>
                                <span className="text-white/30 px-1">→</span>
                                <span>{endTime}</span>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-1 z-10 pointer-events-none">
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md truncate ${isCompleted ? 'bg-slate-200/50' : ''}`}
                            style={{ backgroundColor: !isCompleted ? `${color.border}22` : undefined }}>
                            {eventInfo.event.extendedProps.task?.category || 'PRO'}
                        </span>
                        {isCompleted && <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />}
                    </div>
                    <div className={`text-[13px] font-extrabold leading-tight tracking-tight line-clamp-2 ${isCompleted ? 'line-through' : 'text-slate-900'}`}>
                        {eventInfo.event.title}
                    </div>
                </div>

                {!isCompleted && !isMirror && (
                    <div className="flex items-center gap-1.5 mt-auto pt-2 translate-y-2 opacity-0 group-hover/event:opacity-100 group-hover/event:translate-y-0 transition-all duration-300">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAction(eventInfo.event.id, 'COMPLETE') }}
                            className="flex-1 bg-white/90 backdrop-blur-md border border-gray-200 py-1.5 rounded-xl hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm active:scale-95 transition-all flex items-center justify-center font-bold"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAction(eventInfo.event.id, 'RESCHEDULE') }}
                            className="bg-white/90 backdrop-blur-md border border-gray-100 p-1.5 rounded-xl hover:bg-orange-500 hover:text-white hover:border-orange-500 shadow-sm active:scale-95 transition-all text-slate-400"
                        >
                            <Clock className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        )
    }
}
