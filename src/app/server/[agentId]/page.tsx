"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../../lib/axios";
import { useAgentSocket } from "../../../hooks/useAgentSocket";

export default function ServerDetailPage() {
    const { agentId } = useParams<{ agentId: string }>();
    const { agentStatus, wsStatus, serverStatus, metadata, ramUsage, ramTotal, cpuUsage, configRam, properties } = useAgentSocket(agentId);
    const [initialStatus, setInitialStatus] = useState<string>("UNKNOWN");
    const [initialMetadata, setInitialMetadata] = useState<string>("Unknown");
    const [ramInput, setRamInput] = useState<string>("");
    const [savingRam, setSavingRam] = useState(false);
    const [propertiesState, setPropertiesState] = useState<Record<string, string>>({});
    const [propsLoading, setPropsLoading] = useState(false);
    const [propsSaving, setPropsSaving] = useState(false);
    const [actionMsg, setActionMsg] = useState<string>("");

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const { data } = await api.get("/api/agents");
                const found = (data || []).find((a: any) => a.id === agentId);
                if (found) {
                    setInitialStatus(found.server_status || found.status || "UNKNOWN");
                    setInitialMetadata(found.metadata || "Unknown");
                }
            } catch (e) {
                // ignore
            }
        };
        fetchInfo();
    }, [agentId]);

    useEffect(() => {
        if (configRam) setRamInput(configRam);
    }, [configRam]);

    useEffect(() => {
        setPropertiesState(properties || {});
    }, [properties]);

    const displayStatus = serverStatus && serverStatus !== "UNKNOWN" ? serverStatus : initialStatus;
    const displayMetadata = metadata || initialMetadata;

    const ramUsageGb = useMemo(() => ((ramUsage || 0) / (1024 * 1024 * 1024)).toFixed(2), [ramUsage]);
    const ramTotalGb = useMemo(() => ((ramTotal || 0) / (1024 * 1024 * 1024)).toFixed(2), [ramTotal]);
    const ramTotalMb = useMemo(() => Math.max(0, Math.round((ramTotal || 0) / 1024)), [ramTotal]);
    const ramPercent = useMemo(() => {
        if (!ramTotal) return 0;
        const pct = Math.round((ramUsage / ramTotal) * 100);
        return Math.min(100, Math.max(0, pct));
    }, [ramUsage, ramTotal]);

    const refreshProperties = useCallback(async () => {
        setPropsLoading(true);
        try {
            await api.post(`/api/agent/${agentId}/properties/fetch`);
            setActionMsg("server.properties 읽기를 요청했습니다 (에이전트 연결 필요)");
        } finally {
            setPropsLoading(false);
        }
    }, [agentId]);

    const doAction = async (action: "start" | "stop") => {
        await api.post(`/api/agent/${agentId}/${action}`);
        setActionMsg(action === "start" ? "서버 시작 명령을 보냈습니다." : "서버 정지 명령을 보냈습니다.");
    };

    const saveRam = async () => {
        if (!ramInput.trim()) return;
        setSavingRam(true);
        try {
            await api.post(`/api/agent/${agentId}/config`, { ram_mb: ramInput.trim() });
            setActionMsg("RAM 설정을 적용했습니다.");
        } finally {
            setSavingRam(false);
        }
    };

    const saveProperties = async () => {
        setPropsSaving(true);
        try {
            await api.post(`/api/agent/${agentId}/properties/update`, propertiesState);
            setActionMsg("server.properties를 저장했습니다.");
        } finally {
            setPropsSaving(false);
        }
    };

    const propertyKeys = Object.keys(propertiesState || {}).sort();

    const updateProperty = (key: string, value: string) => {
        setPropertiesState((prev) => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        // 최초 진입 시 프로퍼티 읽기 요청
        refreshProperties();
    }, [refreshProperties]);

    return (
        <div className="text-white">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h1 className="text-2xl font-semibold">서버 상세: {agentId}</h1>
                <div className="flex gap-3 text-sm text-blue-300">
                    <Link href={`/server/${agentId}/console`}>콘솔</Link>
                    <Link href={`/server/${agentId}/mods`}>모드</Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="bg-slate-900 border border-slate-800 rounded p-4">
                    <div className="text-slate-400 text-sm">에이전트 연결</div>
                    <div className="text-lg font-semibold">{agentStatus} / {wsStatus}</div>
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
                            <button onClick={() => doAction("start")} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm">시작</button>
                            <button onClick={() => doAction("stop")} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm">정지</button>
                        </div>
                    </div>
                    <div className="text-sm text-slate-400">콘솔 탭에서 로그를 확인할 수 있습니다.</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-slate-400 text-sm">RAM 설정</div>
                            <div className="text-lg font-semibold">{configRam || "-"}</div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm"
                                value={ramInput}
                                onChange={(e) => setRamInput(e.target.value)}
                                placeholder="예: 4G or 4096M"
                            />
                            <button onClick={saveRam} disabled={savingRam} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-sm disabled:opacity-60">적용</button>
                        </div>
                    </div>
                    <div className="text-sm text-slate-400">/api/agent/{agentId}/config 로 ram_mb 값을 보냅니다.</div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded p-4 mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                        <div className="text-slate-400 text-sm">server.properties</div>
                        <div className="text-lg font-semibold">{propertyKeys.length} 항목</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={refreshProperties} disabled={propsLoading} className="bg-slate-800 px-3 py-2 rounded text-sm disabled:opacity-60">새로고침</button>
                        <button onClick={saveProperties} disabled={propsSaving} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded text-sm disabled:opacity-60">저장</button>
                    </div>
                </div>
                {propertyKeys.length === 0 ? (
                    <div className="text-sm text-slate-500">프로퍼티가 없습니다. 에이전트가 연결된 상태에서 새로고침을 누르세요.</div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {propertyKeys.map((k) => (
                            <div key={k} className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400">{k}</label>
                                <input
                                    className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm"
                                    value={propertiesState[k] ?? ""}
                                    onChange={(e) => updateProperty(k, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                )}
                <div className="text-xs text-slate-500 mt-3">읽기 요청은 WebSocket으로 PROPERTIES 응답을 받습니다.</div>
            </div>

            {actionMsg && <div className="mt-3 text-sm text-emerald-400">{actionMsg}</div>}
        </div>
    );
}
