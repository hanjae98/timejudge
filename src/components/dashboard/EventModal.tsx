'use client'

import { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Sparkles, Loader2, Calendar, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UniverseEvent, TimeRange, Priority } from '@/types/timejudge';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (event: UniverseEvent) => void;
  initialDate?: string;
  initialHour?: number;
  initialMinute?: number;
  editEvent?: UniverseEvent;
  ranges?: any[];
}

interface DimensionField {
  key: string;
  label: string;
  placeholder: string;
}

const priorities: { id: Priority; label: string; color: string }[] = [
  { id: 'high', label: 'High', color: 'bg-priority-high' },
  { id: 'medium', label: 'Medium', color: 'bg-priority-medium' },
  { id: 'low', label: 'Low', color: 'bg-priority-low' },
];

const colorOptions = [
  'from-primary to-cosmic-violet',
  'from-cosmic-violet to-primary',
  'from-priority-low to-primary',
  'from-primary to-priority-medium',
];

export default function EventModal({ open, onClose, onSave, initialDate, initialHour, initialMinute, editEvent, ranges }: EventModalProps) {
  const formId = useId();
  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memo, setMemo] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [color, setColor] = useState(colorOptions[0]);
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
  const [dimensionValues, setDimensionValues] = useState<Record<string, string>>({});
  const [isAllDay, setIsAllDay] = useState(false);
  const [isRoutine, setIsRoutine] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [dimensionFields, setDimensionFields] = useState<DimensionField[]>([]);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setDescription(editEvent.description ?? '');
        setMemo(editEvent.memo ?? '');
        setPriority(editEvent.priority);
        setColor(editEvent.color);
        setTimeRanges(editEvent.timeRanges);
        setDimensionValues(editEvent.dimensionFields ?? {});
        setIsAllDay(editEvent.isAllDay ?? false);
        setIsRoutine(editEvent.isRoutine ?? false);
      } else {
        setTitle('');
        setDescription('');
        setMemo('');
        setPriority('medium');
        setColor(colorOptions[0]);
        setIsAllDay(false);
        setIsRoutine(false);

        if (ranges && ranges.length > 0) {
          setTimeRanges(ranges.map((r, i) => ({
            id: `range-${i}`,
            date: r.date,
            startHour: r.startHour,
            startMinute: r.startMinute,
            endHour: r.endHour,
            endMinute: r.endMinute
          })));
        } else {
          setTimeRanges([{
            id: 'new-1',
            date: initialDate ?? today,
            startHour: initialHour ?? 9,
            startMinute: initialMinute ?? 0,
            endHour: (initialHour ?? 9) + 1,
            endMinute: 0,
          }]);
        }
      }
    }
  }, [open, editEvent, initialDate, initialHour, initialMinute, ranges, today]);

  useEffect(() => {
    if (!title || title.length < 3) {
      setDimensionFields([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const res = await fetch('/api/analyze-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
          signal: controller.signal
        });
        const data = await res.json();
        if (data.suggestedFields) {
          setDimensionFields(data.suggestedFields.map((f: any) => ({
            key: f.key,
            label: f.label,
            placeholder: f.placeholder || f.label
          })));
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setAnalyzing(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: editEvent?.id ?? `evt-${Date.now()}`,
      title,
      description,
      memo,
      priority,
      color,
      timeRanges,
      dimensionFields: Object.keys(dimensionValues).length > 0 ? dimensionValues : undefined,
      isAllDay,
      isRoutine
    });
    onClose();
  };

  const updateTimeRange = (id: string, field: keyof TimeRange | 'start' | 'end', value: any) => {
    if ((field === 'start' || field === 'end') && typeof value === 'number') {
      const h = Math.floor(value);
      const m = Math.round((value - h) * 60);
      setTimeRanges(prev => prev.map(tr => tr.id === id ? { ...tr, [`${field}Hour`]: h, [`${field}Minute`]: m } : tr));
    } else {
      setTimeRanges(prev => prev.map(tr => tr.id === id ? { ...tr, [field as any]: value } : tr));
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="glass-strong rounded-[32px] w-full max-w-xl max-h-[90vh] overflow-y-auto p-8 space-y-6 shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 luxury-scroller bg-slate-950/80"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">
                {editEvent ? 'Configure' : 'Launch'} Event
              </h2>
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase mt-1">Cosmic Synchronization</span>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/40 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Identity</Label>
              <Input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Universe Task Identity..."
                className="h-14 bg-white/5 border-white/10 text-xl font-bold rounded-2xl focus-visible:ring-primary placeholder:text-white/10"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAllDay(!isAllDay)}
                className={`flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest ${isAllDay ? 'bg-primary border-transparent text-white shadow-lg shadow-primary/30' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
              >
                <Calendar className="w-4 h-4" /> All Day Event
              </button>
              <button
                onClick={() => setIsRoutine(!isRoutine)}
                className={`flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest ${isRoutine ? 'bg-violet-600 border-transparent text-white shadow-lg shadow-violet-600/30' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
              >
                <Repeat className="w-4 h-4" /> Recurring Routine
              </button>
            </div>
          </div>

          <AnimatePresence>
            {analyzing && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 px-4 py-3 bg-primary/10 border border-primary/20 rounded-2xl">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">Scanning Dimensions...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Priority</Label>
              <div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                {priorities.map(p => (
                  <button
                    key={p.id} onClick={() => setPriority(p.id)}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${priority === p.id ? `${p.color} text-white shadow-lg` : 'text-white/20 hover:text-white'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Aura Color</Label>
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/5">
                {colorOptions.map(c => (
                  <button
                    key={c} onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${c} transition-all ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-40 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {!isAllDay && (
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Time Alignment</Label>
              {timeRanges.map(tr => (
                <div key={tr.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-xs font-black text-white">{tr.date}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={tr.startHour + tr.startMinute / 60}
                      onChange={e => updateTimeRange(tr.id, 'start', +e.target.value)}
                      className="bg-black/40 text-xs font-bold px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-primary outline-none"
                    >
                      {Array.from({ length: 24 * 4 }, (_, i) => {
                        const h = Math.floor(i / 4);
                        const m = (i % 4) * 15;
                        return <option key={i} value={h + m / 60}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</option>
                      })}
                    </select>
                    <span className="text-white/20">/</span>
                    <select
                      value={tr.endHour + tr.endMinute / 60}
                      onChange={e => updateTimeRange(tr.id, 'end', +e.target.value)}
                      className="bg-black/40 text-xs font-bold px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-primary outline-none"
                    >
                      {Array.from({ length: 24 * 4 }, (_, i) => {
                        const h = Math.floor(i / 4);
                        const m = (i % 4) * 15;
                        return <option key={i} value={h + m / 60}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</option>
                      })}
                    </select>
                  </div>
                </div>
              ))}
              <button onClick={() => setTimeRanges([...timeRanges, { id: Date.now().toString(), date: today, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0 }])} className="w-full h-10 rounded-2xl border border-dashed border-white/10 text-white/20 text-[10px] font-black uppercase tracking-widest hover:border-primary/40 hover:text-primary transition-all">
                + Integrate New Time Vector
              </button>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[11px]">Abort</Button>
            <Button onClick={handleSave} className="flex-[2] h-14 rounded-2xl bg-primary hover:bg-primary/80 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30">
              <Sparkles className="w-4 h-4 mr-2" />
              {editEvent ? 'Commit Update' : 'Initialize Launch'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
