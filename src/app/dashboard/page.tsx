"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../../lib/axios";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

type Agent = {
    id: string;
    name?: string;
    status?: string;
    server_status?: string;
};

export default function DashboardPage() {
    const { token } = useAuth();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [name, setName] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!token) return;
        api.get<Agent[]>("/api/agents").then((res) => setAgents(res.data || [])).catch(() => {});
    }, [token]);

    const createAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const { data } = await api.post("/api/agents/create", { name: name.trim() });
        setAgents((prev) => [...prev, data]);
        setName("");
        setShowCreate(false);
    };

    if (!token) return <div className="p-6">로그인 필요</div>;

    return (
        <div className="text-white">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">대시보드</h1>
                    <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white">뒤로가기</button>
                </div>
                <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded">서버 생성</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {agents.map((a) => (
                    <Link key={a.id} href={`/server/${a.id}`} className="block bg-slate-900 border border-slate-800 rounded p-4 hover:border-blue-500">
                        <div className="text-lg font-medium">{a.name || a.id}</div>
                        <div className="text-sm text-slate-400">상태: {a.status || a.server_status}</div>
                    </Link>
                ))}
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">새 서버 만들기</h2>
                            <button onClick={() => setShowCreate(false)} className="text-sm text-slate-400 hover:text-white">닫기</button>
                        </div>
                        <form onSubmit={createAgent} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-400">서버 이름</label>
                                <input className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700" placeholder="예: 내 서버" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="text-xs text-slate-500">생성 후 서버 상세 페이지에서 유형/버전을 선택해 설치하세요.</div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded bg-slate-800">취소</button>
                                <button type="submit" className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">생성</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
