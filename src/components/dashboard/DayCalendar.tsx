'use client'

import { useState, useRef, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { UniverseEvent } from '@/types/timejudge';
import { MessageSquare, Check } from 'lucide-react';

interface DayCalendarProps {
  selectedDate: Date;
  events: UniverseEvent[];
  onEventClick: (event: UniverseEvent) => void;
  onSlotClick: (date: string, hour: number, minute?: number, endHour?: number, endMinute?: number) => void;
  onCompleteEvent: (event: UniverseEvent) => void;
  isLocked?: boolean;
  onDrop?: (date: string, hour: number, minute: number, data: any) => void;
}

const HOUR_HEIGHT = 100;
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export default function DayCalendar({ selectedDate, events, onEventClick, onSlotClick, onCompleteEvent, isLocked = true, onDrop }: DayCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEvents = events.filter(e => e.timeRanges.some(tr => tr.date === dateStr));

  const [now, setNow] = useState(new Date());
  const [hoveredTime, setHoveredTime] = useState<{ x: number; y: number; time: string } | null>(null);
  const [selection, setSelection] = useState<{ startY: number; currentY: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const snappedY = snapTo15(y);
    setSelection({ startY: snappedY, currentY: snappedY + (HOUR_HEIGHT / 2) });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const snappedY = snapTo15(y);

    const { hour, minute } = getTimeFromY(snappedY);
    if (hour >= 6 && hour <= 21) {
      setHoveredTime({
        x: e.clientX,
        y: e.clientY,
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      });
    } else {
      setHoveredTime(null);
    }

    if (selection) {
      setSelection(prev => prev ? { ...prev, currentY: snappedY } : null);
    }
  }, [selection]);

  const handleMouseUp = () => {
    if (selection) {
      const { hour: startH, minute: startM } = getTimeFromY(Math.min(selection.startY, selection.currentY));
      let { hour: endH, minute: endM } = getTimeFromY(Math.max(selection.startY, selection.currentY));

      if (startH === endH && startM === endM) {
        endM += 30;
        if (endM >= 60) { endH += 1; endM = 0; }
      }

      onSlotClick(dateStr, startH, startM, endH, endM);
      setSelection(null);
    }
  };

  const handleDropLocal = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
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

  const CompletionBadge = ({ completed, onClick }: { completed: boolean; onClick: (e: any) => void }) => (
    <button
      onClick={onClick}
      className={`relative shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all overflow-hidden ${completed
          ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
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
            <Check className="w-5 h-5 stroke-[4px]" />
          </motion.div>
        ) : (
          <motion.div
            key="circle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-3.5 h-3.5 rounded-full border-2 border-white/20"
          />
        )}
      </AnimatePresence>
    </button>
  );

  const nowY = (now.getHours() - 6) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;
  const showNowLine = now.getHours() >= 6 && now.getHours() <= 21;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background/20 backdrop-blur-xl">
      <div className="px-8 py-6 border-b border-white/5 bg-white/2">
        <h2 className="text-3xl font-black tracking-tighter text-foreground">{format(selectedDate, 'EEEE, MMMM do')}</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mt-1">Astral View Port</p>
      </div>

      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto relative select-none custom-scrollbar"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredTime(null)}
        onMouseUp={handleMouseUp}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropLocal}
      >
        <div className="flex relative" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
          {/* Time Gutter */}
          <div className="w-20 shrink-0 bg-background/10 border-r border-border/10">
            {HOURS.map(hour => {
              const isCurrentHour = now.getHours() === hour;
              return (
                <div
                  key={hour}
                  className={`text-[11px] font-bold text-right pr-6 relative transition-colors ${isCurrentHour ? 'text-primary' : 'text-muted-foreground/30'}`}
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="absolute -top-2 right-6">
                    {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className={`flex-1 relative transition-colors ${dragOver ? 'bg-primary/5' : ''}`}
            onMouseDown={handleMouseDown}
          >
            {/* Grid Background Lines */}
            <div className="absolute inset-0 pointer-events-none">
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
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] -ml-1.25" />
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500 to-transparent" />
                  <div className="bg-red-500 text-[10px] font-black text-white px-2 py-0.5 rounded ml-4 shadow-xl">NOW ORBITING</div>
                </div>
              )}
            </div>

            {/* Selection Box */}
            {selection && (
              <div
                className="absolute left-4 right-4 rounded-2xl bg-primary/20 border-2 border-primary/50 z-20 pointer-events-none shadow-[0_0_40px_rgba(var(--primary),0.2)] flex flex-col justify-between p-4"
                style={{
                  top: Math.min(selection.startY, selection.currentY),
                  height: Math.max(12, Math.abs(selection.currentY - selection.startY)),
                }}
              >
                <div className="absolute -top-8 left-0 right-0 text-center">
                  <span className="text-[11px] font-black bg-primary text-white px-3 py-1 rounded-full shadow-2xl">
                    {`${String(getTimeFromY(Math.min(selection.startY, selection.currentY)).hour).padStart(2, '0')}:${String(getTimeFromY(Math.min(selection.startY, selection.currentY)).minute).padStart(2, '0')}`}
                  </span>
                </div>
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <span className="text-[11px] font-black bg-primary text-white px-3 py-1 rounded-full shadow-2xl">
                    {`${String(getTimeFromY(Math.max(selection.startY, selection.currentY)).hour).padStart(2, '0')}:${String(getTimeFromY(Math.max(selection.startY, selection.currentY)).minute).padStart(2, '0')}`}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-primary/40">Initiating New Event</span>
                </div>
              </div>
            )}

            {/* Events */}
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
                    x: isLocked ? 0 : [0, -2, 2, -2, 2, 0],
                    transition: isLocked ? {} : { repeat: Infinity, duration: 0.5 }
                  }}
                  className="absolute left-4 right-4 z-10"
                  style={{ top, height: Math.max(height, 64) }}
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
                    className={`w-full h-full rounded-2xl glass-strong border border-white/20 p-6 cursor-pointer group shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all ${event.completed ? 'opacity-40 grayscale-[0.4]' : 'cosmic-glow hover:scale-[1.01]'}`}
                    style={{
                      boxShadow: !event.completed ? `0 0 30px -5px hsl(var(--primary) / 0.5)` : undefined
                    }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                  >
                    {!event.completed && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${event.color} opacity-40 group-hover:opacity-60 transition-opacity rounded-2xl`} />
                    )}

                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <h3 className={`text-xl font-black tracking-tight mb-2 ${event.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="text-[12px] font-black text-white/40 uppercase tracking-widest">
                            {`${String(tr.startHour).padStart(2, '0')}:${String(tr.startMinute).padStart(2, '0')} - ${String(tr.endHour).padStart(2, '0')}:${String(tr.endMinute).padStart(2, '0')}`}
                          </span>
                        </div>
                      </div>
                      <CompletionBadge
                        completed={event.completed || false}
                        onClick={(e) => { e.stopPropagation(); onCompleteEvent(event); }}
                      />
                    </div>

                    {height > 120 && event.description && (
                      <p className="mt-6 text-sm text-foreground/60 line-clamp-3 font-medium relative z-10 leading-relaxed">{event.description}</p>
                    )}

                    {event.memo && (
                      <div className="absolute bottom-6 right-8 flex items-center gap-3 text-primary opacity-40 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-black uppercase tracking-widest">Memo</span>
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full bg-gradient-to-b ${event.color}`} />
                  </div>
                </motion.div>
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
              className="fixed flex flex-col items-center pointer-events-none z-[100] -translate-x-1/2 -translate-y-full mb-8"
              style={{ left: hoveredTime.x, top: hoveredTime.y }}
            >
              <div className="glass-strong border border-primary/50 rounded-lg px-4 py-1.5 text-xs font-black text-primary shadow-[0_0_20px_rgba(var(--primary),0.4)] backdrop-blur-3xl mb-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {hoveredTime.time}
              </div>
              <div className="w-0.5 h-16 bg-gradient-to-b from-primary/60 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
