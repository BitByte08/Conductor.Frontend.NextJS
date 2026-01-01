"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import api from "../../../../lib/axios";
import { Download, Loader2, RefreshCw, Trash2, Power } from "lucide-react";
import { useAgentSocket, ModEntry } from "../../../../hooks/useAgentSocket";

type ModSearchHit = {
    project_id?: string;
    projectId?: string;
    id?: string;
    slug?: string;
    title?: string;
    description?: string;
    latest_version?: string;
    latestVersion?: string;
    versions?: string[];
};

export default function ModsPage() {
    const { agentId } = useParams<{ agentId: string }>();
    const [query, setQuery] = useState("");
    const [mods, setMods] = useState<ModSearchHit[]>([]);
    const [searching, setSearching] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [error, setError] = useState<string>("");
    const { mods: installedMods, metadata } = useAgentSocket(agentId);
    const [updating, setUpdating] = useState<string | null>(null);

    const serverType = useMemo(() => {
        const meta = (metadata || "").toLowerCase();
        if (meta.includes("fabric")) return "fabric";
        if (meta.includes("paper")) return "paper";
        return "vanilla";
    }, [metadata]);

    const mcVersion = useMemo(() => {
        const match = (metadata || "").match(/\d+\.\d+(?:\.\d+)?/);
        return match ? match[0] : "";
    }, [metadata]);

    const label = serverType === "paper" ? "플러그인" : "모드";
    const fetchInstalled = useCallback(async () => {
        try {
            await api.get(`/api/agent/${agentId}/mods/list`);
        } catch (error: unknown) {
            let msg = "모드 목록을 요청하지 못했습니다";
            if (typeof error === "object" && error !== null && "response" in error) {
                const resp = (error as { response?: { data?: { detail?: string } } }).response;
                msg = resp?.data?.detail || msg;
            } else if (error instanceof Error) {
                msg = error.message;
            }
            setError(msg);
        }
    }, [agentId]);

    const toggleMod = async (entry: ModEntry, nextEnabled: boolean) => {
        setUpdating(entry.name);
        setError("");
        try {
            await api.post(`/api/agent/${agentId}/mods/toggle`, { filename: entry.name, enabled: nextEnabled });
            await fetchInstalled();
        } catch (error: unknown) {
            setError("토글 실패");
        } finally {
            setUpdating(null);
        }
    };

    const deleteMod = async (entry: ModEntry) => {
        if (!confirm(`${entry.name}을(를) 삭제할까요?`)) return;
        setUpdating(entry.name);
        setError("");
        try {
            await api.post(`/api/agent/${agentId}/mods/delete`, { filename: entry.name });
            await fetchInstalled();
        } catch (error: unknown) {
            setError("삭제 실패");
        } finally {
            setUpdating(null);
        }
    };

    const searchMods = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        setError("");
        try {
            const { data } = await api.get<ModSearchHit[]>(`/api/mods/search?query=${encodeURIComponent(query)}`);
            setMods(data || []);
        } finally {
            setSearching(false);
        }
    };

    const resolveModrinthDownload = async (mod: ModSearchHit, targetLoader: string, targetMcVersion: string) => {
        const projectId = mod.project_id || mod.projectId || mod.id || mod.slug;
        if (!projectId) throw new Error("프로젝트 ID를 찾을 수 없습니다");

        const loaderCandidates = targetLoader === "fabric"
            ? ["fabric"]
            : targetLoader === "paper"
            ? ["paper", "bukkit", "spigot"]
            : [];

        const versionIds: string[] = [];
        if (mod.latest_version) versionIds.push(mod.latest_version);
        if (mod.latestVersion) versionIds.push(mod.latestVersion);
        if (mod.versions && mod.versions.length > 0) versionIds.push(...mod.versions);

        if (versionIds.length === 0) {
            const projectResp = await fetch(`https://api.modrinth.com/v2/project/${projectId}`);
            if (!projectResp.ok) throw new Error("프로젝트 정보를 불러오지 못했습니다");
            const projectData = await projectResp.json() as unknown;
            if (typeof projectData === "object" && projectData !== null && "versions" in projectData) {
                const pd = projectData as { versions?: string[] };
                if (pd.versions && pd.versions.length > 0) {
                    versionIds.push(...pd.versions);
                }
            }
        }

        if (versionIds.length === 0) throw new Error("버전 정보를 찾을 수 없습니다");

        const seen = new Set<string>();
        const orderedIds = versionIds.filter((v) => {
            if (seen.has(v)) return false;
            seen.add(v);
            return true;
        });

        const fetchVersionData = async (versionId: string) => {
            const versionResp = await fetch(`https://api.modrinth.com/v2/version/${versionId}`);
            if (!versionResp.ok) throw new Error("버전 정보를 불러오지 못했습니다");
            return versionResp.json() as unknown;
        };

        const versionMatches = (data: any) => {
            const loaders = Array.isArray(data?.loaders) ? data.loaders : [];
            const games = Array.isArray(data?.game_versions) ? data.game_versions : [];
            const loaderOk = loaderCandidates.length === 0 || loaders.some((l: string) => loaderCandidates.includes(l));
            const versionOk = !targetMcVersion || games.includes(targetMcVersion);
            return loaderOk && versionOk;
        };

        let chosen: { files?: Array<{ primary?: boolean; url?: string; filename?: string }> } | null = null;
        for (const vid of orderedIds) {
            const data = await fetchVersionData(vid);
            if (versionMatches(data)) {
                chosen = data as { files?: Array<{ primary?: boolean; url?: string; filename?: string }> };
                break;
            }
            if (!chosen) {
                chosen = data as { files?: Array<{ primary?: boolean; url?: string; filename?: string }> };
            }
        }

        const files = (chosen?.files || []) as Array<{ primary?: boolean; url?: string; filename?: string }>;
        const primary = files.find((f) => f?.primary) || files[0];
        if (!primary || !primary.url || !primary.filename) throw new Error("다운로드 파일이 없습니다");
        return { url: primary.url, filename: primary.filename };
    };

    const installMod = async (mod: ModSearchHit) => {
        setInstalling(mod.project_id || mod.slug || mod.title || "unknown");
        setError("");
        try {
            const { url, filename } = await resolveModrinthDownload(mod, serverType, mcVersion);
            await api.post(`/api/agent/${agentId}/mods`, { url, filename });
            alert("설치 요청 완료. 서버를 재시작하세요.");
        } catch (error: unknown) {
            let msg = "설치 실패";
            if (typeof error === "object" && error !== null && "response" in error) {
                const resp = (error as { response?: { data?: { detail?: string } } }).response;
                msg = resp?.data?.detail || msg;
            } else if (error instanceof Error) {
                msg = error.message;
            }
            setError(msg);
            alert("설치 실패: " + msg);
        } finally {
            setInstalling(null);
        }
    };

    useEffect(() => {
        fetchInstalled();
    }, [fetchInstalled]);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold">{label} 설치 ({agentId})</h1>
                    <div className="text-sm text-slate-400">서버 유형: {serverType}</div>
                </div>
                <button onClick={() => window.history.back()} className="text-sm text-slate-400 hover:text-white">뒤로가기</button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                <span className="font-semibold">적용된 {label}</span>
                <button onClick={fetchInstalled} className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-xs">
                    <RefreshCw size={14}/>새로고침
                </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-2">
                {installedMods.length === 0 ? (
                    <div className="text-sm text-slate-500">{label} 없음 또는 에이전트 미연결</div>
                ) : (
                    installedMods.map((m) => (
                        <div key={m.name} className="flex items-center justify-between text-sm bg-slate-800/60 px-3 py-2 rounded border border-slate-700">
                            <div>
                                <div className="font-medium">{m.name}</div>
                                <div className="text-xs text-slate-400">{m.enabled ? "활성" : "비활성 (.disabled)"}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleMod(m, !m.enabled)}
                                    disabled={updating === m.name}
                                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 ${m.enabled ? "bg-amber-600" : "bg-emerald-600"} disabled:opacity-60`}
                                >
                                    <Power size={14} />{m.enabled ? "비활성" : "활성"}
                                </button>
                                <button
                                    onClick={() => deleteMod(m)}
                                    disabled={updating === m.name}
                                    className="px-3 py-1 rounded text-xs bg-red-600 hover:bg-red-500 disabled:opacity-60 flex items-center gap-1"
                                >
                                    <Trash2 size={14}/>삭제
                                </button>
                            </div>
                        </div>
                    ))
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
                    <div key={m.project_id || m.slug || m.id} className="bg-slate-900 border border-slate-800 rounded p-3">
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
