'use client'

import { format, subDays, addDays, isSameDay, differenceInDays } from 'date-fns'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Lock, Unlock, RefreshCw, Plus, Sparkles, X, Layers, ArrowUp, ArrowDown, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import CalendarHeader from '@/components/dashboard/CalendarHeader'
import WeekCalendar from '@/components/dashboard/WeekCalendar'
import DayCalendar from '@/components/dashboard/DayCalendar'
import MonthCalendar from '@/components/dashboard/MonthCalendar'
import TaskInbox from '@/components/dashboard/TaskInbox'
import EventModal from '@/components/dashboard/EventModal'
import { UniverseEvent, InboxTask, CalendarView } from '@/types/timejudge'
import { Button } from '@/components/ui/button'

interface SelectedRange {
    type: 'single' | 'range';
    startDate: string;
    endDate: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
}

export default function DashboardPage() {
    const [events, setEvents] = useState<UniverseEvent[]>([])
    const [inboxTasks, setInboxTasks] = useState<InboxTask[]>([])
    const [calendarView, setCalendarView] = useState<CalendarView>('week')
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [loading, setLoading] = useState(true)

    const [modalOpen, setModalOpen] = useState(false)
    const [editEvent, setEditEvent] = useState<UniverseEvent | undefined>()
    const [slotDate, setSlotDate] = useState<string | undefined>()
    const [slotHour, setSlotHour] = useState<number | undefined>()
    const [slotMinute, setSlotMinute] = useState<number | undefined>()

    const [isLocked, setIsLocked] = useState(true)
    const [selectedRanges, setSelectedRanges] = useState<SelectedRange[]>([])
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
    const [showScrollToNow, setShowScrollToNow] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            const grid = document.querySelector('.custom-scrollbar');
            if (grid) {
                const handleScroll = () => {
                    setShowScrollToNow(grid.scrollTop > 200);
                };
                grid.addEventListener('scroll', handleScroll);
                return () => grid.removeEventListener('scroll', handleScroll);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [eventsRes, inboxRes] = await Promise.all([
                fetch('/api/events'),
                fetch('/api/inbox')
            ])

            if (!eventsRes.ok || !inboxRes.ok) return;

            const eventsData = await eventsRes.json()
            const inboxData = await inboxRes.json()

            if (Array.isArray(eventsData)) {
                const taskGroup: Record<string, any> = {}
                eventsData.forEach((e: any) => {
                    const taskId = e.task_id || e.task?.id || e.id
                    if (!taskGroup[taskId]) {
                        taskGroup[taskId] = {
                            id: taskId,
                            title: e.task?.title || 'No Title',
                            description: e.task?.description,
                            priority: (e.task?.priority?.toLowerCase() || 'medium') as any,
                            color: e.color || 'from-primary to-cosmic-violet',
                            memo: e.task?.memo,
                            completed: e.task?.status === 'DONE' || e.is_completed,
                            isAllDay: e.is_all_day || false,
                            timeRanges: []
                        }
                    }
                    const start = new Date(e.start_time)
                    const end = new Date(e.end_time)
                    taskGroup[taskId].timeRanges.push({
                        id: `tr-${e.id}`,
                        date: e.start_time.split('T')[0],
                        startHour: start.getHours(),
                        startMinute: start.getMinutes(),
                        endHour: end.getHours(),
                        endMinute: end.getMinutes(),
                    })
                })
                setEvents(Object.values(taskGroup))
            }

            if (Array.isArray(inboxData)) {
                setInboxTasks(inboxData.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    estimatedMinutes: t.estimated_time_minutes || 30,
                    priority: (t.priority?.toLowerCase() || 'medium') as any,
                    analyzing: false,
                    scheduled: false
                })))
            }
        } catch (err) {
            console.error('Failed to fetch data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddEvent = async (event: UniverseEvent) => {
        setLoading(true)
        try {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: event.title,
                    description: event.description,
                    priority: event.priority.toUpperCase(),
                    timeRanges: event.timeRanges,
                    memo: event.memo,
                    dimensions: event.dimensionFields,
                    isAllDay: event.isAllDay,
                    isRoutine: event.isRoutine
                })
            })
            await fetchData()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteEvent = async (event: UniverseEvent) => {
        try {
            await fetch(`/api/tasks/${event.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: event.completed ? 'IN_PROGRESS' : 'DONE' })
            })
            await fetchData()
        } catch (err) {
            console.error('Failed to update event status:', err)
        }
    }

    const handleAutoPilot = async () => {
        setLoading(true)
        try {
            await fetch('/api/batch-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskIds: inboxTasks.map(t => t.id) })
            })
            await fetchData()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleEventClick = (event: UniverseEvent) => {
        setEditEvent(event)
        setModalOpen(true)
    }

    const handleTaskClick = (task: InboxTask) => {
        const todayStr = new Date().toISOString().split('T')[0]
        const event: UniverseEvent = {
            id: `task-${task.id}`,
            title: task.title,
            priority: task.priority,
            color: 'from-primary to-cosmic-violet',
            timeRanges: [{ id: `tr-${task.id}`, date: todayStr, startHour: 10, startMinute: 0, endHour: 11, endMinute: 0 }],
            isFromInbox: true,
        }
        setEditEvent(event)
        setModalOpen(true)
    }

    const handleDrop = async (date: string, hour: number, minute: number, data: any) => {
        if (data.type === 'inbox-task') {
            const task = data as InboxTask;
            const newRange = {
                date,
                startHour: hour,
                startMinute: minute,
                endHour: hour + (task.estimatedMinutes ? Math.floor(task.estimatedMinutes / 60) : 1),
                endMinute: (minute + (task.estimatedMinutes ? task.estimatedMinutes % 60 : 0)) % 60
            };
            if (minute + (task.estimatedMinutes ? task.estimatedMinutes % 60 : 0) >= 60) {
                newRange.endHour += 1;
            }
            setEditEvent({
                id: `dropped-${task.id}`,
                title: task.title,
                priority: task.priority,
                color: 'from-primary to-cosmic-violet',
                timeRanges: [{ id: `tr-dropped-${task.id}`, ...newRange }],
                isFromInbox: true,
            })
            setModalOpen(true)
        } else if (data.type === 'reschedule') {
            const { eventId, rangeId } = data;
            const event = events.find(e => e.id === eventId);
            if (!event) return;
            const tr = event.timeRanges.find(r => r.id === rangeId);
            if (!tr) return;
            const durationH = tr.endHour - tr.startHour;
            const durationM = tr.endMinute - tr.startMinute;
            try {
                await fetch('/api/reschedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId, rangeId, action: 'move', newDate: date,
                        newStartHour: hour, newStartMinute: minute,
                        newEndHour: hour + durationH, newEndMinute: minute + durationM
                    })
                });
                fetchData();
            } catch (err) {
                console.error('Reschedule failed:', err);
            }
        }
    }

    const scrollToNow = () => {
        const grid = document.querySelector('.custom-scrollbar');
        if (grid) {
            const now = new Date();
            const currentHour = now.getHours();
            const hourHeight = calendarView === 'day' ? 100 : 80;
            const top = Math.max(0, (currentHour - 6) * hourHeight);
            grid.scrollTo({ top, behavior: 'smooth' });
        }
    }

    const handleConfirmSelection = () => {
        setIsMultiSelectMode(false)
        const first = selectedRanges[0]
        setSlotDate(first.startDate)
        setSlotHour(first.startHour)
        setSlotMinute(first.startMinute)

        // Convert selectedRanges to timeRanges if necessary
        // For now just open the modal with the first one
        setModalOpen(true)
    }

    const resetSelection = () => {
        setSelectedRanges([])
        setIsMultiSelectMode(false)
    }

    const TimeAdjuster = ({ hour, minute, onChange }: { hour: number, minute: number, onChange: (h: number, m: number) => void }) => {
        return (
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/5">
                <div className="flex flex-col items-center">
                    <button onClick={() => onChange((hour + 1) % 24, minute)} className="text-white/40 hover:text-primary"><ChevronUp className="w-3 h-3" /></button>
                    <span className="text-[10px] font-black w-4 text-center">{String(hour).padStart(2, '0')}</span>
                    <button onClick={() => onChange((hour + 23) % 24, minute)} className="text-white/40 hover:text-primary"><ChevronDown className="w-3 h-3" /></button>
                </div>
                <span className="text-white/20">:</span>
                <div className="flex flex-col items-center">
                    <button onClick={() => onChange(hour, (minute + 15) % 60)} className="text-white/40 hover:text-primary"><ChevronUp className="w-3 h-3" /></button>
                    <span className="text-[10px] font-black w-4 text-center">{String(minute).padStart(2, '0')}</span>
                    <button onClick={() => onChange(hour, (minute + 45) % 60)} className="text-white/40 hover:text-primary"><ChevronDown className="w-3 h-3" /></button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col cosmic-gradient overflow-hidden relative">
            <CalendarHeader
                view={calendarView}
                selectedDate={selectedDate}
                onViewChange={setCalendarView}
                onDateChange={setSelectedDate}
                onCreateEvent={() => {
                    setEditEvent(undefined)
                    setModalOpen(true)
                }}
                isLocked={isLocked}
                onToggleLock={() => setIsLocked(!isLocked)}
                onRefresh={fetchData}
            />

            {/* Selection Hub UI */}
            <AnimatePresence>
                {isMultiSelectMode && selectedRanges.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-[600px]"
                    >
                        <div className="glass-strong border border-white/20 p-6 rounded-[32px] shadow-2xl flex flex-col gap-4 bg-slate-900/60 backdrop-blur-3xl overflow-hidden relative">
                            {/* Animated Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/10 animate-pulse pointer-events-none" />

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/30">
                                        <Layers className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-tighter">Temporal Bundle Hub</h3>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{selectedRanges.length} Vectors Selected</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-full">
                                        <RefreshCw className="w-3 h-3 text-primary animate-spin-slow" />
                                        <span className="text-[9px] font-black text-primary uppercase">Routine Mapping</span>
                                    </div>
                                    <button onClick={resetSelection} className="p-2 text-muted-foreground hover:text-white transition-colors bg-white/5 rounded-full border border-white/5">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto luxury-scroller px-1 relative z-10">
                                {selectedRanges.map((range, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all border-l-4 border-l-primary/60">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Universe Range #{i + 1}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-white">{range.startDate}</span>
                                                {range.type === 'range' && (
                                                    <>
                                                        <span className="text-white/20 text-[10px]">~</span>
                                                        <span className="text-xs font-black text-white">{range.endDate}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <TimeAdjuster
                                                    hour={range.startHour}
                                                    minute={range.startMinute}
                                                    onChange={(h, m) => {
                                                        const next = [...selectedRanges];
                                                        next[i] = { ...next[i], startHour: h, startMinute: m };
                                                        setSelectedRanges(next);
                                                    }}
                                                />
                                                <span className="text-white/20">/</span>
                                                <TimeAdjuster
                                                    hour={range.endHour}
                                                    minute={range.endMinute}
                                                    onChange={(h, m) => {
                                                        const next = [...selectedRanges];
                                                        next[i] = { ...next[i], endHour: h, endMinute: m };
                                                        setSelectedRanges(next);
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => setSelectedRanges(selectedRanges.filter((_, idx) => idx !== i))}
                                                className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 pt-2 relative z-10">
                                <button
                                    onClick={handleConfirmSelection}
                                    className="flex-1 bg-primary hover:bg-primary/80 hover:scale-[1.02] active:scale-95 text-white py-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 border border-white/10"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    SYNC BUNDLE TO UNIVERSE
                                </button>
                                <button
                                    onClick={resetSelection}
                                    className="px-8 bg-white/5 hover:bg-white/10 text-white/60 py-4 rounded-2xl font-black text-xs transition-all border border-white/5"
                                >
                                    ABORT
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scroll to Now Button */}
            <AnimatePresence>
                {showScrollToNow && (
                    <motion.button
                        onClick={scrollToNow}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute bottom-8 right-8 z-[120] w-14 h-14 rounded-full bg-primary text-white shadow-[0_0_30px_rgba(var(--primary),0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
                    >
                        <ArrowUp className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>

            <div className="flex-1 flex overflow-hidden p-6 gap-6">
                <div className="w-80 hidden lg:block">
                    <TaskInbox
                        tasks={inboxTasks}
                        onAutoPilot={handleAutoPilot}
                        onTaskClick={handleTaskClick}
                    />
                </div>

                <div className="flex-1 glass-strong rounded-[40px] border border-white/10 overflow-hidden flex flex-col relative bg-black/20">
                    <AnimatePresence mode="wait">
                        <motion.main
                            key={calendarView}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.02 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 flex flex-col overflow-hidden"
                        >
                            {loading && events.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                </div>
                            ) : (
                                <>
                                    {calendarView === 'week' && (
                                        <WeekCalendar
                                            selectedDate={selectedDate}
                                            events={events}
                                            isLocked={isLocked}
                                            onEventClick={handleEventClick}
                                            onSlotClick={(date: string, h: number, m: number | undefined, endH: number | undefined, endM: number | undefined) => {
                                                const newRange: SelectedRange = {
                                                    type: 'single',
                                                    startDate: date,
                                                    endDate: date,
                                                    startHour: h,
                                                    startMinute: m || 0,
                                                    endHour: endH || h + 1,
                                                    endMinute: endM || 0
                                                };
                                                setSelectedRanges(prev => [...prev, newRange]);
                                                setIsMultiSelectMode(true);
                                            }}
                                            onCompleteEvent={handleCompleteEvent}
                                            onDrop={handleDrop}
                                        />
                                    )}
                                    {calendarView === 'day' && (
                                        <DayCalendar
                                            selectedDate={selectedDate}
                                            events={events}
                                            isLocked={isLocked}
                                            onEventClick={handleEventClick}
                                            onSlotClick={(date: string, h: number, m: number | undefined, endH: number | undefined, endM: number | undefined) => {
                                                const newRange: SelectedRange = {
                                                    type: 'single',
                                                    startDate: date,
                                                    endDate: date,
                                                    startHour: h,
                                                    startMinute: m || 0,
                                                    endHour: endH || h + 1,
                                                    endMinute: endM || 0
                                                };
                                                setSelectedRanges(prev => [...prev, newRange]);
                                                setIsMultiSelectMode(true);
                                            }}
                                            onCompleteEvent={handleCompleteEvent}
                                            onDrop={handleDrop}
                                        />
                                    )}
                                    {calendarView === 'month' && (
                                        <MonthCalendar
                                            selectedDate={selectedDate}
                                            events={events}
                                            onEventClick={handleEventClick}
                                            onDayClick={(date) => {
                                                setSelectedDate(date)
                                                setCalendarView('day')
                                            }}
                                            onRangeSelect={(start: string, end: string) => {
                                                const newRange: SelectedRange = {
                                                    type: 'range',
                                                    startDate: start,
                                                    endDate: end,
                                                    startHour: 9,
                                                    startMinute: 0,
                                                    endHour: 18,
                                                    endMinute: 0
                                                };
                                                setSelectedRanges(prev => [...prev, newRange]);
                                                setIsMultiSelectMode(true);
                                            }}
                                            onCompleteEvent={handleCompleteEvent}
                                        />
                                    )}
                                </>
                            )}
                        </motion.main>
                    </AnimatePresence>
                </div>
            </div>

            <EventModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false)
                    resetSelection()
                }}
                onSave={handleAddEvent}
                initialDate={slotDate}
                initialHour={slotHour}
                initialMinute={slotMinute}
                editEvent={editEvent}
            />
        </div>
    )
}
