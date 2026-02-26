export default function SettingsPage() {
    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-extrabold mb-8">설정</h1>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <p className="text-gray-500">설정 기능은 현재 준비 중입니다. 곧 더 멋진 기능으로 찾아뵐게요! 😊</p>
                <div className="mt-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <span className="font-semibold text-gray-700">API 사용 한도 보너스</span>
                        <span className="text-blue-600 font-bold">1,000 / 1,000 회</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
