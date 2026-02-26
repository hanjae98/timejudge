'use client'

import { createClient } from '@/lib/supabase/client'
import { LogIn } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)

    const handleGoogleLogin = async () => {
        const supabase = createClient()
        setLoading(true)
        const origin = window.location.origin
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${origin}/auth/callback?next=/onboarding`,
                scopes: 'https://www.googleapis.com/auth/calendar',
            },
        })

        if (error) {
            console.error(error)
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-md">
                    <LogIn className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold mb-2 text-center">TimeJudge</h1>
                <p className="text-gray-500 mb-8 text-center text-sm">
                    AI 기반 지능형 시간 추정 및 자동 스케줄링 서비스
                </p>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    {loading ? '로그인 중...' : 'Google 계정으로 계속하기'}
                </button>

                <p className="mt-6 text-xs text-gray-400 text-center">
                    구글 계정으로 로그인하면 Google Calendar와 자동으로 연동됩니다.
                </p>
            </div>
        </div>
    )
}
