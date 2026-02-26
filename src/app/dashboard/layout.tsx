'use client'

import { Calendar, CheckCircle2, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white border-r border-gray-100 flex flex-col hidden md:flex">
                <div className="p-6 flex items-center gap-3 border-b border-gray-50">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-extrabold tracking-tight">TimeJudge</span>
                </div>

                <div className="flex-1 py-6 flex flex-col gap-2 px-4">
                    <NavItem href="/dashboard" icon={<Calendar className="w-5 h-5" />} label="내 스케줄" active={pathname === '/dashboard'} />
                    <NavItem href="/dashboard/tasks" icon={<CheckCircle2 className="w-5 h-5" />} label="할 일 목록" active={pathname === '/dashboard/tasks'} />
                </div>

                <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
                    <NavItem href="/dashboard/settings" icon={<Settings className="w-5 h-5" />} label="설정" active={pathname === '/dashboard/settings'} />
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors mt-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex flex-shrink-0 flex-col items-center justify-center overflow-hidden">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 truncate">
                            <span className="text-sm font-semibold truncate block">내 프로필</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100">
                    <span className="text-xl font-bold">TimeJudge</span>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                    </div>
                </header>

                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${active
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
            {label}
        </Link>
    )
}
