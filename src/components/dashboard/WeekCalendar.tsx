'use client'

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { UniverseEvent } from '@/types/timejudge';
import { MessageSquare, Check, Plus } from 'lucide-react';

interface WeekCalendarProps {
  selectedDate: Date;
  events: UniverseEvent[];
  onEventClick: (event: UniverseEvent) => void;
  onSlotClick: (date: string, hour: number, minute?: number, endHour?: number, endMinute?: number) => void;
  onCompleteEvent: (event: UniverseEvent) => void;
  isLocked?: boolean;
  onDrop?: (date: string, hour: number, minute: number, data: any) => void;
}

const HOUR_HEIGHT = 80;
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export default function WeekCalendar({ selectedDate, events, onEventClick, onSlotClick, onCompleteEvent, isLocked = true, onDrop }: WeekCalendarProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const gridRef = useRef<HTMLDivElement>(null);

  const [now, setNow] = useState(new Date());
  const [hoveredTime, setHoveredTime] = useState<{ x: number; y: number; time: string; date: string } | null>(null);
  const [hoveredMemo, setHoveredMemo] = useState<{ event: UniverseEvent; x: number; y: number } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ date: string; startY: number; currentY: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const snapTo15 = (y: number) => {
    const slotHeight = HOUR_HEIGHT / 4;
    return Math.round(y / slotHeight) * slotHeight;
  };

  const getTimeFromY = (y: number) => {
    const totalMinutes = (y / HOUR_HEIGHT) * 60;
    const hour = Math.floor(totalMinutes / 60) + 6;
    const minute = Math.floor(totalMinutes % 60);
    return { hour, minute };
  };

  const handleMouseDown = (e: React.MouseEvent, dateStr: string) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const snappedY = snapTo15(y);

    setSelection({
      date: dateStr,
      startY: snappedY,
      currentY: snappedY + (HOUR_HEIGHT / 2),
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + gridRef.current.scrollTop;

    const snappedY = snapTo15(y);
    const { hour, minute } = getTimeFromY(snappedY);

    if (hour >= 6 && hour <= 21) {
      const colWidth = (rect.width - 64) / 7;
      const dayIdx = Math.floor((x - 64) / colWidth);
      const dateStr = dayIdx >= 0 && dayIdx < 7 ? format(days[dayIdx], 'yyyy-MM-dd') : '';

      setHoveredTime({
        x: e.clientX,
        y: e.clientY,
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        date: dateStr
      });
    } else {
      setHoveredTime(null);
    }

    if (selection) {
      setSelection(prev => prev ? { ...prev, currentY: snappedY } : null);
    }
  }, [selection, days]);

  const handleMouseUp = () => {
    if (selection) {
      const { hour: startH, minute: startM } = getTimeFromY(Math.min(selection.startY, selection.currentY));
      let { hour: endH, minute: endM } = getTimeFromY(Math.max(selection.startY, selection.currentY));

      if (startH === endH && startM === endM) {
        endM += 30;
        if (endM >= 60) { endH += 1; endM = 0; }
      }

      onSlotClick(selection.date, startH, startM, endH, endM);
      setSelection(null);
    }
  };

  const handleDropLocal = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDay(null);
    if (!onDrop || !gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const snappedY = snapTo15(y);
    const { hour, minute } = getTimeFromY(snappedY);

    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (!jsonData) return;
      const data = JSON.parse(jsonData);
      onDrop(dateStr, hour, minute, data);
    } catch (err) {
      console.error('Drop failed:', err);
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => setSelection(null);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => !e.isAllDay && e.timeRanges.some(tr => tr.date === dateStr));
  };

  const getAllDayEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.isAllDay && e.timeRanges.some(tr => tr.date === dateStr));
  };

  const CompletionBadge = ({ completed, onClick }: { completed: boolean; onClick: (e: any) => void; color: string }) => (
    <button
      onClick={onClick}
      className={`relative shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all overflow-hidden ${completed
        ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]'
        : 'bg-white/10 hover:bg-white/20 border border-white/10'
        }`}
    >
      <AnimatePresence mode="wait">
        {completed ? (
          <motion.div
            key="check"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-white"
          >
            <Check className="w-4 h-4 stroke-[4px]" />
          </motion.div>
        ) : (
          <motion.div
            key="circle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-2.5 h-2.5 rounded-full border-2 border-white/30"
          />
        )}
      </AnimatePresence>
    </button>
  );

  const nowY = (now.getHours() - 6) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;
  const showNowLine = now.getHours() >= 6 && now.getHours() <= 21;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background/30 backdrop-blur-md">
      {/* Day headers */}
      <div className="flex border-b border-border/50 bg-background/20 z-40">
        <div className="w-16 shrink-0 border-r border-border/30" />
        {days.map(day => {
          const isToday = isSameDay(day, new Date());
          const allDayEvents = getAllDayEventsForDay(day);
          const visibleAllDay = allDayEvents.slice(0, 2);
          const moreCount = Math.max(0, allDayEvents.length - 2);

          return (
            <div key={day.toISOString()} className="flex-1 flex flex-col border-l border-border/30">
              <div className={`text-center py-4 transition-colors ${isToday ? 'bg-primary/5' : 'bg-white/2'}`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{format(day, 'EEE')}</div>
                <div className={`text-xl font-bold tracking-tighter ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* All-day Task Rows */}
              <div className="flex flex-col gap-[2px] p-1 bg-black/10 border-t border-white/5 h-[84px] overflow-hidden">
                {visibleAllDay.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className={`h-6 rounded-md px-2 flex items-center gap-2 cursor-pointer transition-all border border-white/10 hover:border-white/20 hover:scale-[1.02] shadow-sm relative overflow-hidden`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${ev.color} opacity-40`} />
                    <div className="relative flex items-center gap-1.5 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full bg-white/60`} />
                      <span className="text-[10px] font-black text-white truncate uppercase tracking-tighter">{ev.title}</span>
                    </div>
                  </div>
                ))}
                {moreCount > 0 && (
                  <div className="h-6 flex items-center justify-center text-[9px] font-black text-muted-foreground bg-white/5 rounded-md border border-dashed border-white/10">
                    +{moreCount} MORE COSMIC TASKS
                  </div>
                )}
                {allDayEvents.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-10 pointer-events-none">
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto relative select-none custom-scrollbar"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredTime(null)}
        onMouseUp={handleMouseUp}
      >
        <div className="flex relative" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
          {/* Time Gutter */}
          <div className="w-16 shrink-0 bg-background/10 border-r border-border/30 pr-1">
            {HOURS.map(hour => {
              const isCurrentHour = now.getHours() === hour;
              return (
                <div
                  key={hour}
                  className={`text-[10px] font-bold text-right pr-3 relative transition-colors ${isCurrentHour ? 'text-primary' : 'text-muted-foreground/40'}`}
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="absolute -top-2 right-3">
                    {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid Background Lines */}
          <div className="absolute inset-0 pointer-events-none" style={{ left: 64 }}>
            {HOURS.map(hour => {
              const isCurrentHour = now.getHours() === hour;
              return (
                <div key={hour} className={`relative transition-colors ${isCurrentHour ? 'bg-primary/[0.03]' : ''}`} style={{ height: HOUR_HEIGHT }}>
                  <div className="absolute inset-x-0 bottom-0 border-b border-white/5" />
                  <div className="absolute inset-x-0 top-1/2 border-b border-white/5 border-dashed" />
                </div>
              );
            })}

            {/* Current Time Line */}
            {showNowLine && (
              <div
                className="absolute left-0 right-0 z-50 pointer-events-none flex items-center"
                style={{ top: nowY }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] -ml-1" />
                <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500 to-transparent shadow-[0_0_5px_rgba(239,68,68,0.3)]" />
                <div className="bg-red-500 text-[8px] font-black text-white px-1 py-0.5 rounded ml-2">NOW</div>
              </div>
            )}
          </div>

          {/* Selection Box */}
          {selection && (
            <div
              className="absolute rounded-xl bg-primary/20 border-2 border-primary/50 z-20 pointer-events-none shadow-[0_0_40px_rgba(var(--primary),0.2)] flex flex-col justify-between p-2"
              style={{
                top: Math.min(selection.startY, selection.currentY),
                height: Math.max(8, Math.abs(selection.currentY - selection.startY)),
                left: `calc(64px + ${days.findIndex(d => format(d, 'yyyy-MM-dd') === selection.date) * (100 / 7)}%)`,
                width: `calc((100% - 64px) / 7)`
              }}
            >
              <div className="absolute -top-7 left-0 right-0 text-center">
                <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">
                  {`${String(getTimeFromY(Math.min(selection.startY, selection.currentY)).hour).padStart(2, '0')}:${String(getTimeFromY(Math.min(selection.startY, selection.currentY)).minute).padStart(2, '0')}`}
                </span>
              </div>
              <div className="absolute -bottom-7 left-0 right-0 text-center">
                <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full">
                  {`${String(getTimeFromY(Math.max(selection.startY, selection.currentY)).hour).padStart(2, '0')}:${String(getTimeFromY(Math.max(selection.startY, selection.currentY)).minute).padStart(2, '0')}`}
                </span>
              </div>
            </div>
          )}

          {/* Day Columns */}
          <div className="flex-1 flex">
            {days.map((day, dayIdx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isDraggingOver = dragOverDay === dateStr;

              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 relative border-r border-border/10 transition-colors ${isToday ? 'bg-primary/[0.02]' : ''} ${isDraggingOver ? 'bg-primary/5' : ''}`}
                  onMouseDown={(e) => handleMouseDown(e, dateStr)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverDay(dateStr); }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={(e) => handleDropLocal(e, dateStr)}
                >
                  {dayEvents.map(event => {
                    const tr = event.timeRanges.find(r => r.date === dateStr);
                    if (!tr) return null;
                    const top = (tr.startHour - 6) * HOUR_HEIGHT + (tr.startMinute / 60) * HOUR_HEIGHT;
                    const height = ((tr.endHour - tr.startHour) + (tr.endMinute - tr.startMinute) / 60) * HOUR_HEIGHT;

                    return (
                      <motion.div
                        key={`${event.id}-${tr.id}`}
                        layoutId={`event-${event.id}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          x: isLocked ? 0 : [0, -1, 1, -1, 1, 0],
                          transition: isLocked ? {} : { repeat: Infinity, duration: 0.4 }
                        }}
                        className="absolute left-1 right-1 z-10"
                        style={{ top, height: Math.max(height, 32) }}
                      >
                        <div
                          draggable={!isLocked}
                          onDragStart={(e: React.DragEvent) => {
                            e.dataTransfer.setData('application/json', JSON.stringify({
                              type: 'reschedule',
                              eventId: event.id,
                              rangeId: tr.id
                            }))
                          }}
                          className={`w-full h-full rounded-xl glass-strong border border-white/20 p-2 cursor-pointer group shadow-2xl transition-all hover:scale-[1.02] hover:shadow-primary/30 ${event.completed ? 'opacity-40 grayscale-[0.5]' : 'cosmic-glow'}`}
                          style={{
                            background: event.completed ? 'rgba(255,255,255,0.05)' : undefined,
                            boxShadow: !event.completed ? `0 0 20px -5px hsl(var(--primary) / 0.4)` : undefined
                          }}
                          onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                          onMouseEnter={(e: React.MouseEvent) => event.memo && setHoveredMemo({ event, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredMemo(null)}
                        >
                          {!event.completed && (
                            <div className={`absolute inset-0 bg-gradient-to-br ${event.color} opacity-40 group-hover:opacity-60 transition-opacity rounded-xl`} />
                          )}

                          <div className="relative flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex flex-col truncate">
                              <span className={`text-[11px] font-black tracking-tight truncate ${event.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {event.title}
                              </span>
                              {height > 60 && (
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">
                                  {`${String(tr.startHour).padStart(2, '0')}:${String(tr.startMinute).padStart(2, '0')} - ${String(tr.endHour).padStart(2, '0')}:${String(tr.endMinute).padStart(2, '0')}`}
                                </span>
                              )}
                            </div>
                            <CompletionBadge
                              completed={event.completed || false}
                              onClick={(e) => { e.stopPropagation(); onCompleteEvent(event); }}
                              color={event.color}
                            />
                          </div>

                          {event.memo && height > 40 && (
                            <MessageSquare className="absolute bottom-2 right-2 w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          )}

                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${event.color}`} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Bubble */}
        <AnimatePresence>
          {hoveredTime && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed flex flex-col items-center pointer-events-none z-[100] -translate-x-1/2 -translate-y-full mb-6"
              style={{ left: hoveredTime.x, top: hoveredTime.y }}
            >
              <div className="glass-strong border border-primary/50 rounded-lg px-3 py-1 text-[10px] font-black text-primary shadow-[0_0_20px_rgba(var(--primary),0.4)] backdrop-blur-xl mb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {hoveredTime.time}
              </div>
              <div className="w-0.5 h-12 bg-gradient-to-b from-primary/60 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Memo Popup */}
        <AnimatePresence>
          {hoveredMemo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed glass-strong border border-white/10 rounded-2xl px-5 py-4 max-w-xs z-[110] pointer-events-none shadow-2xl bg-black/80 backdrop-blur-3xl"
              style={{
                left: Math.min(hoveredMemo.x + 20, typeof window !== 'undefined' ? window.innerWidth - 300 : 0),
                top: Math.min(hoveredMemo.y + 20, typeof window !== 'undefined' ? window.innerHeight - 150 : 0),
              }}
            >
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">
                <MessageSquare className="w-3 h-3" />
                Cosmic Memo
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground/90">{hoveredMemo.event.memo}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
