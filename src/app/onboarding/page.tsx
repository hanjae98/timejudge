'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Briefcase, Palette, Moon, Sun, Coffee, Dumbbell, Rocket, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Persona, RoutineBlock } from '@/types/timejudge'

const personas = [
    { id: 'student' as Persona, label: 'Student', icon: GraduationCap, desc: 'Classes, study sessions, and campus life' },
    { id: 'professional' as Persona, label: 'Professional', icon: Briefcase, desc: 'Meetings, deep work, and career growth' },
    { id: 'freelancer' as Persona, label: 'Freelancer', icon: Palette, desc: 'Flexible schedule, projects, and clients' },
]

const defaultRoutines: RoutineBlock[] = [
    { id: 'r1', type: 'sleep', label: 'Sleep', startHour: 23, endHour: 7 },
    { id: 'r2', type: 'work', label: 'Work / Study', startHour: 9, endHour: 17 },
    { id: 'r3', type: 'meal', label: 'Lunch', startHour: 12, endHour: 13 },
    { id: 'r4', type: 'exercise', label: 'Exercise', startHour: 7, endHour: 8 },
]

const routineIcons = { sleep: Moon, work: Sun, meal: Coffee, exercise: Dumbbell }

export default function OnboardingPage() {
    const [step, setStep] = useState(0)
    const [persona, setPersona] = useState<Persona | null>(null)
    const [routines, setRoutines] = useState<RoutineBlock[]>(defaultRoutines)
    const [launching, setLaunching] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const updateRoutine = (id: string, field: 'startHour' | 'endHour', value: number) => {
        setRoutines(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    const handleLaunch = async () => {
        setLoading(true)
        setLaunching(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { error } = await supabase
                    .from('users')
                    .update({
                        job_role: persona,
                        fixed_routines: routines,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        onboarding_complete: true
                    })
                    .eq('id', user.id)

                if (error) throw error
            }

            // Artificial delay for launch animation
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        } catch (err) {
            console.error(err)
            alert('설정 저장 중 오류가 발생했습니다.')
            setLaunching(false)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen cosmic-gradient flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Progress */}
                <div className="flex gap-2 mb-8 justify-center">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-500 ${i <= step ? 'w-16 bg-primary' : 'w-8 bg-muted'
                                }`}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div
                            key="step0"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h1 className="text-4xl font-black text-gradient tracking-tight">Who are you?</h1>
                                <p className="text-muted-foreground">Select your persona to customize your universe</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {personas.map(p => {
                                    const Icon = p.icon
                                    const selected = persona === p.id
                                    return (
                                        <motion.button
                                            key={p.id}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setPersona(p.id)}
                                            className={`glass rounded-2xl p-6 text-left transition-all duration-300 ${selected ? 'cosmic-glow-strong border-primary/60 bg-primary/5' : 'hover:border-primary/30'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selected ? 'bg-primary/20' : 'bg-muted'
                                                }`}>
                                                <Icon className={`w-6 h-6 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            </div>
                                            <h3 className="font-bold text-foreground mb-1">{p.label}</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                                        </motion.button>
                                    )
                                })}
                            </div>

                            <div className="flex justify-center">
                                <Button
                                    size="lg"
                                    disabled={!persona}
                                    onClick={() => setStep(1)}
                                    className="px-8 rounded-xl h-14 text-base font-bold transition-all hover:scale-105 active:scale-95"
                                >
                                    Continue
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h1 className="text-4xl font-black text-gradient tracking-tight">Fixed Routines</h1>
                                <p className="text-muted-foreground">Set your recurring daily blocks</p>
                            </div>

                            <div className="space-y-3">
                                {routines.map(r => {
                                    const Icon = routineIcons[r.type as keyof typeof routineIcons]
                                    return (
                                        <motion.div
                                            key={r.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="glass rounded-2xl p-5 flex items-center gap-4 border-white/5"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <Icon className="w-5 h-5 text-primary" />
                                            </div>
                                            <span className="font-bold flex-1 text-foreground">{r.label}</span>
                                            <div className="flex items-center gap-2 text-sm">
                                                <select
                                                    value={r.startHour}
                                                    onChange={e => updateRoutine(r.id, 'startHour', +e.target.value)}
                                                    className="bg-muted hover:bg-muted/80 transition-colors rounded-lg px-3 py-1.5 text-foreground border-none outline-none font-bold"
                                                >
                                                    {Array.from({ length: 24 }, (_, i) => (
                                                        <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                                    ))}
                                                </select>
                                                <span className="text-muted-foreground font-black">→</span>
                                                <select
                                                    value={r.endHour}
                                                    onChange={e => updateRoutine(r.id, 'endHour', +e.target.value)}
                                                    className="bg-muted hover:bg-muted/80 transition-colors rounded-lg px-3 py-1.5 text-foreground border-none outline-none font-bold"
                                                >
                                                    {Array.from({ length: 24 }, (_, i) => (
                                                        <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>

                            <div className="flex justify-center gap-3">
                                <Button variant="ghost" onClick={() => setStep(0)} className="rounded-xl h-14 px-8">Back</Button>
                                <Button size="lg" onClick={() => setStep(2)} className="px-10 rounded-xl h-14 text-base font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">
                                    Continue
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-8 text-center"
                        >
                            <div className="space-y-2">
                                <h1 className="text-4xl font-black text-gradient tracking-tight">Ready for Launch!</h1>
                                <p className="text-muted-foreground">Your universe is configured. Let's go!</p>
                            </div>

                            <div className="relative h-64 flex items-center justify-center">
                                <motion.div
                                    animate={launching ? { y: -500, scale: 0.3, opacity: 0 } : { y: [0, -20, 0], rotate: [-45, -40, -45] }}
                                    transition={launching ? { duration: 1.5, ease: 'easeIn' } : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <Rocket className="w-24 h-24 text-primary" />
                                </motion.div>
                                {launching && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: [0, 1, 0], scale: [0.5, 3, 5] }}
                                        transition={{ duration: 1.5 }}
                                        className="absolute inset-0 rounded-full bg-primary/30 blur-[100px]"
                                    />
                                )}
                            </div>

                            <div className="flex justify-center gap-3">
                                <Button variant="ghost" onClick={() => setStep(1)} disabled={launching} className="rounded-xl h-14 px-8">Back</Button>
                                <Button
                                    size="lg"
                                    onClick={handleLaunch}
                                    disabled={launching}
                                    className="px-12 rounded-xl h-14 text-lg font-black cosmic-glow transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/30"
                                >
                                    {launching ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Launching...
                                        </div>
                                    ) : 'Launch Universe 🚀'}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
