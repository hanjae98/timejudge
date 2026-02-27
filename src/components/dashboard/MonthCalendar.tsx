'use client'

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isWithinInterval, min, max } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { UniverseEvent } from '@/types/timejudge';
import { Check, Plus } from 'lucide-react';

interface MonthCalendarProps {
  selectedDate: Date;
  events: UniverseEvent[];
  onEventClick: (event: UniverseEvent) => void;
  onDayClick: (date: Date) => void;
  onRangeSelect?: (startDate: string, endDate: string) => void;
  onCompleteEvent: (event: UniverseEvent) => void;
}

export default function MonthCalendar({ selectedDate, events, onEventClick, onDayClick, onRangeSelect, onCompleteEvent }: MonthCalendarProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const weeks: Date[][] = [];
  let dayInProgress = calStart;
  while (dayInProgress <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(dayInProgress);
      dayInProgress = addDays(dayInProgress, 1);
    }
    weeks.push(week);
  }

  const getEventsForDay = (d: Date) => {
    const ds = format(d, 'yyyy-MM-dd');
    return events.filter(e => e.timeRanges.some(tr => tr.date === ds));
  };

  const handleMouseDown = (d: Date) => {
    setSelectionStart(d);
    setSelectionEnd(d);
    setIsSelecting(true);
  };

  const handleMouseEnter = (d: Date) => {
    if (isSelecting) {
      setSelectionEnd(d);
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd && onRangeSelect) {
      const start = min([selectionStart, selectionEnd]);
      const end = max([selectionStart, selectionEnd]);
      onRangeSelect(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    }
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isSelecting, selectionStart, selectionEnd]);

  const CompletionBadge = ({ completed, onClick }: { completed: boolean; onClick: (e: any) => void }) => (
    <button
      onClick={onClick}
      className={`relative shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all overflow-hidden ${completed
          ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
          : 'bg-white/10 hover:bg-white/20 border border-white/10'
        }`}
    >
      <AnimatePresence mode="wait">
        {completed ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-white"
          >
            <Check className="w-2.5 h-2.5 stroke-[4px]" />
          </motion.div>
        ) : (
          <motion.div
            key="circle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-1.5 h-1.5 rounded-full border border-white/20"
          />
        )}
      </AnimatePresence>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col p-6 bg-background/20 backdrop-blur-xl gap-4 select-none">
      <div className="grid grid-cols-7 gap-4 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(name => (
          <div key={name} className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center">
            {name}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-rows-5 gap-4">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-4 min-h-0">
            {week.map((d, dayIdx) => {
              const dayEvents = getEventsForDay(d);
              const isCurrentMonth = isSameMonth(d, selectedDate);
              const isToday = isSameDay(d, new Date());
              const dayKey = format(d, 'yyyy-MM-dd');

              const isSelected = selectionStart && selectionEnd && isWithinInterval(d, {
                start: min([selectionStart, selectionEnd]),
                end: max([selectionStart, selectionEnd])
              });

              const visibleEvents = dayEvents.slice(0, 2);
              const moreCount = dayEvents.length - 2;

              return (
                <motion.div
                  key={dayKey}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (weekIdx * 7 + dayIdx) * 0.005 }}
                  onMouseDown={() => handleMouseDown(d)}
                  onMouseEnter={() => handleMouseEnter(d)}
                  onClick={() => !isSelecting && onDayClick(d)}
                  className={`relative flex flex-col p-2.5 rounded-xl transition-all border group cursor-pointer h-full min-h-[120px] overflow-hidden ${isCurrentMonth ? 'border-white/10' : 'border-transparent opacity-20'
                    } ${isToday ? 'bg-primary/5 border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]' : 'bg-white/2'}
                  ${isSelected ? 'bg-primary/20 border-primary/40' : 'hover:bg-white/5'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-black transition-colors ${isToday ? 'text-primary' : 'text-foreground/40 group-hover:text-foreground'}`}>
                      {format(d, 'd')}
                    </span>
                    {isToday && <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />}
                  </div>

                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {visibleEvents.map(ev => (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        className={`relative group/item flex items-center justify-between rounded-md px-1.5 py-1 transition-all text-[9px] font-black shadow-lg border border-white/5 ${ev.completed ? 'opacity-40 grayscale-[0.5]' : 'hover:scale-[1.02] cosmic-glow-sm'
                          }`}
                      >
                        {!ev.completed && (
                          <div className={`absolute inset-0 bg-gradient-to-r ${ev.color} opacity-60 rounded-md`} />
                        )}
                        <span className={`relative z-10 truncate flex-1 ${ev.completed ? 'line-through text-muted-foreground' : 'text-primary-foreground'} uppercase tracking-tighter`}>
                          {ev.title}
                        </span>
                        <CompletionBadge
                          completed={ev.completed || false}
                          onClick={(e) => { e.stopPropagation(); onCompleteEvent(ev); }}
                        />
                      </div>
                    ))}

                    {moreCount > 0 && (
                      <div className="mt-auto pt-1 border-t border-white/5 flex items-center justify-center gap-1 text-[8px] font-black text-white/40 group-hover:text-primary transition-colors">
                        <Plus className="w-2 h-2" />
                        {moreCount} MORE
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
