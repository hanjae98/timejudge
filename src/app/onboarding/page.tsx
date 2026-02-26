'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, BookOpen, Monitor, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import FullCalendar from '@fullcalendar/react'
import { createClient } from '@/lib/supabase/client'

type Step = 1 | 2 | 3
type Role = '학생' | '직장인' | '프리랜서' | '기타' | null

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClient()
    const [step, setStep] = useState<Step>(1)
    const [selectedRole, setSelectedRole] = useState<Role>(null)
    const [loading, setLoading] = useState(false)
    const [events, setEvents] = useState<any[]>([
        { title: '수면 (가이드)', startTime: '00:00', endTime: '07:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], color: '#cbd5e1' },
    ])

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role)
        if (role === '직장인') {
            setEvents([
                { title: '수면', startTime: '00:00', endTime: '07:30', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], color: '#cbd5e1' },
                { title: '업무', startTime: '09:00', endTime: '18:00', daysOfWeek: [1, 2, 3, 4, 5], color: '#94a3b8' },
            ])
        } else if (role === '학생') {
            setEvents([
                { title: '수면', startTime: '01:00', endTime: '08:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], color: '#cbd5e1' },
            ])
        }
    }

    const nextStep = () => setStep((s) => Math.min(s + 1, 3) as Step)
    const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step)

    const handleFinish = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { error } = await supabase
                    .from('users')
                    .update({
                        job_role: selectedRole,
                        fixed_routines: events,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })
                    .eq('id', user.id)

                if (error) throw error
            }
            router.push('/dashboard')
        } catch (err) {
            console.error(err)
            alert('설정 저장 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col pt-12 text-gray-900">
            <div className="max-w-4xl w-full mx-auto p-4 flex-1 flex flex-col">
                {/* Progress Bar */}
                <div className="mb-8 px-4">
                    <div className="flex gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-2 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-blue-600' : 'bg-gray-200'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="mt-2 text-sm text-gray-500 font-medium text-right">Step {step} of 3</p>
                </div>

                {/* Step 1: Role Selection */}
                {step === 1 && (
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-center">어떤 일을 하시나요?</h1>
                        <p className="text-gray-500 text-center mb-10">
                            라이프스타일에 맞게 기본 루틴을 설계해 드릴게요.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <RoleCard
                                icon={<BookOpen className="w-8 h-8" />}
                                title="학생"
                                desc="수업, 과제, 시험 준비가 많은 일상"
                                selected={selectedRole === '학생'}
                                onClick={() => handleRoleSelect('학생')}
                            />
                            <RoleCard
                                icon={<Briefcase className="w-8 h-8" />}
                                title="직장인"
                                desc="규칙적인 출퇴근과 업무 시간이 있는 일상"
                                selected={selectedRole === '직장인'}
                                onClick={() => handleRoleSelect('직장인')}
                            />
                            <RoleCard
                                icon={<Monitor className="w-8 h-8" />}
                                title="프리랜서"
                                desc="일정이 유동적이고 자기 주도적인 일상"
                                selected={selectedRole === '프리랜서'}
                                onClick={() => handleRoleSelect('프리랜서')}
                            />
                        </div>

                        <div className="flex justify-end mt-auto">
                            <button
                                onClick={nextStep}
                                disabled={!selectedRole}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/30"
                            >
                                다음 <span><ArrowRight className="w-5 h-5" /></span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Fixed Routine Box */}
                {step === 2 && (
                    <div className="bg-white rounded-3xl p-8 shadow-xl flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="mb-6">
                            <h1 className="text-3xl font-extrabold mb-2">고정 일정을 설정하세요</h1>
                            <p className="text-gray-500">
                                수면, 식사, 고정 근무 시간 등을 드래그하여 만들어주세요. <br />
                                기존 Google 캘린더 일정과 자동으로 동기화되어 중복을 피합니다.
                            </p>
                        </div>

                        <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative min-h-[400px]">
                            <FullCalendar
                                plugins={[timeGridPlugin, interactionPlugin]}
                                initialView="timeGridWeek"
                                headerToolbar={false}
                                allDaySlot={false}
                                slotMinTime="00:00:00"
                                slotMaxTime="24:00:00"
                                height="100%"
                                editable={true}
                                selectable={true}
                                selectMirror={true}
                                dayHeaders={true}
                                nowIndicator={true}
                                events={events}
                                select={(info) => {
                                    const title = prompt('일정 이름을 입력하세요 (예: 식사, 운동 등)')
                                    if (title) {
                                        const newEvent = {
                                            id: crypto.randomUUID(),
                                            title,
                                            start: info.startStr,
                                            end: info.endStr,
                                            allDay: info.allDay,
                                            color: '#94a3b8'
                                        }
                                        setEvents([...events, newEvent])
                                    }
                                    info.view.calendar.unselect()
                                }}
                                eventDrop={(info) => {
                                    const updatedEvents = events.map(ev =>
                                        ev.id === info.event.id || (ev.title === info.event.title && ev.startTime === info.event.extendedProps.startTime)
                                            ? { ...ev, start: info.event.startStr, end: info.event.endStr }
                                            : ev
                                    )
                                    setEvents(updatedEvents)
                                }}
                                eventResize={(info) => {
                                    const updatedEvents = events.map(ev =>
                                        ev.id === info.event.id
                                            ? { ...ev, start: info.event.startStr, end: info.event.endStr }
                                            : ev
                                    )
                                    setEvents(updatedEvents)
                                }}
                                eventClick={(info) => {
                                    if (confirm(`'${info.event.title}' 일정을 삭제하시겠습니까?`)) {
                                        info.event.remove()
                                        setEvents(events.filter(ev => ev.id !== info.event.id))
                                    }
                                }}
                            />
                        </div>

                        <div className="flex justify-between mt-8">
                            <button onClick={prevStep} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 px-6 py-4 font-semibold transition-colors">
                                <ArrowLeft className="w-5 h-5" /> 이전
                            </button>
                            <button onClick={nextStep} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg">
                                스케줄 확정 <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Complete */}
                {step === 3 && (
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl flex-1 flex flex-col justify-center items-center text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                        <h1 className="text-4xl font-extrabold mb-4">준비 완료!</h1>
                        <p className="text-gray-500 mb-10 max-w-md">
                            Google Calendar와 동기화가 완료되었습니다.<br />
                            이제 할 일만 입력하면 AI가 남는 시간에 자동으로 스케줄링해 줍니다.
                        </p>
                        <button
                            onClick={handleFinish}
                            disabled={loading}
                            className="bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            내 캘린더 이동하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function RoleCard({ icon, title, desc, selected, onClick }: { icon: React.ReactNode, title: string, desc: string, selected: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 ${selected
                ? 'border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-600/10'
                : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
        >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
        </div>
    )
}
