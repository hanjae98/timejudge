import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Loader2, ChevronLeft, ChevronRight, Plus, BrainCircuit, ArrowRight, Stars } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InboxTask, Priority } from '@/types/timejudge';
import { useState } from 'react';

interface TaskInboxProps {
  tasks: InboxTask[];
  onAutoPilot: () => void;
  onTaskClick: (task: InboxTask) => void;
}

const priorityColors: Record<Priority, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-primary/20 text-primary border-primary/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function TaskInbox({ tasks, onAutoPilot, onTaskClick }: TaskInboxProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      const title = input
      setInput('')
      setLoading(true)
      try {
        await fetch('/api/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 0 : 320, opacity: collapsed ? 0 : 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="h-full flex flex-col relative z-20 overflow-hidden"
    >
      {/* Premium Header */}
      <div className="p-8 pb-4 flex items-center justify-between">
        <div>
          <h2 className="font-black text-white text-3xl tracking-tighter">Inbox</h2>
          <p className="text-[11px] text-primary font-black uppercase tracking-[0.2em]">Cosmic Queue</p>
        </div>
        {tasks.length > 0 && (
          <button
            onClick={onAutoPilot}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-lg transition-all active:scale-95 group"
          >
            <BrainCircuit className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </button>
        )}
      </div>

      {/* Input Section */}
      <div className="px-8 mb-8">
        <div className="relative group">
          <input
            type="text"
            placeholder="What's in your mind?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleAdd}
            className="w-full pl-5 pr-14 py-5 rounded-[24px] bg-white/5 border border-white/10 focus:border-primary/50 focus:bg-white/10 outline-none transition-all text-[15px] font-bold text-white placeholder:text-muted-foreground shadow-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-primary shadow-lg shadow-primary/20 cursor-pointer">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Scrollable Task List */}
      <div className="flex-1 overflow-auto px-8 pb-8 space-y-4 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 opacity-50">
            <Stars className="w-10 h-10 mb-4 text-white/5" />
            <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em]">Inbox Empty</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div
                  draggable
                  onDragStart={(e: React.DragEvent) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                      ...task,
                      type: 'inbox-task'
                    }))
                  }}
                  className="group p-5 rounded-[28px] bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 hover:shadow-2xl hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing"
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-[14px] font-bold text-white leading-tight group-hover:text-primary transition-colors">
                          {task.title}
                        </h4>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all mt-1" />
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 opacity-30" />
                        {task.estimatedMinutes ? `${task.estimatedMinutes}m` : 'Analyzing'}
                      </span>
                      <Badge className={`text-[9px] font-black uppercase tracking-tighter ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Auto Pilot Trigger */}
      <div className="px-8 pb-8">
        <button
          onClick={onAutoPilot}
          disabled={tasks.length === 0}
          className="w-full py-5 bg-primary hover:bg-primary/90 text-white font-black rounded-[24px] shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <Zap className="w-4 h-4 fill-current" />
          AI Dimension Sync
        </button>
      </div>
    </motion.div>
  )
}
