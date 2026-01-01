import Link from "next/link";

export default function Home() {
	return (
		<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
			<div className="bg-slate-900 border border-slate-800 rounded-lg p-8 w-full max-w-md flex flex-col gap-4 text-center">
				<h1 className="text-2xl font-semibold">Conductor</h1>
				<p className="text-slate-300">게임 서버 관리 콘솔</p>
				<div className="flex gap-3 justify-center">
					<Link className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded" href="/login">로그인</Link>
					<Link className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded" href="/register">회원가입</Link>
				</div>
			</div>
		</div>
	);
}
