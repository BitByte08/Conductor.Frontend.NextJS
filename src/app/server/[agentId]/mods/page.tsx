"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "../../../../lib/axios";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useAgentSocket } from "../../../../hooks/useAgentSocket";

export default function ModsPage() {
    const { agentId } = useParams<{ agentId: string }>();
    const [query, setQuery] = useState("");
    const [mods, setMods] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [error, setError] = useState<string>("");
    const { mods: installedMods } = useAgentSocket(agentId);
    const fetchInstalled = async () => {
        try {
            await api.get(`/api/agent/${agentId}/mods/list`);
        } catch (e: any) {
            const msg = e?.response?.data?.detail || e.message;
            setError(msg || "모드 목록을 요청하지 못했습니다");
        }
    };

    const searchMods = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        setError("");
        try {
            const { data } = await api.get(`/api/mods/search?query=${encodeURIComponent(query)}`);
            setMods(data || []);
        } finally {
            setSearching(false);
        }
    };

    const resolveModrinthDownload = async (mod: any) => {
        const projectId = mod.project_id || mod.projectId || mod.id || mod.slug;
        if (!projectId) throw new Error("프로젝트 ID를 찾을 수 없습니다");

        // Step 1: pick version id
        let versionId = mod.latest_version || mod.latestVersion;
        if (!versionId && mod.versions && mod.versions.length > 0) {
            versionId = mod.versions[0];
        }
        if (!versionId) {
            const projectResp = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
            if (!projectResp.ok) throw new Error("프로젝트 정보를 불러오지 못했습니다");
            const projectData = await projectResp.json();
            versionId = projectData.latest_version || (projectData.versions && projectData.versions[0]);
        }
        if (!versionId) throw new Error("버전 정보를 찾을 수 없습니다");

        // Step 2: get version files
        const versionResp = await fetch(`https://api.modrinth.com/v2/version/${versionId}`);
        if (!versionResp.ok) throw new Error("버전 정보를 불러오지 못했습니다");
        const versionData = await versionResp.json();
        const files = versionData.files || [];
        const primary = files.find((f: any) => f.primary) || files[0];
        if (!primary) throw new Error("다운로드 파일이 없습니다");
        return { url: primary.url, filename: primary.filename };
    };

    const installMod = async (mod: any) => {
        setInstalling(mod.project_id || mod.slug || mod.title);
        setError("");
        try {
            const { url, filename } = await resolveModrinthDownload(mod);
            await api.post(`/api/agent/${agentId}/mods`, { url, filename });
            alert("설치 요청 완료. 서버를 재시작하세요.");
        } catch (e: any) {
            const msg = e?.response?.data?.detail || e.message || "설치 실패";
            setError(msg);
            alert("설치 실패: " + msg);
        } finally {
            setInstalling(null);
        }
    };

    useEffect(() => {
        fetchInstalled();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col gap-4">
            <h1 className="text-xl font-semibold">모드 설치 ({agentId})</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="font-semibold">적용된 모드</span>
                <button onClick={fetchInstalled} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs">
                    <RefreshCw size={14}/>새로고침
                </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded p-3">
                {installedMods.length === 0 ? (
                    <div className="text-sm text-slate-500">모드 없음 또는 에이전트 미연결</div>
                ) : (
                    <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
                        {installedMods.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                )}
            </div>
            <form onSubmit={searchMods} className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-800" placeholder="Modrinth 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
                <button className="bg-blue-600 hover:bg-blue-500 px-4 rounded" type="submit">검색</button>
            </form>

            {searching && <div className="text-slate-400">검색 중...</div>}
            {error && <div className="text-red-400 text-sm">{error}</div>}

            <div className="grid gap-3 md:grid-cols-2">
                {mods.map((m) => (
                    <div key={m.project_id || m.slug} className="bg-slate-900 border border-slate-800 rounded p-3">
                        <div className="font-semibold">{m.title || m.slug}</div>
                        <div className="text-sm text-slate-400">{m.description}</div>
                        <button
                            onClick={() => installMod(m)}
                            className="mt-2 bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded text-sm flex items-center gap-2"
                            disabled={installing === (m.project_id || m.slug)}
                        >
                            {installing === (m.project_id || m.slug) ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}설치
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
