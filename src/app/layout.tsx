import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { clsx } from 'clsx'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'TimeJudge - AI 자동 스케줄링',
  description: 'AI가 당신의 빈 시간에 할 일을 가장 효율적으로 배치해 줍니다.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={clsx(inter.variable, 'font-sans antialiased text-slate-200 bg-slate-950 min-h-screen')}>
        <div className="mesh-bg" />
        <div className="relative z-10 w-full min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
