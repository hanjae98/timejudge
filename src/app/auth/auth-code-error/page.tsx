export default function AuthCodeError() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">인증 오류 발생</h1>
                <p className="text-gray-600 mb-8">
                    로그인 과정에서 문제가 발생했습니다. <br />
                    세션이 만료되었거나 잘못된 접근일 수 있습니다.
                </p>
                <a
                    href="/login"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                >
                    로그인 페이지로 돌아가기
                </a>
            </div>
        </div>
    )
}
