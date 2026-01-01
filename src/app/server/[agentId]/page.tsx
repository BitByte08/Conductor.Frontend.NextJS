"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/axios";
import { useAgentSocket } from "../../../hooks/useAgentSocket";

export default function ServerDetailPage() {
    const { agentId } = useParams<{ agentId: string }>();
    const { agentStatus, wsStatus, serverStatus, metadata, ramUsage, ramTotal, cpuUsage } = useAgentSocket(agentId);
    const [initialStatus, setInitialStatus] = useState<string>("UNKNOWN");
    const [initialMetadata, setInitialMetadata] = useState<string>("Unknown");
    const [actionMsg, setActionMsg] = useState<string>("");

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const { data } = await api.get<Array<{ id: string; server_status?: string; status?: string; metadata?: string }>>("/api/agents");
                const found = (data || []).find((a) => a.id === agentId);
                if (found) {
                    setInitialStatus(found.server_status || found.status || "UNKNOWN");
                    setInitialMetadata(found.metadata || "Unknown");
                }
            } catch {
                // ignore
            }
        };
        fetchInfo();
    }, [agentId]);

    const displayStatus = serverStatus && serverStatus !== "UNKNOWN" ? serverStatus : initialStatus;
    const displayMetadata = metadata || initialMetadata;
    const notInstalled = !displayMetadata || displayMetadata.toLowerCase().includes("unknown");
    const agentOnline = agentStatus === "ONLINE";

    const ramUsageGb = useMemo(() => ((ramUsage || 0) / (1024 * 1024 * 1024)).toFixed(2), [ramUsage]);
    const ramTotalGb = useMemo(() => ((ramTotal || 0) / (1024 * 1024 * 1024)).toFixed(2), [ramTotal]);
    const ramTotalMb = useMemo(() => Math.max(0, Math.round((ramTotal || 0) / 1024)), [ramTotal]);
    const ramPercent = useMemo(() => {
        if (!ramTotal) return 0;
        const pct = Math.round((ramUsage / ramTotal) * 100);
        return Math.min(100, Math.max(0, pct));
    }, [ramUsage, ramTotal]);

    const doAction = async (action: "start" | "stop") => {
        if (!agentOnline) {
            setActionMsg("에이전트가 오프라인입니다.");
            return;
        }
        await api.post(`/api/agent/${agentId}/${action}`);
        setActionMsg(action === "start" ? "서버 시작 명령을 보냈습니다." : "서버 정지 명령을 보냈습니다.");
    };

    return (
        <div className="text-white">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">서버 상세: {agentId}</h1>
                    <button onClick={() => window.history.back()} className="text-sm text-slate-400 hover:text-white">뒤로가기</button>
                </div>
                <div className="flex gap-3 text-sm text-blue-300">
                    <Link className={!agentOnline ? "pointer-events-none opacity-50" : ""} href={`/server/${agentId}/console`}>콘솔</Link>
                    <Link className={!agentOnline ? "pointer-events-none opacity-50" : ""} href={`/server/${agentId}/mods`}>모드/플러그인</Link>
                    <Link className={!agentOnline ? "pointer-events-none opacity-50" : ""} href={`/server/${agentId}/settings`}>설정</Link>
                    <Link className={!agentOnline ? "pointer-events-none opacity-50" : ""} href={`/server/${agentId}/install`}>설치</Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="bg-slate-900 border border-slate-800 rounded p-4">
                    <div className="text-slate-400 text-sm">에이전트 연결</div>
                    <div className="text-lg font-semibold">{agentStatus} / {wsStatus}</div>
                    {!agentOnline && <div className="text-xs text-amber-400 mt-2">에이전트가 연결되어야 콘솔/설정/설치 등이 가능합니다.</div>}
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded p-4">
                    <div className="text-slate-400 text-sm">서버 상태</div>
                    <div className="text-lg font-semibold">{displayStatus}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded p-4">
                    <div className="text-slate-400 text-sm">메타데이터</div>
                    <div className="text-sm text-slate-200 break-words">{displayMetadata}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded p-4">
                    <div className="text-slate-400 text-sm">RAM 사용량</div>
                    {ramTotalMb === 0 ? (
                        <div className="text-sm text-slate-500">대기중 (하트비트 수신 필요)</div>
                    ) : (
                        <div className="mt-2">
                            <div className="text-sm">{ramUsageGb} GB / {ramTotalGb} GB ({ramPercent}%)</div>
                            <div className="w-full h-2 bg-slate-800 rounded mt-1 overflow-hidden">
                                <div className="h-2 bg-blue-500" style={{ width: `${ramPercent}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4 mt-4">
                <div className="bg-slate-900 border border-slate-800 rounded p-4">
                    <div className="text-slate-400 text-sm">CPU 사용량</div>
                    <div className="mt-2">
                        <div className="text-sm">{cpuUsage ? cpuUsage.toFixed(1) : 0}%</div>
                        <div className="w-full h-2 bg-slate-800 rounded mt-1 overflow-hidden">
                            <div className="h-2 bg-amber-500" style={{ width: `${Math.min(100, Math.max(0, Math.round(cpuUsage || 0)))}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-slate-400 text-sm">서버 제어</div>
                            <div className="text-lg font-semibold">현재: {displayStatus}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => doAction("start")} disabled={!agentOnline} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm disabled:opacity-60">시작</button>
                            <button onClick={() => doAction("stop")} disabled={!agentOnline} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm disabled:opacity-60">정지</button>
                        </div>
                    </div>
                    <div className="text-sm text-slate-400">콘솔 탭에서 로그를 확인할 수 있습니다. 세부 설정은 설정 탭에서 관리하세요.</div>
                </div>
            </div>

            {notInstalled && (
                <div className="bg-amber-900/30 border border-amber-700 rounded p-6 mt-4 text-center space-y-4">
                    <div>
                        <div className="text-2xl font-semibold text-amber-300 mb-2">⚠️ 서버 설치 필요</div>
                        <div className="text-sm text-amber-100">이 서버에 게임 서버가 설치되지 않았습니다.</div>
                    </div>
                    {!agentOnline && (
                        <div className="text-sm text-red-300 bg-red-900/40 border border-red-700 rounded p-2">
                            먼저 에이전트가 온라인 상태여야 설치를 진행할 수 있습니다.
                        </div>
                    )}
                    <div className="text-sm text-slate-300">
                        위의 <Link className="text-blue-300 hover:text-blue-200 underline" href={`/server/${agentId}/install`}>설치</Link> 탭에서 서버 유형(Vanilla/Paper/Fabric)과 버전을 선택해 설치를 진행하세요.
                    </div>
                </div>
            )}

            {actionMsg && <div className="mt-3 text-sm text-emerald-400">{actionMsg}</div>}
        </div>
    );
}
