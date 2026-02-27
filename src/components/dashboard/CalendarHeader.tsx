'use client'

import { ChevronLeft, ChevronRight, Plus, Lock, Unlock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarView } from '@/types/timejudge';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';

interface CalendarHeaderProps {
  view: CalendarView;
  selectedDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onCreateEvent: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onRefresh?: () => void;
}

const views: { id: CalendarView; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export default function CalendarHeader({
  view,
  selectedDate,
  onViewChange,
  onDateChange,
  onCreateEvent,
  isLocked,
  onToggleLock,
  onRefresh
}: CalendarHeaderProps) {
  const navigate = (dir: 1 | -1) => {
    const fn = dir === 1
      ? (view === 'day' ? addDays : view === 'week' ? addWeeks : addMonths)
      : (view === 'day' ? subDays : view === 'week' ? subWeeks : subMonths);
    onDateChange(fn(selectedDate, 1));
  };

  const label = view === 'day'
    ? format(selectedDate, 'EEEE, MMM d, yyyy')
    : view === 'week'
      ? `Week of ${format(selectedDate, 'MMM d, yyyy')}`
      : format(selectedDate, 'MMMM yyyy');

  return (
    <header className="flex items-center justify-between px-10 py-6 border-b border-white/5 relative z-50">
      <div className="flex items-center gap-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-white tracking-tighter leading-none mb-1">My Universe</h1>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Active Session</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 text-white hover:bg-white/10 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-black text-white min-w-[180px] text-center">{label}</span>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)} className="h-10 w-10 text-white hover:bg-white/10 rounded-xl">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateChange(new Date())}
          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
        >
          Return to Now
        </Button>
      </div>

      <div className="flex items-center gap-6">
        {/* View Switcher */}
        <div className="bg-white/5 rounded-2xl p-1.5 flex gap-1 border border-white/5 shadow-inner">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${view === v.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pr-4 border-r border-white/10">
          <Button
            variant="ghost"
            onClick={() => onDateChange(new Date())}
            className="h-12 px-4 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white"
          >
            Add Routine
          </Button>
          <button
            onClick={onToggleLock}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${isLocked
              ? 'bg-white/5 border-white/10 text-white/40 hover:text-white'
              : 'bg-red-500 text-white border-transparent shadow-lg shadow-red-500/20 animate-pulse'
              }`}
          >
            {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>
          <button
            onClick={onRefresh}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <Button
          onClick={onCreateEvent}
          className="h-12 px-8 bg-white hover:bg-slate-100 text-black font-black rounded-2xl gap-3 shadow-xl transition-all active:scale-95"
        >
          <Plus className="w-5 h-5 stroke-[3px]" />
          Launch Event
        </Button>
      </div>
    </header>
  );
}
