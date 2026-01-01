"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import api from "../../lib/axios";
import { useAuth } from "../../contexts/AuthContext";

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
    };

    if (!token) return <div className="p-6">로그인 필요</div>;

    return (
        <div className="text-white">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">대시보드</h1>
                <form onSubmit={createAgent} className="flex gap-2">
                    <input className="px-3 py-2 rounded bg-slate-900 border border-slate-800" placeholder="서버 이름" value={name} onChange={(e) => setName(e.target.value)} />
                    <button className="bg-blue-600 hover:bg-blue-500 px-4 rounded" type="submit">서버 생성</button>
                </form>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {agents.map((a) => (
                    <Link key={a.id} href={`/server/${a.id}`} className="block bg-slate-900 border border-slate-800 rounded p-4 hover:border-blue-500">
                        <div className="text-lg font-medium">{a.name || a.id}</div>
                        <div className="text-sm text-slate-400">상태: {a.status || a.server_status}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
